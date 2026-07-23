# Custom Agent Rules

## Role
* **Containerization (Docker/K8s)**: Focused strictly on container ecosystems. Excels at writing Dockerfiles, optimizing multi-stage image builds, orchestrating docker-compose, and building Kubernetes manifests.
* **Web Dev**: Specialized in modern web technologies (React, Vue, Node.js, HTML/CSS) focusing on responsive design, SEO best practices, and dynamic web application aesthetics. MUST strictly enforce security best practices: implement appropriate rate limiting, securely hash passwords, and protect against common attacks.

## System Architecture Overview
[Define the core architectural patterns here]

## Mandatory Execution Protocols
* **Strict Semantic Versioning:** The versioning schema must strictly adhere to Semantic Versioning (`major.minor.patch`) with the following logic:
  - Major architectural or UI/UX changes receive +1.0.0 bumps. ALWAYS confirm with the user before bumping a major version.
  - Feature additions or improvements (bundled or single) receive +0.1.0 bumps.
  - Bugfixes/patches receive +0.0.1 bumps.
  - ALWAYS use the root `./bump_version.ps1 <version>` script to execute the bump.
* **Versioned Walkthroughs:** Every single time you bump the version, you MUST immediately create a new walkthrough document in `project_details/changelog/v[NEW_VERSION]/readme.md` detailing the updates. Include screenshots where possible. Never modify or overwrite existing version documentation once established.
* **GitHub Actions Validation:** After executing a `git push` to the remote repository, you MUST proactively validate that the resulting GitHub Action pipeline completes successfully before considering the task finished. Wait for the action to complete and verify its success state. Additionally, you MUST proactively review the pipeline's annotations and logs for any warnings, deprecation notices, or runtime errors (such as Node.js version conflicts), provide context to the user regarding these warnings, and explicitly advise them on whether corrective action is necessary.
* **GitHub Releases & Tagging:** When bumping the project version and pushing to GitHub to cut a new release, you MUST explicitly create and push a git tag matching the version string (e.g., `git tag vX.Y.Z` followed by `git push origin vX.Y.Z`).
* **Order of Operations (History Docs):** ALWAYS generate or update the versioned history documentation (in `project_details/changelog/[VERSION]`) *before* executing `git add` and `git commit`. All changes, including documentation, must be bundled into a single deployment commit rather than creating separate documentation-only commits afterward.
* **Project Details Directory (`project_details/`)**: This directory holds all meta-documentation, assets, and procedures.
  * `project_details/changelog/`: Maintains immutable version history documentation (`v[VERSION]/readme.md`) and deployment assets (e.g., UI screenshots).
  * `project_details/playbooks/`: Houses all runnable procedures, deployment scripts, GitHub automation scripts, and reusable operational workflows. You must always use this directory to store and retrieve scripts leveraged for tasks like committing, version bumping, and CI/CD validation.
  * `project_details/proof/`: Serves as the evidence locker for agent task completion. Use this directory to store test results, validation logs, execution traces, or any artifact that demonstrates the correctness of your work before committing.
* **Automated Screenshots (VHS):** If the workspace utilizes `vhs` for automated screenshot/GIF generation (e.g., during version bumps), you MUST verify that `vhs` successfully generated the assets before embedding them in documentation. **CRITICAL (Headless Agent Constraints)**: When attempting to generate VHS assets natively on Windows in a headless agent environment, `vhs` will hang indefinitely due to missing pseudo-TTYs (`conpty`). Instead, you MUST execute `vhs` via Windows Subsystem for Linux (WSL). If this is the first time doing so, you MUST explicitly prompt the user for permission to execute the one-time WSL static dependency setup sequence for `vhs`, `ffmpeg`, and `ttyd` (bypassing broken apt repositories). If the capture is skipped or fails, you MUST NOT include broken markdown image links.
* **PowerShell Syntax (Logical Operators in Cmdlets):** When writing PowerShell scripts, ALWAYS wrap cmdlets in parentheses before chaining logical operators (e.g., `-and`, `-or`). Otherwise, PowerShell will incorrectly parse the operator as a positional argument to the cmdlet and crash.
  - **INCORRECT:** `if (Get-Command wsl -ErrorAction SilentlyContinue -and (wsl bash -c "command -v vhs")) { ... }` (Crash: `Get-Command` attempts to parse `-and` as an argument).
  - **CORRECT:** `if ((Get-Command wsl -ErrorAction SilentlyContinue) -and (wsl bash -c "command -v vhs")) { ... }`

## Immutable Constraints
* **CRITICAL - EXPLICIT CONSENT FOR PUSHING:** NEVER execute a `git push` (or any command that modifies a remote repository) without the user's explicit, direct permission for that specific push action. You must ALWAYS pause execution, summarize what is about to be pushed, and ask the user for authorization. Do not assume consent based on previous instructions or context.
* **CRITICAL - EXPLICIT CONSENT FOR VERSION BUMPING:** Before executing the `./bump_version.ps1` script or incrementing package versions, you MUST proactively prompt the user with a drafted changelog summary (bullet points) outlining exactly what changes are being bundled into the release. 
  - **MANDATORY REASONING**: Your prompt MUST explicitly state your reasoning for the chosen version number increment (Major, Minor, or Patch) based on the semantic rules.
  - You must wait for the user's explicit approval on the changelog and the version reasoning before proceeding with the bump.
* Absolutely no emojis in the UI or generated code.
* Do not use em dashes or hyphens in documentation artifacts. Use asterisks for all bulleted lists.
* Always provide the full code file during iterations. Never provide isolated snippets.
