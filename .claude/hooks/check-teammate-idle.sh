#!/bin/bash
# Hook: TeammateIdle
# Version: 1.0.0 | Status: Template
#
# Fires when a teammate is about to go idle (stop working).
# Exit 0 = allow idle. Exit 2 + stderr = keep teammate working.
#
# This hook ensures teammates don't go idle with uncommitted work
# or incomplete deliverables. It integrates with the project's
# atomic commit workflow.
#
# Input: JSON on stdin with teammate_name, team_name, session_id
#
# Docs: https://code.claude.com/docs/en/agent-teams

# Area the teammate does not own (ERE, relative to the repository root). The Lead
# owns `.planning/`: teammates read it and edit code only in the directories the
# Lead designates (CLAUDE.md §3, "Regras de Segurança para Teammates"; agent-team
# skill, "Acesso a .planning/"). What changes there comes from the Lead or from
# other sessions, and a teammate can neither commit it nor delete it, so counting
# it traps the teammate with no way out (TECH-926). A derivative that lays its Lead
# area out differently adjusts this constant.
LEAD_AREA='\.planning/'

INPUT=$(cat)
TEAMMATE_NAME=$(echo "$INPUT" | jq -r '.teammate_name // empty')

# Check for uncommitted changes that this teammate might own.
# Counts every line of the porcelain output: staged (M_), working-tree only (_M)
# and untracked (??). The old filter read only the index column, so a file
# modified in the working tree and not yet staged did not count toward the limit.
# Lines under LEAD_AREA are dropped first. A porcelain line is `XY <path>` (the path
# may come quoted), so the prefix test skips the two status columns and the space.
# The prefix test runs in the C locale: the prefix is ASCII, and in a UTF-8 locale
# GNU grep takes a path with an invalid byte (`core.quotepath=false`, a name that came
# from another system) for binary input and drops the line without output, so the
# count fell below the true one (TECH-926).
UNCOMMITTED=$(git status --porcelain 2>/dev/null | LC_ALL=C grep -v -E "^.. \"?$LEAD_AREA" | grep -c .)

if [ "$UNCOMMITTED" -gt 0 ]; then
  # There are uncommitted changes - warn but don't block
  # (Lead should handle commits, not teammates)
  # Only block if changes are significant (>5 files)
  if [ "$UNCOMMITTED" -gt 5 ]; then
    echo "Teammate $TEAMMATE_NAME has $UNCOMMITTED uncommitted changes. Summarize your work status before going idle." >&2
    exit 2
  fi
fi

exit 0
