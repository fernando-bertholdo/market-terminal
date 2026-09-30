#!/usr/bin/env bash
#
# check-changelog-local.sh
#
# G-CHANGELOG: toda tabela "Changelog Local" das camadas de instrução de agente
# (`.claude/`, `.codex/`, `.agents/`) tem a forma que a §8 do `CLAUDE.md` define
# — cinco colunas (Data, Commit, Sync-ID, Arquivo, Descrição), data ISO 8601 na
# primeira — e a ordem que o exemplo da §8 mostra: a mais recente primeiro.
#
# Por que existe: a §8 definia o formato e nenhum validador o cobrava. Medido em
# 19/09/2026 (TECH-651): o `.claude/hooks/README.md` e o `.claude/rules/README.md`
# do próprio template tinham linhas de 2026-09-14 e 2026-03-30 depois de linhas
# mais antigas, e a inversão tinha viajado por `sync-downstream` ao `lab-contratos`.
# As skills `mirror-upstream` e `sync-downstream` leem estas tabelas para achar
# Sync-ID pendente; uma tabela em que ninguém sabe onde a última entrada está é
# uma tabela em que a entrada nova cai no lugar errado.
#
# Regras — o gate falha em qualquer uma:
#   1. Linha da tabela com número de colunas diferente de 5.
#   2. Primeira coluna que não é data `YYYY-MM-DD`.
#   3. Data maior que a da linha de dados anterior da mesma tabela (ordem decrescente, empate permitido;
#      cada tabela recomeça a ordem).
#   4. Seção sem nenhuma linha separadora — nada foi conferido (um gate que diz "íntegra" sobre nada não é
#      gate); tabela com cabeçalho e separador e ainda sem linha de dados é legítima e passa.
#   5. Code fence aberto e nunca fechado, em qualquer posição do arquivo — o que ele engoliu não foi conferido
#      (fence fecha com o mesmo caractere e comprimento >= o da abertura, como no CommonMark; a mensagem
#      diz em que linha ele abriu).
#
# Itera `git ls-files` (como o gate de pareamento), e só os `README.md` das três camadas: uma
# tabela posta em outro arquivo não é vista. Sem tabela nenhuma, passa por vacuidade — o
# derivado pode não ter as três camadas. A seção vai até o próximo heading `#`: linha em branco
# no meio da tabela não a encerra nem reinicia a ordem; tabela nova começa na linha separadora
# (`|---|`), e o cabeçalho é a linha logo acima dela. Code fence de crases ou tildes é ignorado.
#
# Uso:
#   scripts/validate/check-changelog-local.sh
#
# Exit codes:
#   0  tabelas íntegras (ou nenhuma tabela)
#   1  erro de argumento
#   2  violação
#   5  pré-requisito de ambiente ausente

set -euo pipefail

log() { printf '[changelog] %s\n' "$*"; }
die() { printf '[changelog] ERRO: %s\n' "$1" >&2; exit "${2:-1}"; }

[[ $# -eq 0 ]] || { [[ "$1" == "-h" || "$1" == "--help" ]] && { sed -n '3,/^set -euo/{/^set -euo/!p;}' "$0"; exit 0; } || die "argumento desconhecido: $1" 1; }
command -v git >/dev/null 2>&1 || die "git não encontrado no PATH." 5
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$REPO_ROOT" ]] || die "fora de um repositório git." 5
cd "$REPO_ROOT"

VIOLACOES=0
TABELAS=0
LINHAS=0
while IFS= read -r f; do
  [[ -f "$f" ]] || continue
  grep -q '^## Changelog Local' "$f" || continue
  # awk: dentro da seção (que acaba no próximo heading `#`), uma tabela começa onde há uma linha
  # separadora (`|---|…`); a linha imediatamente anterior é o cabeçalho e não se confere. Toda outra
  # linha `|` é linha de dados: 5 colunas, data ISO, e data não maior que a da linha de dados
  # anterior da mesma tabela — linha em branco no meio da tabela NÃO encerra a tabela nem reinicia a
  # ordem; uma tabela nova (separador novo) recomeça a ordem. Code fence (``` ou ~~~) é ignorado, e
  # o heading dentro de um fence não abre seção; um fence aberto e nunca fechado — antes da seção,
  # no meio da tabela, em qualquer posição — é violação própria, porque o que ele engoliu não foi
  # conferido e os contadores não separam tabela vazia de tabela engolida. A última linha da saída é
  # `__STATS__ tabelas=N linhas=M`.
  saida=$(awk -v F="$f" '
    function confere(l, c, cols, d) {
      lin++
      gsub(/\\\|/, "\001", l)                          # pipe escapado não separa coluna
      if (l !~ /\|[ \t]*$/) { printf "%s:%d: linha de tabela sem o pipe de fechamento\n", F, nr_pend; l = l "|" }
      c = split(l, cel, "|"); cols = c - 2
      if (cols != 5) printf "%s:%d: %d coluna(s), esperadas 5\n", F, nr_pend, cols
      d = cel[2]; gsub(/^[ \t]+|[ \t]+$/, "", d)
      if (d !~ /^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$/) { printf "%s:%d: primeira coluna não é data ISO: %s\n", F, nr_pend, d; return }
      if (prev != "" && d > prev) printf "%s:%d: %s vem depois de %s — a mais recente primeiro\n", F, nr_pend, d, prev
      prev = d
    }
    function flush() { if (pend != "") { confere(pend); pend = "" } }
    /^(`{3,}|~{3,})/ {                                 # CommonMark: fecha com o mesmo caractere e comprimento >= o da abertura
      match($0, /^(`+|~+)/); m = substr($0, RSTART, RLENGTH)
      if (!fence) { fence = 1; fchar = substr(m, 1, 1); flen = RLENGTH; fnr = NR }
      else if (substr(m, 1, 1) == fchar && RLENGTH >= flen) fence = 0
      next
    }
    fence { next }                                     # o que o fence engole não é conferido; fence não fechado é a regra 5
    /^## Changelog Local/ { flush(); sec = 1; prev = ""; next }
    sec && /^#/ { flush(); sec = 0 }
    !sec { next }
    /^\|([ \t]*:?-+:?[ \t]*\|)+[ \t]*$/ { pend = ""; prev = ""; tab++; next }   # separador (linha inteira): a pendente era o cabeçalho
    /^\|/ { flush(); pend = $0; nr_pend = NR; next }
    { flush() }
    END { flush(); if (fence) printf "%s:%d: code fence aberto aqui e nunca fechado — o que ele engoliu não foi conferido\n", F, fnr; printf "__STATS__ tabelas=%d linhas=%d\n", tab, lin }
  ' "$f")
  stats="${saida##*__STATS__ }"; saida="${saida%__STATS__*}"; saida="${saida%$'\n'}"
  t=${stats#tabelas=}; t=${t%% *}; l=${stats##*linhas=}
  TABELAS=$((TABELAS + t)); LINHAS=$((LINHAS + l))
  if [[ "$t" -eq 0 ]]; then saida="${saida:+$saida$'\n'}$f: seção Changelog Local sem tabela conferida (nenhuma linha separadora vista; ${l} linha(s) de dados soltas)"; fi
  if [[ -n "$saida" ]]; then
    printf '%s\n' "$saida" | sed 's/^/[changelog] /' >&2
    VIOLACOES=$((VIOLACOES + $(printf '%s\n' "$saida" | wc -l | tr -d ' ')))
  fi
done < <(git ls-files -- '.claude/*README.md' '.codex/*README.md' '.agents/*README.md')

if [[ "$VIOLACOES" -gt 0 ]]; then
  printf '[changelog] %d violação(ões); %d tabela(s) lida(s), %d linha(s) conferida(s).\n' "$VIOLACOES" "$TABELAS" "$LINHAS" >&2
  exit 2
fi
log "$TABELAS tabela(s) Changelog Local íntegra(s), $LINHAS linha(s) conferida(s): 5 colunas, data ISO, a mais recente primeiro."
