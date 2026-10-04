#!/bin/bash
# Hook: TaskCompleted
# Version: 1.1.0 | Status: Template
#
# Fires when a task is being marked as completed.
# Exit 0 = allow completion. Exit 2 + stderr = block completion with feedback.
#
# This hook integrates Agent Teams with the project's quality gates.
# It prevents teammates from marking tasks as complete without passing
# the project's test suite (when applicable).
#
# Input: JSON on stdin with task_id, task_subject, task_description,
#        teammate_name, team_name
#
# Extensibility: This hook auto-detects stack via project markers.
# To add a custom stack, add an elif block below or override via
# the PROJECT_TEST_COMMAND environment variable.
#
# Docs: https://code.claude.com/docs/en/agent-teams

INPUT=$(cat)
TASK_SUBJECT=$(echo "$INPUT" | jq -r '.task_subject // empty' 2>/dev/null || echo "")
TEAMMATE_NAME=$(echo "$INPUT" | jq -r '.teammate_name // empty' 2>/dev/null || echo "")

# Pula o gate quando o assunto declara trabalho de documentação, revisão,
# pesquisa ou planejamento (TECH-809). Antes o filtro casava substring em inglês
# e pulava `implementa parser de planilha` (`plan`) e todo `fix(planning): …`.
# A falha segura é rodar a suíte, então a decisão é positiva e por palavra:
#   1. Tipo Conventional Commits no início: pula só o `docs`; os outros rodam.
#   2. Sem tipo: pula se a PRIMEIRA palavra é verbo da lista abaixo e o resto
#      não tem coordenação (` e `, ` ou `, ` and `, ` or `, `,`, `;`, `:`, `+`,
#      `&`, `/`). Coordenação declara mais de um trabalho, e o outro pode ser
#      código: `Revisar e atualizar o parser` roda. O veto cobre a coordenação
#      lexical acima, não qualquer conector, e não depende de lista de verbos
#      de implementação.
# A lista tem só verbo, sem acento, e a decisão inteira é ASCII: não depende de
# locale. Ficam fora `revisa` (no template, "altera"), `revise`, e os
# substantivos, que também nomeiam funcionalidade de produto (`revisão`,
# `documentação`, `pesquisa`, `plano`, `análise`, `analysis`, `documentation`,
# `planning`). Resíduo conhecido: em inglês `plan`, `review`, `research` e
# `document` também são substantivo (`Plan limit enforcement` pula), e oração
# subordinada não é coordenação (`Revisar o parser que atualiza o cache` pula),
# e conector fora do conjunto também não é (`Planejar depois implementar…`,
# `Plan then implement…`, `Revisar para corrigir…`, `Revisar antes de reescrever…`
# pulam).
# Medido por `scripts/validate/test-hook-task-completed.sh` (casos, limites e `--medir`).
PALAVRAS_SEM_CODIGO='review|reviewing|research|researching|document|documenting|docs|plan|analyze|analyse|analyzing|analysing'
PALAVRAS_SEM_CODIGO="$PALAVRAS_SEM_CODIGO"'|revisar|pesquisar|pesquise|documentar|documenta|documente|planejar|planeja|planeje|analisar|analisa'
TIPO_CC='^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^)]*\))?!?:'
ASSUNTO=$(printf '%s\n' "$TASK_SUBJECT" | head -n 1 | sed -E 's/^[[:space:]]+//')
if printf '%s' "$ASSUNTO" | grep -qiE "$TIPO_CC"; then
  if printf '%s' "$ASSUNTO" | grep -qiE '^docs(\([^)]*\))?!?:'; then
    exit 0
  fi
elif printf '%s' "$ASSUNTO" | grep -qiE "^(${PALAVRAS_SEM_CODIGO})([[:space:]]|\$)" \
  && ! printf '%s' "$ASSUNTO" | grep -qiE '[[:space:]](e|ou|and|or)[[:space:]]|[,;:+&/]'; then
  exit 0
fi

# Skip if no teammate (lead completing tasks directly)
if [ -z "$TEAMMATE_NAME" ]; then
  exit 0
fi

# Gate: run test suite if test runner is available
# Priority: explicit env var > auto-detection by stack markers
#
# To override for any stack, set in .claude/settings.json env:
#   "PROJECT_TEST_COMMAND": "your-test-command"
if [ -n "${PROJECT_TEST_COMMAND:-}" ]; then
  if ! eval "$PROJECT_TEST_COMMAND" 2>&1; then
    echo "Tests failing. Fix test failures before completing: $TASK_SUBJECT" >&2
    exit 2
  fi
# Python: pyproject.toml, setup.py, setup.cfg, requirements.txt
elif [ -f "pyproject.toml" ] || [ -f "setup.py" ] || [ -f "setup.cfg" ] || [ -f "requirements.txt" ]; then
  if command -v pytest &> /dev/null; then
    if ! pytest -q --tb=line 2>&1; then
      echo "Tests failing. Fix test failures before completing: $TASK_SUBJECT" >&2
      exit 2
    fi
  fi
# Node/JS/TS: package.json with test script
elif [ -f "package.json" ]; then
  if command -v jq &> /dev/null && jq -e '.scripts.test' package.json &> /dev/null; then
    if ! npm test --silent 2>&1; then
      echo "Tests failing. Fix test failures before completing: $TASK_SUBJECT" >&2
      exit 2
    fi
  fi
# Go: go.mod
elif [ -f "go.mod" ]; then
  if command -v go &> /dev/null; then
    if ! go test ./... 2>&1; then
      echo "Tests failing. Fix test failures before completing: $TASK_SUBJECT" >&2
      exit 2
    fi
  fi
# Rust: Cargo.toml
elif [ -f "Cargo.toml" ]; then
  if command -v cargo &> /dev/null; then
    if ! cargo test --quiet 2>&1; then
      echo "Tests failing. Fix test failures before completing: $TASK_SUBJECT" >&2
      exit 2
    fi
  fi
# No stack detected: allow (test gate is optional)
fi

# Gate: check for unstaged sensitive files
if git status --porcelain 2>/dev/null | grep -qE '\.env$|credentials|\.key$|\.pem$'; then
  echo "Sensitive files detected in working tree. Review before completing: $TASK_SUBJECT" >&2
  exit 2
fi

exit 0
