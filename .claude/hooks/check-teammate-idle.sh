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

INPUT=$(cat)
TEAMMATE_NAME=$(echo "$INPUT" | jq -r '.teammate_name // empty')

# Check for uncommitted changes that this teammate might own
UNCOMMITTED=$(git status --porcelain 2>/dev/null | grep -cE '^[MADRCU?]')

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
