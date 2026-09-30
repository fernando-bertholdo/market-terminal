#!/usr/bin/env bash
#
# check-versao-linhagem.sh
#
# G-LINHAGEM: a versão que o marcador de linhagem declara é a versão que o
# template realmente tem.
#
# `2.12.0` vive em dois lugares do ponto de entrada: no rodapé `**Versão:**`,
# que é o número canônico do template, e na linha `Template de origem:
# <template>@<versão>`, que todo derivado herda ao nascer. Quem sobe um sem o
# outro faz o template mentir a própria versão para todo derivado futuro — e a
# propagação, que usa essa versão para calcular o gap, propaga o que já foi
# aplicado ou pula o que é novo.
#
# O marcador vive nas três camadas de instrução (DL-9), byte a byte idêntico.
# O rodapé `**Versão:**` canônico é só o do ponto de entrada do Claude Code:
# `.agents/README.md` versiona o próprio documento, não o template.
#
# ── Duas correções de 2026-09-15, auditoria do fluxo de kickoff ──────────────
#
# (a) A raiz era resolvida por `git -C "$(dirname "$0")"`, ou seja, pelo lugar
#     onde o SCRIPT mora, não por onde ele é INVOCADO. Rodar a cópia do canônico
#     de dentro de um derivado media o canônico e devolvia PASS sobre o alvo
#     errado, em silêncio. Agora a raiz sai do diretório corrente.
#
# (b) A regra 3 comparava marcador e rodapé em qualquer repositório. Ela só vale
#     no template canônico, onde os dois números são o mesmo eixo. Num derivado o
#     rodapé versiona o `CLAUDE.md` local — o próprio arquivo declara que "segue
#     numeração própria e não é o mesmo eixo" —, então a comparação produzia
#     falha permanente e falsa. Agora a regra 3 só roda quando o repositório É o
#     template que o marcador nomeia.
#
# Regras — o gate falha em qualquer uma:
#   1. Camada sem a linha `Template de origem: <nome>@<versão>`.
#   2. Marcador diferente entre as camadas.
#   3. Versão do marcador diferente da do rodapé canônico — SÓ no canônico.
#
# Uso:
#   scripts/validate/check-versao-linhagem.sh          # audita o repo corrente
#
# Exit codes:
#   0  marcador íntegro
#   1  erro de argumento
#   2  violação (marcador ausente, divergente entre camadas, ou fora do rodapé)
#   5  pré-requisito de ambiente ausente

set -euo pipefail

# Estender a uma quarta camada é acrescentar o arquivo aqui.
readonly CAMADAS=(".claude/CLAUDE.md" ".agents/README.md" ".codex/README.md")
# O rodapé `**Versão:**` do template canônico — a referência de comparação.
readonly RODAPE=".claude/CLAUDE.md"

log() { printf '[linhagem] %s\n' "$*"; }
die() { printf '[linhagem] ERRO: %s\n' "$1" >&2; exit "${2:-1}"; }

[[ $# -eq 0 ]] || { [[ "$1" == "-h" || "$1" == "--help" ]] && { sed -n '3,45p' "$0"; exit 0; } || die "argumento desconhecido: $1" 1; }

command -v git >/dev/null 2>&1 || die "git não encontrado no PATH." 5
# A raiz sai do diretório CORRENTE, não de onde o script mora: um gate precisa
# auditar o repositório em que foi invocado, senão mente sobre o alvo.
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$REPO_ROOT" ]] || die "fora de um repositório git." 5
cd "$REPO_ROOT"

VIOLACOES=0
viol() { printf '[linhagem] %s\n' "$1" >&2; VIOLACOES=$((VIOLACOES + 1)); }

# ── 1. Marcador presente e idêntico nas três camadas ──────────────
CANONICO=""
for camada in "${CAMADAS[@]}"; do
  if [[ ! -f "$camada" ]]; then
    viol "camada ausente: $camada"
    continue
  fi
  marcador="$(sed -n 's/^Template de origem: *//p' "$camada" | head -1)"
  if [[ -z "$marcador" ]]; then
    viol "sem linha 'Template de origem:' — $camada"
    continue
  fi
  if [[ -z "$CANONICO" ]]; then
    CANONICO="$marcador"
  elif [[ "$marcador" != "$CANONICO" ]]; then
    viol "marcador divergente em $camada: '$marcador' ≠ '$CANONICO'"
  fi
done

[[ -n "$CANONICO" ]] || die "nenhuma camada declara o marcador de linhagem." 2

# ── 2. Versão do marcador × rodapé canônico (só no template canônico) ─────────
VERSAO_MARCADOR="${CANONICO##*@}"
NOME_TEMPLATE="${CANONICO%@*}"
SOU_O_TEMPLATE=0
[[ "$(basename "$REPO_ROOT")" == "$NOME_TEMPLATE" ]] && SOU_O_TEMPLATE=1

if [[ "$VERSAO_MARCADOR" == "$CANONICO" || -z "$VERSAO_MARCADOR" ]]; then
  viol "marcador sem versão após '@': '$CANONICO'"
elif [[ "$SOU_O_TEMPLATE" -eq 1 ]]; then
  VERSAO_RODAPE="$(sed -n 's/^\*\*Versão:\*\* *//p' "$RODAPE" | head -1)"
  if [[ -z "$VERSAO_RODAPE" ]]; then
    viol "sem rodapé '**Versão:**' em $RODAPE"
  elif [[ "$VERSAO_MARCADOR" != "$VERSAO_RODAPE" ]]; then
    viol "marcador em $VERSAO_MARCADOR e rodapé de $RODAPE em $VERSAO_RODAPE — suba os dois juntos"
  fi
fi

if [[ "$VIOLACOES" -gt 0 ]]; then
  printf '[linhagem] %d violação(ões).\n' "$VIOLACOES" >&2
  exit 2
fi

if [[ "$SOU_O_TEMPLATE" -eq 1 ]]; then
  log "marcador '$CANONICO' íntegro nas ${#CAMADAS[@]} camadas e coerente com o rodapé."
else
  log "marcador '$CANONICO' íntegro nas ${#CAMADAS[@]} camadas (derivado — rodapé não comparado)."
fi
