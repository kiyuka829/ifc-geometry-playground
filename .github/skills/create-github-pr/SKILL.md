---
name: create-github-pr
description: Creates a GitHub Pull Request using the gh CLI. Use this skill whenever you need to create a GitHub Pull Request to avoid text corruption that occurs when piping body text through stdin.
---

When creating a GitHub Pull Request, run the `create-pr.sh` script in this skill's directory instead of calling `gh pr create` directly. This prevents special characters, newlines, and Unicode from being corrupted when body text is passed through stdin.

## Usage

```bash
.github/skills/create-github-pr/create-pr.sh \
  --title "PR title" \
  --body "PR body text (Markdown supported)" \
  [--base main] \
  [--draft]
```

Any additional flags accepted by `gh pr create` (e.g. `--repo`, `--reviewer`, `--assignee`) can be appended and will be forwarded as-is.

## How it works

The script writes the `--body` value to a temporary file and passes that file to `gh pr create --body-file`, then cleans up the temp file automatically.
