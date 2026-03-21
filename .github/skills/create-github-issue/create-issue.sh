#!/usr/bin/env bash
# create-issue.sh
#
# Creates a GitHub Issue using a temporary file for the body text,
# avoiding text corruption that can occur when piping body through stdin.
#
# Usage:
#   .github/skills/create-github-issue/create-issue.sh --title "Issue title" --body "Issue body" [extra gh flags]

set -euo pipefail

TITLE=""
BODY=""
EXTRA_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title)
      TITLE="$2"
      shift 2
      ;;
    --body)
      BODY="$2"
      shift 2
      ;;
    *)
      EXTRA_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ -z "$TITLE" ]]; then
  echo "Error: --title is required" >&2
  exit 1
fi

BODY_FILE=$(mktemp "${TMPDIR:-/tmp}/gh-issue-body-XXXXXX.md")
trap 'rm -f "$BODY_FILE"' EXIT

printf '%s' "$BODY" > "$BODY_FILE"

gh issue create \
  --title "$TITLE" \
  --body-file "$BODY_FILE" \
  "${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}"
