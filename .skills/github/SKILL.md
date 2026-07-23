---
name: github_push
description: Specialized skill for safely pushing to GitHub, verifying .env GitHub configuration, and handling edge cases like rebasing, diverging, or conflicts.
---

# GitHub Push Skill & Workflow

This skill manages all GitHub interactions. GitHub configuration (identity, remote URL, visibility) is stored in the project's root `.env` file rather than a separate `github.md` artifact. This allows multiple contributors to maintain their own local credentials without polluting version-tracked files.

## Step 1: .env GitHub Configuration — Self-Heal

Before any other action, the agent must verify and self-heal the `.env` file in the project root to ensure GitHub credentials are present.

### Required .env Variables

```
# ── GITHUB CONFIGURATION ────────────────────────────────────────
GITHUB_USER=
GITHUB_EMAIL=
GITHUB_REMOTE_URL=
GITHUB_VISIBILITY=public
GITHUB_BRANCH=main
```

### Self-Heal Sequence

1. **Check for `.env`**: If the file does not exist, create it with the full GitHub configuration block above as a template, warn the user to populate it, and halt.
2. **Check for missing keys**: Read the existing `.env`. If any of the five `GITHUB_` keys are absent, append the missing keys as empty placeholder lines. Warn the user which keys were added and halt until they are filled.
3. **Check for empty values**: If any required key exists but has an empty value (e.g. `GITHUB_USER=`), prompt the user to provide the missing value before continuing.
4. **Protect `.env`**: Verify `.env` is listed in `.gitignore`. If `.gitignore` does not exist, create it with `.env` as the first entry. If it exists but is missing the `.env` entry, append it.

### Reading Variables

Once the `.env` is verified, read and apply the values:

* `GITHUB_USER` → used for `git config user.name`
* `GITHUB_EMAIL` → used for `git config user.email`
* `GITHUB_REMOTE_URL` → used for `git remote add origin` / `git remote set-url origin`
* `GITHUB_VISIBILITY` → document only (Public or Private); prompt user if unset
* `GITHUB_BRANCH` → default push target (typically `main`)

## Step 2: Fetch and Check Status

Run `git fetch` followed by `git status` to determine the relationship between the local branch and the remote (ahead, behind, or diverged).

## Step 3: Handle Edge Cases (Mismatches)

If the local branch does not match the remote (diverged branches, remote has new commits, or other conflicts):

* **DO NOT** automatically push, pull, merge, or force anything.
* Explain the exact mismatch to the user in plain English and offer these specific options:
  * **Merge**: Combine remote changes with local changes.
  * **Rebase**: Reapply local commits on top of the remote branch (cleaner history).
  * **Overwrite Remote (Force Push)**: Overwrite the remote with the local state — destroys differing remote changes (Dangerous).
  * **Overwrite Local (Hard Reset)**: Discard local unpushed commits and match the remote exactly (Dangerous).
* Wait for the user to explicitly select an option before proceeding.

## Step 4: Pre-Commit Code Hygiene & Formatting

Before committing and pushing Rust code to the repository, you MUST manually run `cargo fmt` to apply strict formatting standards, followed by `cargo clippy` and `cargo test`. This repository uses a GitHub Action pipeline that enforces strict code hygiene (`cargo fmt --check`); failure to natively format code before pushing will instantly fail the CI/CD pipeline. Resolve any linting or formatting errors before proceeding.

## Step 5: Mandatory README Badges

Before pushing, ensure the root `README.md` includes a visually rich set of badges at the very top (referencing https://naereen.github.io/badges/). These badges must provide immediate metadata about the repository state (e.g., license, stars, language, repository size).

## Step 6: Execute and Push

Perform the Git commands corresponding to the user's choice. Once the state is clean (or if the branch was simply ahead with no conflicts), you MUST pause and ask the user for explicit permission to push. NEVER execute the push commands without direct authorization.

Once the user explicitly approves, execute the appropriate push:

```powershell
git config user.name  "$GITHUB_USER"
git config user.email "$GITHUB_EMAIL"
# Set or update remote origin
git remote get-url origin 2>$null || git remote add origin "$GITHUB_REMOTE_URL"
git remote set-url origin "$GITHUB_REMOTE_URL"
git push origin "$GITHUB_BRANCH"
```

## Step 7: CI/CD Pipeline Verification via Subagent

After executing a `git push` to the remote repository, you MUST proactively validate that the resulting GitHub Action pipeline completes successfully before considering the push task finished.
* Do NOT use active polling scripts or continuous REST API loops, and do NOT block the primary CLI.
* Instead, you MUST spin up a background subagent to handle the verification.
* The subagent must utilize the `schedule` tool to set a recurring timer that checks the pipeline status every **30 seconds**.
* The subagent should assert the final success state and notify you (using `send_message`) of any warnings, deprecation notices, or runtime errors so they can be addressed.

## Step 8: Update Documentation

Upon a successful push, review and update any of the following project artifacts as needed:

* `design.md`, `plan.md`, `testing.md`, `readme.md`, `todo.md`

Do **not** create or update a `github.md` file — all GitHub configuration now lives in `.env`.

## Step 9: Generate Versioned Walkthrough

* Update the `[PROJECT_ROOT]\project_details\changelog\[VERSION]` directory on each deployment cycle using standard semantic versioning (Major.Minor.Bugfix, e.g., v1.1.0).
* Include screenshots where possible to document UI changes.
* Never modify or overwrite existing version documentation once established.
* Ensure each significant deployment cycle results in a new immutable artifact folder.
* Always ensure that the listed skills within the project's `readme.md` are alphabetized when generating or updating the documentation.
