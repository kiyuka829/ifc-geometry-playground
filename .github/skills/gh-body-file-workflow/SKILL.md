---
name: gh-body-file-workflow
description: 'Create and edit GitHub Issue/PR bodies via temporary files (tmp/, .workspace/) and run gh commands with --body-file. Use when stdin/body text can break or lose formatting in local shell flows.'
argument-hint: 'Goal: issue create, pr create, issue edit, pr edit, or batch operation'
---

# GH Body File Workflow

## Outcome
Produce reliable `gh` commands for Issue/PR operations by writing body text to a local file first, then passing it with `--body-file`.

## When to Use
- Local shell execution where stdin piping can mangle formatting
- Multi-line Markdown bodies with headings, lists, code blocks, or tables
- Repeated edits where body text should be versioned or reused
- Batch creation of multiple issues or PR updates

## Required Policy
- Do not pass long body text directly via stdin when reliability is important.
- Always save body text to a file under `tmp/` or `.workspace/` first.
- Always use `--body-file <path>` for `gh issue` and `gh pr` body content.

## Procedure
1. Define the operation target.
- `issue create`
- `issue edit`
- `pr create`
- `pr edit`

2. Choose a body file path.
- Preferred short-lived path: `tmp/<topic>.md`
- Workspace-local path: `.workspace/<topic>.md`
- Ensure parent directory exists before writing.

3. Write Markdown body to file.
- Use heredoc for readability.
- Keep UTF-8 text and preserve blank lines.

Example:
```bash
mkdir -p tmp
cat > tmp/issue-geometry-editor.md <<'EOF'
## Background
Need a reusable editor for profile-driven samples.

## Proposal
- Introduce shared profile editor UI
- Reuse in multiple sample definitions
EOF
```

4. Execute `gh` command with `--body-file`.

Issue create:
```bash
gh issue create \
  --title "Create reusable profile editor" \
  --body-file tmp/issue-geometry-editor.md
```

Issue edit:
```bash
gh issue edit 123 \
  --title "Create reusable profile editor" \
  --body-file tmp/issue-geometry-editor.md
```

PR create:
```bash
gh pr create \
  --title "Refactor profile editing model" \
  --body-file tmp/pr-profile-editor.md
```

PR edit:
```bash
gh pr edit 45 \
  --body-file tmp/pr-profile-editor.md
```

5. Verify before submission.
- Confirm file exists and is non-empty.
- Confirm the command references the expected file.
- For batch runs, ensure each title maps to the correct body file.

6. Optional cleanup.
- Remove transient files in `tmp/` after completion.
- Keep reusable templates in `.workspace/` when future edits are expected.

## Branching Rules
- If the text is one short sentence and formatting risk is negligible, inline flags may be acceptable.
- If the text is multi-line or includes Markdown structure, always use body files.
- If running multiple `gh` operations, create one body file per item to avoid title/body mismatches.

## Completion Checks
- Every `gh issue/pr` command includes `--body-file`.
- No long Markdown body is passed by stdin.
- Body files are stored under `tmp/` or `.workspace/`.
- Command intent and file naming are traceable.
