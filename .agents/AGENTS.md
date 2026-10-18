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
* **Root README Screenshots & Website Gallery Sync:** The official website (`https://wledashboard.com`) dynamically scrapes `https://raw.githubusercontent.com/upioneer/WLEDashboard/master/README.md` to populate its live product gallery for external visitors. Whenever new UI features (such as Interactive Demo Mode, 3D Spatial upgrades, or new controls) are introduced or updated during a release, you MUST:
  * Capture high-fidelity screenshots of the new features and store them in `project_details/changelog/v[VERSION]/screenshots/`.
  * Update the root `README.md` (`## UI Highlights` section) with the new screenshots and feature showcases so the public gallery is never stale.
  * **Strict Scraper Format Rules**:
    * **Heading Level**: Use `### Heading Text` immediately before each image. The website scraper looks specifically for `###` to extract card titles.
    * **Card Description**: Place a descriptive paragraph directly between the `###` heading and the `![alt](url)` image tag. The scraper extracts this text directly for the card body.
    * **Image Syntax & Alt**: Use standard markdown `![Descriptive Alt Text](project_details/changelog/v[VERSION]/screenshots/[filename].png)`. Do not use HTML `<img>` tags. Alt text serves as fallback title.
    * **Relative Paths**: Use valid relative paths (`project_details/changelog/v[VERSION]/screenshots/...`), which the website automatically prefixes with the raw GitHub branch URL.
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
* **PowerShell File Encoding & JSON Safety (No UTF-8 BOM):** In Windows PowerShell 5.1, `Set-Content -Encoding UTF8` and `Out-File -Encoding UTF8` automatically prepend a Byte Order Mark (BOM: `\ufeff`), and `ConvertTo-Json` escapes characters like `&` and `>` into Unicode literals (`\u0026`, `\u003e`). NEVER use PowerShell cmdlets to rewrite JSON, config, or source code files. Always use Node.js (`fs.writeFileSync(file, ..., 'utf8')`) or agent file write tools to ensure files remain clean UTF-8 without BOM.
* **Database Migration Safety & Idempotency:** Never define columns in `migration_001` or base schema definitions that are subsequently added via `ALTER TABLE` in later migration versions. All migration execution runners must be idempotent and resilient against duplicate columns or existing schema structures so that both clean volume installs and upgraded databases initialize without crashes.
* **Community & Special Thanks Protocol:** Community members whose feature requests, feedback, and bug reports contribute to WLEDashboard are acknowledged in the Settings > About Special Thanks marquee (`apps/web/src/views/Settings/Settings.jsx`). When synchronizing or adding contributors across platforms (GitHub and Reddit):
  * **Dual Platform Entries Allowed:** A contributor active on both Reddit and GitHub gets one entry per platform. Tied names sort with the github entry first.
  * **Strict Alphabetical Ordering:** All contributor handles must be maintained in strict alphabetical order via unicode base sensitivity (`a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })`).
  * **Clean Typography & Zero Links:** Entries must define only `{ name: '...', platform: 'github' | 'reddit' }` with no external links, markdown tags, or emojis.
  * **Marquee Description Copy:** The explanatory header text must strictly read: "Special thanks to community members whose feature requests, feedback, and bug reports help shape WLEDashboard. (Hover to pause)".
* **Fork Surveillance & Proprietary License Enforcement:** WLEDashboard is strictly proprietary software with All Rights Reserved per `LICENSE.md`. No permission is granted to copy, modify, or distribute the software or its documentation. On every commit, release preparation, or push, you MUST run `node project_details/playbooks/scan_forks.cjs` (or `npm run scan:forks`) to audit all GitHub forks. If any fork contains commits ahead of upstream master, new branches, or tags, you MUST proactively alert the user with the fork owner, repository URL, ahead commit SHAs, authors, messages, and GitHub compare diff URLs so appropriate notification, DMCA, or legal action can be taken.

## Immutable Constraints
* **CRITICAL - EXPLICIT CONSENT FOR PUSHING:** NEVER execute a `git push` (or any command that modifies a remote repository) without the user's explicit, direct permission for that specific push action. You must ALWAYS pause execution, summarize what is about to be pushed, and ask the user for authorization. Do not assume consent based on previous instructions or context.
* **CRITICAL - EXPLICIT CONSENT FOR VERSION BUMPING:** Before executing the `./bump_version.ps1` script or incrementing package versions, you MUST proactively prompt the user with a drafted changelog summary (bullet points) outlining exactly what changes are being bundled into the release. 
  - **MANDATORY REASONING**: Your prompt MUST explicitly state your reasoning for the chosen version number increment (Major, Minor, or Patch) based on the semantic rules.
  - You must wait for the user's explicit approval on the changelog and the version reasoning before proceeding with the bump.
* Absolutely no emojis in the UI or generated code.
* Do not use em dashes or hyphens in documentation artifacts. Use asterisks for all bulleted lists.
* Always provide the full code file during iterations. Never provide isolated snippets.
