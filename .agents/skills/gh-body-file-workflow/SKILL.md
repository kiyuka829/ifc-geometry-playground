---
name: gh-body-file-workflow
description: 'Create and edit GitHub Issue/PR bodies via temporary files (tmp/, .workspace/) and run gh commands with --body-file. Use when stdin/body text can break or lose formatting in local shell flows.'
argument-hint: 'Goal: issue create, pr create, issue edit, pr edit, or batch operation'
---

# GH Body File Workflow

## Outcome
Produce reliable `gh` commands for Issue/PR operations by writing body text to a local file first, then passing it with `--body-file`.

In VS Code agent workflows, reliability depends on keeping the shell invocation simple and non-interactive. Long heredocs, multi-command chains, shell functions, and stdin-heavy flows are failure-prone and should be avoided.

## When to Use
- Local shell execution where stdin piping can mangle formatting
- Multi-line Markdown bodies with headings, lists, code blocks, or tables
- Repeated edits where body text should be versioned or reused
- Batch creation of multiple issues or PR updates

## Required Policy
- Do not pass long body text directly via stdin when reliability is important.
- Always save body text to a file under `tmp/` or `.workspace/` first.
- Always use `--body-file <path>` for `gh issue` and `gh pr` body content.
- In agent workflows, prefer file-writing tools to create the body file instead of shell heredocs.
- Keep each `gh` invocation as a single, simple command. Avoid long `&&` chains for multiple issue creations.
- Avoid shell functions, complex conditionals, and multi-line shell programs when running `gh` from the terminal tool.
- Verify GitHub-side state after creation or edit instead of assuming a long batch command succeeded end to end.
- Delete temporary body files after successful command execution.

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
- In VS Code agent workflows, use file creation/editing tools first.
- Use shell heredocs only when operating manually in a clean local shell, not as the default automation path.
- Keep UTF-8 text and preserve blank lines.

Example:
```bash
mkdir -p tmp
printf '%s\n' \
'## Background' \
'Need a reusable editor for profile-driven samples.' \
'' \
'## Proposal' \
'- Introduce shared profile editor UI' \
'- Reuse in multiple sample definitions' \
> tmp/issue-geometry-editor.md
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
- After each create/edit, query GitHub or inspect the returned URL/number before continuing.

6. Cleanup (required).
- Remove transient body files after successful command execution.
- If the body file is temporary, delete it regardless of whether it was in `tmp/` or `.workspace/`.

Example:
```bash
gh issue create \
  --title "Create reusable profile editor" \
  --body-file tmp/issue-geometry-editor.md && \
rm -f tmp/issue-geometry-editor.md
```

## Branching Rules
- If the text is one short sentence and formatting risk is negligible, inline flags may be acceptable.
- If the text is multi-line or includes Markdown structure, always use body files.
- If running multiple `gh` operations, create one body file per item to avoid title/body mismatches.
- If running from the VS Code terminal tool, prefer one `gh` command per tool call.
- If you must do a batch operation, split it into: body-file creation, one `gh` operation at a time, verification, then cleanup.

## VS Code Agent Safe Pattern
1. Create the body file with a file tool.
2. Run exactly one `gh issue create`, `gh issue edit`, `gh pr create`, or `gh pr edit` command.
3. Capture and verify the returned URL or identifier.
4. Repeat for the next item.
5. Remove temporary body files after all operations finish.

Example safe sequence:
```bash
gh issue create \
  --title "Create reusable profile editor" \
  --body-file tmp/issue-geometry-editor.md
```

Then verify separately:
```bash
gh issue list --limit 20 --json number,title
```

## Anti-Patterns
- Piping a long Markdown body directly to `gh ... --body-file -`
- Building the body file with a shell heredoc inside a terminal automation tool
- Creating many issues in one long `cmd1 && cmd2 && cmd3` chain
- Defining shell functions inline and then invoking them in the same terminal automation call
- Reusing a terminal that may still be in a heredoc or partial-input state

## Failure Modes This Skill Must Avoid
- Heredoc content being truncated, duplicated, or interpreted as live terminal input
- Mixed output from a persistent shell causing malformed commands
- Partial success in a batch chain without explicit verification
- Losing the mapping between title and body file during repeated issue creation

## Troubleshooting
- If a command output looks garbled, stop using the current shell flow and switch back to the safe pattern above.
- If a batch operation partially succeeds, verify created issues first, then rerun only the missing items.
- If stdin-based body passing was used, replace it with a saved body file and `--body-file <path>`.
- If terminal state looks contaminated, use a fresh terminal invocation for the next `gh` command.

## Completion Checks
- Every `gh issue/pr` command includes `--body-file`.
- No long Markdown body is passed by stdin.
- No shell heredoc is required in the automated execution path.
- No multi-item batch depends on one long chained shell command.
- Temporary body files are deleted after command completion.
- Command intent and file naming are traceable.
