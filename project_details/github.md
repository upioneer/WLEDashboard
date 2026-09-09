---
description: GitHub Project Setup Template
---

# GitHub Project Configuration

GitHub identity and repository configuration is managed through the project's root `.env` file.
Do not store credentials or personal identifiers in this file or any version-tracked document.

## Required .env Variables

Add the following block to your `.env` file in the project root:

```
# ── GITHUB CONFIGURATION ────────────────────────────────────────
GITHUB_USER=
GITHUB_EMAIL=
GITHUB_REMOTE_URL=
GITHUB_VISIBILITY=public
GITHUB_BRANCH=main
```

The GitHub skill will automatically create or append these variables if they are missing.

## Agent Instructions

When an agent is asked to push or interact with GitHub:

1. Read `.env` and verify all `GITHUB_` variables are present and populated. Halt and prompt the user if any are missing.
2. Review and update project artifacts (`design.md`, `plan.md`, `testing.md`, `readme.md`, `todo.md`) as required.
3. Create `project_details\changelog\v[NEW_VERSION]\readme.md`.
4. Verify `GITHUB_REMOTE_URL` is valid. Prompt user if not.
5. Verify `GITHUB_VISIBILITY` (Public/Private) if the user has not declared.
6. Initialize git (`git init`) if not already initialized.
7. Configure local identity using `GITHUB_USER` and `GITHUB_EMAIL` from `.env`.
8. Stage and commit changes.
9. Add or update remote origin using `GITHUB_REMOTE_URL`.
10. Push to `GITHUB_BRANCH`.
