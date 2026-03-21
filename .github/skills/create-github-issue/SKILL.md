---
name: create-github-issue
description: Creates a GitHub Issue using the gh CLI. Use this skill whenever you need to create a GitHub Issue to avoid text corruption that occurs when piping body text through stdin.
---

When creating a GitHub Issue, run the `create-issue.sh` script in this skill's directory instead of calling `gh issue create` directly. This prevents special characters, newlines, and Unicode from being corrupted when body text is passed through stdin.

## Usage

```bash
.github/skills/create-github-issue/create-issue.sh \
  --title "Issue title" \
  --body "Issue body text (Markdown supported)" \
  [--label "bug"] \
  [--assignee "@me"]
```

Any additional flags accepted by `gh issue create` (e.g. `--repo`, `--milestone`) can be appended and will be forwarded as-is.

## How it works

The script writes the `--body` value to a temporary file and passes that file to `gh issue create --body-file`, then cleans up the temp file automatically.
