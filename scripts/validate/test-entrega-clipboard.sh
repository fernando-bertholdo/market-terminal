#!/usr/bin/env bash
# test-entrega-clipboard.sh — roda os comandos da seção "Entrega" do
# `generate-session-prompt/SKILL.md` e confere que copiar e reler devolvem o
# arquivo intacto (TECH-828).
#
# Por que ele existe: a seção não tem script junto; a instrução é uma tabela
# por sistema, e a segurança vem da conferência. Os comandos são lidos da
# PRÓPRIA tabela e dos blocos cercados (a chamada do bash ao PowerShell e as duas
# conferências), executados como o texto os escreve, para texto e teste não
# divergirem.
#
# O que ele mede, nesta ordem:
#   1. a tabela tem as linhas macOS, Windows, Wayland e X11, com Copiar e Reler;
#   2. o comparador bash da seção diz IGUAL para o fixture com `\r\n` e quebras
#      finais a mais, e DIFERE para uma letra trocada (roda sem área de
#      transferência, em qualquer máquina);
#   3. ida e volta pela área de transferência da linha do sistema, com fixture
#      de acentos, emoji, crases e `$()`: tem de sair IGUAL; no Windows, três
#      passagens: o bloco bash da seção que chama o PowerShell, a linha da
#      tabela rodada por `powershell.exe` (a de quem está no PowerShell, sem
#      bash) e o comparador PowerShell da seção;
#   4. no macOS, o controle negativo: cópia sem locale UTF-8, relida pelo
#      comando da tabela, tem de sair DIFERE.
# Sem área de transferência (comando ausente ou que falha), 3 e 4 saem PULADO,
# que não reprova: é o caso em que a skill diz que não copiou e dá o caminho.
#
# ⚠️ Escreve na área de transferência de quem roda: o conteúdo anterior se perde.
#
# Uso: bash scripts/validate/test-entrega-clipboard.sh [--skill <SKILL.md>] [--exigir] [--help]
#   --skill   lê outro SKILL.md (padrão: a cópia de `.claude/skills/`)
#   --exigir  PULADO reprova; para a CI, onde a área de transferência existe
# Exit codes: 0 = o que rodou bateu; 1 = algum caso diverge, ou PULADO com
#             --exigir; 2 = erro de uso ou seção/tabela/bloco não encontrado.

set -euo pipefail

RAIZ_REPO=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
SKILL="$RAIZ_REPO/.claude/skills/generate-session-prompt/SKILL.md"
EXIGIR=0
while [ $# -gt 0 ]; do
  case "$1" in
    --skill) [ $# -ge 2 ] && [ -f "$2" ] || { echo "uso: --skill <arquivo existente>" >&2; exit 2; }
             SKILL=$2; shift 2 ;;
    --exigir) EXIGIR=1; shift ;;
    --help|-h) sed -n '2,/^set -euo/{/^set -euo/!p;}' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "argumento desconhecido: $1 (use --help)" >&2; exit 2 ;;
  esac
done

falhas=0; pulados=0
ok()     { printf 'PASS    %s\n' "$1"; }
falha()  { printf 'FAIL    %s\n' "$1"; falhas=$((falhas + 1)); }
pulado() { printf 'PULADO  %s\n' "$1"; pulados=$((pulados + 1)); }
erro()   { printf 'ERRO    %s\n' "$1" >&2; exit 2; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

SECAO=$(awk '/^## Entrega[[:space:]]*$/ { d = 1; next } d && /^## / { exit } d' "$SKILL")
[ -n "$SECAO" ] || erro "seção '## Entrega' não encontrada em $SKILL"

# Célula da tabela: $1 = 1ª coluna exata, $2 = 2 (Copiar) ou 3 (Reler). Tira as
# crases da ponta e desfaz o `\|`, que é como a tabela escreve o pipe.
celula() {
  printf '%s\n' "$SECAO" | awk -F'|' -v alvo="$1" -v col="$(($2 + 1))" '
    function apara(s) { gsub(/^[[:space:]]+|[[:space:]]+$/, "", s); return s }
    /^[[:space:]]*\|/ {
      gsub(/\\[|]/, "\001")
      if (apara($2) != alvo) next
      c = apara($col); sub(/^`/, "", c); sub(/`$/, "", c); gsub(/\001/, "|", c)
      print c; exit
    }'
}
# Bloco cercado da seção: $1 = linguagem, $2 = trecho que o identifica.
bloco() {
  printf '%s\n' "$SECAO" | awk -v ling="$1" -v marca="$2" '
    $0 ~ "^[[:space:]]*```" ling "[[:space:]]*$" { d = 1; b = ""; next }
    d && /^[[:space:]]*```/ { d = 0; if (index(b, marca)) { printf "%s", b; exit } next }
    d { sub(/^   /, ""); b = b $0 "\n" }'
}

# 1. Tabela e blocos.
for s in "macOS" "Windows (PowerShell)" "Linux, Wayland" "Linux, X11"; do
  [ -n "$(celula "$s" 2)" ] && [ -n "$(celula "$s" 3)" ] || erro "tabela sem Copiar/Reler para '$s'"
done
ok "tabela: macOS, Windows, Wayland e X11 com Copiar e Reler"
CMP_BASH=$(bloco bash 'echo IGUAL'); [ -n "$CMP_BASH" ] || erro "bloco bash de conferência não encontrado"
CMP_PS=$(bloco powershell "'IGUAL'"); [ -n "$CMP_PS" ] || erro "bloco powershell de conferência não encontrado"
BLOCO_WIN=$(bloco bash 'wslpath'); [ -n "$BLOCO_WIN" ] || erro "bloco bash da chamada do PowerShell não encontrado"

FX="$TMP/session-prompt-fixture.md"
printf '%s\n' 'Retomada: ação, coração — ç ã é ü ñ 🚀' 'crases: `git log --oneline -5`' \
  'subst: $(echo NAO-EXPANDIR) ${HOME} $F' "aspas: \"duplas\" 'simples' \\barra" > "$FX"
# Roda o comparador bash da seção com o `reler` dado em $1 (texto de comando).
compara() { ( F=$FX; eval "reler() { $1; }"; eval "$CMP_BASH" ) 2>/dev/null; }

# 2. Comparador, sem área de transferência.
sed 's/$/\r/' "$FX" > "$TMP/crlf"; printf '\r\n\n' >> "$TMP/crlf"
sed 's/coração/coracão/' "$FX" > "$TMP/troca"
CRLF=$TMP/crlf; TROCA=$TMP/troca   # lidos por `cat "$VAR"` dentro do `reler`: caminho com `'` não quebra a citação
[ "$(compara 'cat "$CRLF"')" = IGUAL ] && ok "comparador: \\r\\n e quebras finais a mais → IGUAL" \
  || falha "comparador: \\r\\n e quebras finais a mais deviam sair IGUAL"
[ "$(compara 'cat "$TROCA"')" = DIFERE ] && ok "comparador: uma letra trocada → DIFERE" \
  || falha "comparador: uma letra trocada devia sair DIFERE"

# 3 e 4. Ida e volta pela linha do sistema, escolhida pela regra da seção.
sem_area() { if [ "$EXIGIR" -eq 1 ]; then falha "sem área de transferência: $1"; else pulado "sem área de transferência: $1"; fi; }
LINHA=""; CONV=""
case "$(uname -s)" in
  Darwin) LINHA="macOS" ;;
  MINGW*|MSYS*|CYGWIN*) LINHA="Windows (PowerShell)"; CONV="cygpath -w" ;;
  Linux)
    if grep -qi microsoft /proc/version 2>/dev/null; then LINHA="Windows (PowerShell)"; CONV="wslpath -w"
    elif [ -n "${WAYLAND_DISPLAY:-}" ] && command -v wl-copy >/dev/null 2>&1; then LINHA="Linux, Wayland"
    elif [ -n "${DISPLAY:-}" ]; then LINHA="Linux, X11"; fi ;;
esac
COPIAR=$(celula "$LINHA" 2); RELER=$(celula "$LINHA" 3)
if [ "$LINHA" = "Windows (PowerShell)" ]; then
  # Do bash, a seção manda rodar o BLOCO dela, e é ele que roda aqui, como está:
  # só `wslpath -w` vira `cygpath -w` no Git Bash. Vai num bash filho com `set -e`,
  # porque no `eval` do pai o `if` desliga o -e e uma cópia que falha passaria.
  BLOCO_EXEC=$(printf '%s\n' "$BLOCO_WIN" | sed "s/wslpath -w/$CONV/")
  # O 1º argumento depois do script (`$0`) é o nome que o bash põe nas mensagens de erro.
  roda_bloco() { bash -c 'set -e; F=$1; eval "$2"; eval "$3"' entrega-bloco "$FX" "$BLOCO_EXEC" "$1"; }
  copiar() { roda_bloco ':'; }
  reler_() { roda_bloco 'reler'; }
  compara_linha() { roda_bloco "$CMP_BASH" 2>/dev/null; }
  # O comparador PowerShell da seção é para quem já está no PowerShell, com `$F`
  # posto: aqui o harness o põe, com o `'` do caminho dobrado.
  W=$($CONV "$FX"); WQ=${W//\'/\'\'}
  ps_() { MSYS_NO_PATHCONV=1 powershell.exe -NoProfile -Command "\$F = '$WQ'; $1"; }
else
  copiar() ( F=$FX; eval "$COPIAR" )
  reler_() ( F=$FX; eval "$RELER" )
  compara_linha() { compara "$RELER"; }
fi

if [ -z "$LINHA" ]; then
  sem_area "nenhuma linha da tabela vale (uname -s: $(uname -s); sem DISPLAY, e sem WAYLAND_DISPLAY com wl-copy)"
elif ! copiar >/dev/null 2>"$TMP/err" || ! reler_ >/dev/null 2>>"$TMP/err"; then
  sem_area "$LINHA: $(head -n 1 "$TMP/err")"
else
  [ "$(compara_linha)" = IGUAL ] && ok "$LINHA: copiado e relido pela seção → IGUAL" \
    || falha "$LINHA: copiado e relido pela seção devia sair IGUAL"
  if [ "$LINHA" = "Windows (PowerShell)" ]; then
    # A linha da tabela, depois do bloco: o que ela copia e relê é o que vale para
    # quem está no PowerShell, e cada célula tem de continuar dizendo o mesmo que o bloco.
    # Cópia que falha é FAIL, não PULADO: o bloco acima já provou que há PowerShell.
    # A área já guarda o fixture que o bloco copiou, então um valor sentinela entra antes:
    # célula Copiar que sai 0 sem copiar deixa o sentinela, e a releitura dá DIFERE.
    if ! ps_ "Set-Clipboard -Value 'sentinela'" >/dev/null 2>"$TMP/err"; then
      falha "$LINHA: o sentinela antes da linha da tabela não gravou: $(head -n 1 "$TMP/err")"
    elif ! ps_ "$COPIAR" >/dev/null 2>"$TMP/err" || ! ps_ "$RELER" >/dev/null 2>>"$TMP/err"; then
      falha "$LINHA: a linha da tabela falhou: $(head -n 1 "$TMP/err")"
    elif [ "$(compara 'ps_ "$RELER"')" = IGUAL ]; then ok "$LINHA: copiado e relido pela linha da tabela → IGUAL"
    else falha "$LINHA: copiado e relido pela linha da tabela devia sair IGUAL"; fi
    r=$(ps_ "$(printf '%s' "$CMP_PS" | tr '\n' ';')" | tr -d '\r') || true
    [ "$r" = IGUAL ] && ok "$LINHA: comparador PowerShell da seção → IGUAL" \
      || falha "$LINHA: comparador PowerShell devia sair IGUAL (saiu: ${r:-vazio})"
  fi
  if [ "$LINHA" = "macOS" ]; then
    # Controle negativo: sem locale, `pbcopy` grava `ação` como `a√ß√£o`
    # (medido em 30/09/2026, TECH-828); a releitura em UTF-8 tem de ver isso.
    if ! env -i PATH=/usr/bin:/bin pbcopy < "$FX" 2>/dev/null; then
      falha "macOS: pbcopy sem locale falhou; o controle negativo não rodou"
    elif [ "$(compara_linha)" = DIFERE ]; then ok "macOS: cópia sem locale UTF-8 → DIFERE (controle negativo)"
    else falha "macOS: cópia sem locale UTF-8 devia sair DIFERE; a releitura não vê a corrupção"; fi
  fi
fi

printf '\n%d falha(s), %d pulado(s) — %s\n' "$falhas" "$pulados" "$SKILL"
[ "$falhas" -eq 0 ] || exit 1
