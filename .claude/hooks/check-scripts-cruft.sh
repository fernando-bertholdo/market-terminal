#!/usr/bin/env bash
# check-scripts-cruft.sh — Hook PreToolUse leve para detectar cruft em scripts/**.
#
# Trigger: PreToolUse matcher "Bash"
# Comportamento: fast-exit (exit 0) se comando não for `git commit`.
# Para `git commit`: rejeita cruft (Blocker, exit 2) e avisa drift (Warning, não bloqueia).
#
# Cobertura completa de auditoria: invocar skill audit-scripts.

set -euo pipefail

# Ler input do stdin (JSON do Claude Code) e extrair comando
input=$(cat)
command=$(echo "$input" | grep -oE '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/' || true)

# Fast-exit se não é git commit
if ! echo "$command" | grep -qE '(^|[[:space:];&|])git[[:space:]]+commit([[:space:];&|]|$)'; then
  exit 0
fi

# Garante que estamos num repo git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  exit 0
fi

# 1) Cruft check (Blocker — bloqueia commit)
cruft=$(git diff --cached --name-only 2>/dev/null | grep -E '^scripts/.*(__pycache__|\.DS_Store|\.pyc)$' || true)
if [[ -n "$cruft" ]]; then
  echo "❌ check-scripts-cruft: cruft detectado em scripts/** no commit:" >&2
  echo "$cruft" | sed 's/^/  - /' >&2
  echo "" >&2
  echo "Ação: git rm --cached <arquivo> e validar que .gitignore cobre o padrão." >&2
  exit 2
fi

# 2) Drift check (Warning — não bloqueia, apenas alerta no stderr)
if [[ -f scripts/INDEX.md ]]; then
  novos=$(git diff --cached --name-only --diff-filter=A 2>/dev/null \
    | grep -E '^scripts/.+\.(sh|py)$' \
    | grep -v '/_archived/' \
    || true)

  if [[ -n "$novos" ]]; then
    # INDEX entries são paths relativos a scripts/ (ex: `setup/init-from-template.sh`).
    # Extraímos qualquer backtick-quoted path terminando em .sh/.py.
    indexed=$(grep -oE '`[a-zA-Z_][^`]+\.(sh|py)`' scripts/INDEX.md 2>/dev/null | tr -d '`' || true)
    while IFS= read -r script; do
      [[ -z "$script" ]] && continue
      # Strip prefixo "scripts/" para comparar com formato do INDEX
      script_rel="${script#scripts/}"
      if ! echo "$indexed" | grep -qxF "$script_rel"; then
        echo "⚠️  check-scripts-cruft: script novo não está em scripts/INDEX.md: $script" >&2
        echo "   Considere atualizar o INDEX antes de commitar (rule scripts-governance §3)." >&2
      fi
    done <<< "$novos"
  fi
fi

exit 0
