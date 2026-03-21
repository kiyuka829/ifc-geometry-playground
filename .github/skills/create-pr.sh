#!/usr/bin/env bash
# create-pr.sh
#
# Creates a GitHub Pull Request using a temporary file for the body text,
# avoiding text corruption that can occur when piping body through stdin.
#
# Usage:
#   .github/skills/create-pr.sh --title "PR title" --body "PR body text" [--base main] [--draft]
#
# Any additional flags supported by `gh pr create` can be appended.
#
# The body text is written to a temporary file so that special characters,
# newlines, and Unicode are preserved correctly.

set -euo pipefail

TITLE=""
BODY=""
EXTRA_ARGS=()

# Parse known arguments; collect the rest to pass through to gh
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

# Write the body to a temporary file to avoid stdin/pipe text corruption
BODY_FILE=$(mktemp "${TMPDIR:-/tmp}/gh-pr-body-XXXXXX.md")
trap 'rm -f "$BODY_FILE"' EXIT

printf '%s' "$BODY" > "$BODY_FILE"

gh pr create \
  --title "$TITLE" \
  --body-file "$BODY_FILE" \
  "${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}"
