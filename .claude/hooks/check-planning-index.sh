#!/usr/bin/env bash
# check-planning-index.sh — Hook SessionStart: detector de iniciativas que
# EXISTEM EM DISCO mas NÃO ESTÃO NO ÍNDICE (backstop da ENTRADA do .planning/).
#
# Par do check-pending-archival.sh, que cobre a saída. A assimetria motivou este
# hook (TECH-574): havia backstop para initiative concluída e não arquivada, e
# nenhum para initiative criada e não indexada.
#
# Por que existe: `init-detour` e `init-milestone` registram no índice por
# construção. Quem monta o diretório à mão pula o registro, e nada detectava —
# foi assim que a `registro-de-horizontes` (TECH-531) ficou fora do índice até
# ser notada por acaso.
#
# Trigger: SessionStart (stdout é injetado como contexto da sessão).
# Comportamento: NUNCA bloqueia (exit 0 sempre; G-HOOK-NO-NOISE). Silencioso
# quando tudo está indexado — só fala quando há algo acionável.
#
# Algoritmo (G-DETERMINISM — puro: mesmo estado do .planning/ → mesma saída):
#   1. Lista os diretórios de primeiro nível sob milestones/, detours/ e
#      initiatives/.
#   2. Lê do .planning/README.md o que REGISTRA uma iniciativa: a referência
#      qualificada `<tipo>/<nome>` em linha de registro — linha de tabela
#      (qualquer célula: Desvios, Mapeamento, o registry que a `init-detour` e a
#      `init-milestone` gravam) ou linha que COMEÇA pela referência (Índice de
#      Iniciativas, com ou sem marcador de lista) — ou o nome como célula INTEIRA
#      de linha de tabela (a 1ª célula da `init-detour`; vale também com o caminho
#      desatualizado, como um `(arquivado)` cujo diretório segue em disco).
#   3. Diretório sem registro → pendência. Nome citado em prosa, dentro de outra
#      palavra, ou como exemplo na "Convenção de Nomenclatura" NÃO indexa: o
#      `grep -F` do nome no arquivo inteiro dava por indexado `detours/monday`
#      porque `monday.com` aparece no README, e `detours/user-auth` porque
#      `user-auth` é o exemplo da convenção (TECH-851).
#   4. Sobrou algo → aviso nomeando os diretórios e a skill. exit 0.
#
# Opt-out (G-CANONICAL): linha `<!-- no-index: <motivo> -->` no CONTEXT.md, em
# LINHA PRÓPRIA — o mesmo critério do `keep-active` do check-pending-archival.sh.
# Menção em prosa no meio da linha não é opt-out.

set -euo pipefail

PLANNING_DIR=".planning"
README="$PLANNING_DIR/README.md"
TIPOS='milestones|detours|initiatives'
# Opt-out só vale em LINHA PRÓPRIA (`<!-- no-index: ... -->`), como o keep-active.
NO_INDEX_MATCH='^[[:space:]]*<!--[[:space:]]*no-index:'
# Linha de registro: linha de tabela, ou linha que começa pela referência (depois
# de marcador de lista, ênfase, crase e do prefixo `.planning/`).
LINHA_REGISTRO='^[[:space:]]*(\||(([-*+]|[0-9]+[.)])[[:space:]]+)?[`*_]*(\./)?(\.planning/)?('"$TIPOS"')/)'
# Referência qualificada `<tipo>/<nome>`: não pode vir colada em letra, dígito ou
# hífen (`x-detours/y` não é `detours/y`); o nome vai até o primeiro caractere
# fora de `[[:alnum:]._-]`, então `foo-bar` não é `foo`.
REFERENCIA='(^|[^[:alnum:]-])('"$TIPOS"')/[[:alnum:]._-]+'

[ -f "$README" ] || exit 0

# Uma entrada por linha; o `case` compara a entrada inteira, não por substring.
contem() {  # <lista> <entrada>
  case "
$1
" in *"
$2
"*) return 0 ;; esac
  return 1
}

# Uma referência `<tipo>/<nome>` por linha; o ponto final de frase sai do nome.
referencias=$({ grep -E "$LINHA_REGISTRO" "$README" || true; } \
  | { grep -oE "$REFERENCIA" || true; } \
  | sed -E 's/^[^mdi]*//; s/\.+$//')
# Uma célula de linha de tabela por linha, sem espaço, crase nem ênfase nas bordas.
celulas=$({ grep -E '^[[:space:]]*\|' "$README" || true; } \
  | tr '|' '\n' | sed -E 's/^[[:space:]`*_]+//; s/[[:space:]`*_]+$//')

pendentes=()
for tipo in milestones detours initiatives; do
  [ -d "$PLANNING_DIR/$tipo" ] || continue
  for dir in "$PLANNING_DIR/$tipo"/*/; do
    [ -d "$dir" ] || continue
    nome=$(basename "$dir")
    # opt-out declarado no contexto da própria iniciativa
    if [ -f "$dir/CONTEXT.md" ] && grep -qE "$NO_INDEX_MATCH" "$dir/CONTEXT.md" 2>/dev/null; then
      continue
    fi
    if ! contem "$referencias" "$tipo/$nome" && ! contem "$celulas" "$nome"; then
      pendentes+=("$tipo/$nome")
    fi
  done
done

[ ${#pendentes[@]} -eq 0 ] && exit 0

echo "⚠️  Iniciativas em disco e ausentes do índice de \`$README\`:"
for p in "${pendentes[@]}"; do
  echo "   • $p"
done
echo ""
echo "   O índice é como uma sessão nova encontra a iniciativa — sem ele, o"
echo "   diretório existe e ninguém chega nele. Registre na tabela de Desvios e"
echo "   no Índice de Iniciativas, ou recrie via \`init-detour\` / \`init-milestone\`,"
echo "   que fazem isso por construção."
echo "   Registro é linha de tabela ou de índice com o caminho \`<tipo>/<nome>/\`: nome"
echo "   citado em prosa ou como exemplo não conta."
echo "   Mantido fora do índice de propósito? Declare no CONTEXT.md, em linha própria:"
echo "   <!-- no-index: <motivo> -->"

exit 0
