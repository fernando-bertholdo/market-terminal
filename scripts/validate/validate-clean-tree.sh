#!/usr/bin/env bash
#
# validate-clean-tree.sh — árvore de trabalho limpa, ignorando artefatos de
# runtime de agente.
#
# Por que existe: o runtime de agente do Multica injeta arquivos no checkout
# no início de cada run. `git status --porcelain` cru acusa árvore suja por
# causa deles e trava o pré-voo — foi o que quebrou o DoD da LAS-25 em
# 28/08/2026.
#
# O `.gitignore` cobre os que nascem não-rastreados. Ele NÃO alcança arquivo
# rastreado: `AGENTS.md` está no índice do template de origem, e de todo
# derivado que o herda, e um runtime que o sobrescreva durante o run o faz
# aparecer como modificado (DL-4 da LAS-34, medido com um runtime que saiu do
# homelab e dos dois workspaces em 01/10/2026, TECH-829).
# Por isso a exclusão aqui é por pathspec, não por gitignore.
#
# A exclusão do `AGENTS.md` fica, decidida na TECH-829. Medido em 02/10/2026
# 02:30Z no homelab, na pasta do workspace tech-projects:
#   ls -1 */workdir/CLAUDE.md | wc -l   → 130 workdirs de task com o arquivo
#   ls -1 */workdir/AGENTS.md | wc -l   → 0
# O que essa contagem mede é a injeção do runtime Claude do Multica na RAIZ do
# workdir, que fica fora do checkout quando o repositório entra num
# subdiretório (`multica repo checkout`); ela não diz se algum runtime reescreve
# o `AGENTS.md` rastreado do checkout. Na mesma hora, `multica runtime list`
# mostra 3 runtimes Codex e 1 Cursor `online`, e `multica agent list` mostra os
# 7 agentes em runtimes Claude. Se um runtime não-Claude escreve o `AGENTS.md`
# não foi medido; se escrever, tirar a exclusão faria o primeiro run dele num
# derivado travar o pré-voo. Sai quando essa medição disser que nenhum escreve.
#
# `.claude/worktrees/` entrou em 15/09/2026: o worktree que o Claude Code
# materializa dentro do repo nasceu depois deste script, e nem o `.gitignore`
# nem esta lista o conheciam — o gate saía exit 1 depois de um commit perfeito
# em qualquer máquina que tivesse rodado agent teams.
#
# Exit: 0 = limpa · 1 = suja (lista o que sobrou) · 2 = erro de uso.

set -euo pipefail

# Paths que pertencem ao runtime do agente, não ao repositório.
RUNTIME_PATHSPECS=(
  ':(top,exclude)AGENTS.md'
  ':(top,exclude)CLAUDE.md'
  ':(top,exclude).multica/'
  ':(top,exclude).agent_context/'
  ':(top,exclude).claude/skills/multica-*'
  ':(top,exclude).agents/skills/multica-*'
  ':(top,exclude).claude/worktrees/'
)

uso() {
  cat <<'HELP'
Uso: scripts/validate/validate-clean-tree.sh [--help] [--verbose]

Verifica se a árvore de trabalho está limpa desconsiderando os artefatos que
os runtimes de agente injetam no checkout.

  --verbose   também lista os paths de runtime que foram desconsiderados
  --help      esta mensagem

Exit code: 0 limpa · 1 suja · 2 erro de uso
HELP
}

VERBOSE=0
for arg in "$@"; do
  case "$arg" in
    --help|-h) uso; exit 0 ;;
    --verbose|-v) VERBOSE=1 ;;
    *) echo "Argumento desconhecido: $arg" >&2; uso >&2; exit 2 ;;
  esac
done

cd "$(git rev-parse --show-toplevel)"

sujo="$(git status --porcelain -- . "${RUNTIME_PATHSPECS[@]}")"

if [ "$VERBOSE" -eq 1 ]; then
  runtime="$(git status --porcelain -- "${RUNTIME_PATHSPECS[@]/(top,exclude)/(top)}" 2>/dev/null || true)"
  if [ -n "$runtime" ]; then
    echo "Artefatos de runtime desconsiderados:"
    echo "$runtime" | sed 's/^/  /'
  fi
fi

if [ -n "$sujo" ]; then
  echo "Árvore suja — pendências fora dos artefatos de runtime:" >&2
  echo "$sujo" | sed 's/^/  /' >&2
  exit 1
fi

echo "Árvore limpa (artefatos de runtime de agente desconsiderados)."
