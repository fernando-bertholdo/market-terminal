#!/usr/bin/env bash
#
# check-agents-md-teto.sh
#
# G-AGENTS-TETO: o `AGENTS.md` da raiz cabe no que o Codex lê dele — no máximo
# 32768 bytes, o padrão de `project_doc_max_bytes` (32 KiB).
#
# Por que existe: o Codex corta o `AGENTS.md` no teto. Medido em
# 30/09/2026 (TECH-803, `codex-cli 0.147.0`, `codex debug prompt-input`): num
# derivado cujo `AGENTS.md` tinha 40736 bytes (`wc -c`), as seções do fim não
# chegavam ao prompt. Quem anexa as regras do template ao `AGENTS.md` do projeto
# escolhe, pela ordem, qual metade o Codex deixa de ler — sem saber que escolheu.
#
# Regra — o gate falha nela:
#   1. `AGENTS.md` da raiz com mais de 32768 bytes.
#
# Mede bytes (`wc -c` sob `LC_ALL=C`), não caracteres: o teto do Codex é em
# bytes, e texto em português tem caractere de dois bytes. Sem `AGENTS.md` na
# raiz, passa por vacuidade e diz isso. Mede só o arquivo da raiz: `AGENTS.md`
# em subdiretório não é olhado, e como ele conta no orçamento do Codex não foi
# medido.
#
# Uso:
#   scripts/validate/check-agents-md-teto.sh
#
# Exit codes:
#   0  dentro do teto (ou sem `AGENTS.md` na raiz)
#   1  erro de argumento
#   2  violação
#   5  pré-requisito de ambiente ausente

set -euo pipefail

readonly TETO=32768

log() { printf '[agents-teto] %s\n' "$*"; }
die() { printf '[agents-teto] ERRO: %s\n' "$1" >&2; exit "${2:-1}"; }

[[ $# -eq 0 ]] || { [[ "$1" == "-h" || "$1" == "--help" ]] && { sed -n '3,/^set -euo/{/^set -euo/!p;}' "$0"; exit 0; } || die "argumento desconhecido: $1" 1; }
command -v git >/dev/null 2>&1 || die "git não encontrado no PATH." 5
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$REPO_ROOT" ]] || die "fora de um repositório git." 5
cd "$REPO_ROOT"

if [[ ! -f AGENTS.md ]]; then
  log "sem AGENTS.md na raiz: nada a medir."
  exit 0
fi

# `$(( ))` tira os espaços que o `wc` do macOS põe antes do número.
bytes=$(( $(LC_ALL=C wc -c < AGENTS.md) ))

if (( bytes > TETO )); then
  log "AGENTS.md com $bytes bytes passa do teto de $TETO em $(( bytes - TETO )) byte(s): o Codex não lê o que vem depois do byte $TETO (project_doc_max_bytes)."
  exit 2
fi
log "AGENTS.md com $bytes bytes, dentro do teto de $TETO (project_doc_max_bytes padrão do Codex)."
