#!/bin/bash
# Hook: TaskCompleted
# Version: 1.0.0 | Status: Template
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

# Skip validation for documentation-only or planning tasks
if echo "$TASK_SUBJECT" | grep -qiE '(review|research|document|plan|analys)'; then
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
