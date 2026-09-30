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
#   2. Para cada um, procura o nome do diretório em .planning/README.md.
#   3. Ausente → pendência. Presente em qualquer ponto do arquivo → indexado
#      (tabela de Desvios, Mapeamento ou Índice de Iniciativas servem).
#   4. Sobrou algo → aviso nomeando os diretórios e a skill. exit 0.
#
# Opt-out (G-CANONICAL): linha `<!-- no-index: <motivo> -->` no CONTEXT.md.

set -euo pipefail

PLANNING_DIR=".planning"
README="$PLANNING_DIR/README.md"

[ -f "$README" ] || exit 0

pendentes=()
for tipo in milestones detours initiatives; do
  [ -d "$PLANNING_DIR/$tipo" ] || continue
  for dir in "$PLANNING_DIR/$tipo"/*/; do
    [ -d "$dir" ] || continue
    nome=$(basename "$dir")
    # opt-out declarado no contexto da própria iniciativa
    if [ -f "$dir/CONTEXT.md" ] && grep -q '<!-- no-index:' "$dir/CONTEXT.md" 2>/dev/null; then
      continue
    fi
    if ! grep -qF "$nome" "$README" 2>/dev/null; then
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
echo "   Mantido fora do índice de propósito? Declare no CONTEXT.md:"
echo "   <!-- no-index: <motivo> -->"

exit 0
