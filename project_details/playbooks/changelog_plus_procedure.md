# Changelog Plus: Repeatable Release & CI/CD Validation Specification

## Overview
Changelog Plus is an end to end, verifiable release orchestration workflow for modern web applications and containerized microservices. It bridges code changes, semantic versioning, root cause bug disclosure, automated visual proof generation, documentation synchronization, explicit approval gates, and post push CI/CD pipeline validation into an airtight, repeatable procedure.

---

## Architecture & Lifecycle Stages

```
[Phase 1: Pre-Release Verification]
  * Kill Dev Servers
  * Production Build (Vite/Rollup)
  * Automated Test Suite (100% Pass)
  * Fork Surveillance & License Audit
  * UI Proof & Regression Verification
         │
         ▼
[Phase 2: Semantic Versioning & Sign-Off Gate]
  * Semantic Delta Analysis (Major/Minor/Patch)
  * Draft Changelog with Root Cause & Resolution
  * Mandatory User Sign-Off (PAUSE)
         │
         ▼
[Phase 3: Version Bump & Asset Pipeline]
  * Synchronized Multi-Package Bump (No BOM)
  * Headless Playwright Screenshot Automation
  * Store Assets in Immutable Version Folder
         │
         ▼
[Phase 4: Documentation Synchronization]
  * Versioned Walkthrough (changelog/vX.Y.Z/readme.md)
  * Public Website Scraper Sync (README.md UI Highlights)
         │
         ▼
[Phase 5: Atomic Release Commit & Tagging]
  * Single Bundled Commit (git add -A)
  * Git Tag (vX.Y.Z)
         │
         ▼
[Phase 6: Explicit Push Authorization Gate]
  * Pre-Push Verification Summary
  * Mandatory User Confirmation (PAUSE)
         │
         ▼
[Phase 7: Remote Push & Proactive CI/CD Validation]
  * Push Master Branch & Release Tag
  * Automated GitHub Actions Polling
  * Annotations, Warnings & Deprecation Audit
  * Final Deployment Report & Advisory
```

---

## Step by Step Execution Instructions

### Phase 1: Pre Release Verification & Gatekeeping

1. **Terminate Development Background Tasks**:
   * Inspect and safely kill running dev servers (e.g., Web dev server, API server) before release packaging.
   * Prevents port collisions, locked build directories, and stale memory state during production build and tests.

2. **Verify Production Bundle Build**:
   * Execute `npm run build` (or equivalent multi-workspace build script).
   * Confirm that asset bundling, chunk generation, CSS minification, and static exports succeed with exit code 0.

3. **Execute Full Automated Test Suite**:
   * Run the complete test suite across all packages (e.g., `npm test`).
   * Require 100% test pass rate (e.g., 54 API tests + 15 Web tests = 69 passed, 0 failed, 0 skipped).
   * Do not proceed to release preparation if any test fails or is skipped.

4. **Audit Forks & License Compliance**:
   * Run fork surveillance script (`npm run scan:forks` -> `project_details/playbooks/scan_forks.cjs`).
   * Query remote repository forks via GitHub API to verify zero unauthorized commits or diverged branches ahead of upstream master.

5. **Execute Headless Proof & Regression Tests**:
   * Run targeted Playwright browser test scripts (`project_details/proof/test_*.cjs`) covering changed UI components.
   * Verify responsiveness, state transitions, keyboard navigation, and theme consistency.
   * Capture initial visual evidence in `project_details/proof/`.

---

### Phase 2: Explicit Version Reasoning & User Sign Off

1. **Classify Version Increment (Strict SemVer)**:
   * **Major (+1.0.0)**: Breaking architectural changes, database schema restructuring requiring manual migration, or complete UI paradigms. Requires explicit user alignment.
   * **Minor (+0.1.0)**: New functional capabilities, backward compatible feature additions, or bundled tool upgrades.
   * **Patch (+0.0.1)**: Bug fixes, security patches, performance corrections, or minor documentation touchups.

2. **Structure Drafted Changelog Summary**:
   * Organize bulleted updates by domain (e.g., 3D Objects, Matrix Canvas, Strip Simulator, Preset Browser, Docs).
   * **Mandatory Bug Root Cause & Resolution Pattern**:
     * Whenever addressing a defect or unexpected behavior, explicitly document:
       * **Root Cause**: The technical reason why the issue occurred in the codebase (e.g., unhandled switch cases falling through to placeholder sine wave fallback, missing palette color mapping, ignored intensity factors).
       * **Resolution**: The concrete implementation that resolved the defect (e.g., 50 distinct mathematical simulation algorithms matching authentic firmware specifications).

3. **Mandatory User Sign Off Gate**:
   * **CRITICAL PAUSE**: The agent must output the proposed version number, the explicit semantic reasoning, and the bulleted changelog summary.
   * The agent MUST NOT proceed with the bump script or git operations until the user explicitly responds with approval.

---

### Phase 3: Version Bump Execution & Asset Pipeline

1. **Execute Root Version Bump Script**:
   * Run `./bump_version.ps1 <version>` (e.g., `powershell -ExecutionPolicy Bypass -File .\bump_version.ps1 0.25.0`).
   * The bump script must synchronize version strings across all relevant manifests:
     * Root `package.json`
     * Workspace `apps/api/package.json`
     * Workspace `apps/web/package.json`
     * Ecosystem plugins (e.g., `custom_components/wledashboard/manifest.json`)
   * Ensure file writing uses clean Node.js UTF-8 without Byte Order Marks (BOM: `\ufeff`).

2. **Automated Screenshot Generation**:
   * Execute an automated Playwright capture playbook (`project_details/playbooks/screenshot-vX.Y.Z.cjs`).
   * Spin up local preview or dev services headlessly if required.
   * Navigate to newly added or updated interfaces, configure representative state, and capture Retina (2x scale) PNG screenshots.
   * Store captured images in an immutable version directory: `project_details/changelog/v[VERSION]/screenshots/`.

---

### Phase 4: Documentation Synchronization & Public Scraper Compliance

1. **Generate Versioned Walkthrough (`project_details/changelog/v[VERSION]/readme.md`)**:
   * Create a permanent walkthrough document containing:
     * High level summary of the release.
     * What is New & Improved section with domain specific headings.
     * Technical Root Cause & Resolution details for resolved bugs.
     * Valid relative markdown links to newly generated screenshots: `![Alt Text](project_details/changelog/v[VERSION]/screenshots/[filename].png)`.
     * Operational Notes: In place container upgrade commands (`docker compose pull && docker compose up -d`), OS host upgrade steps, and non destructive database assurances.

2. **Synchronize Root README & Website Scraper**:
   * Update the root `README.md` (`## UI Highlights` section) with newly added features.
   * **Strict Scraper Format Rules** (for public website gallery ingestion):
     * **Heading Level**: Use `### Heading Text` immediately before each image. The website scraper parses `###` as the gallery card title.
     * **Card Description**: Place a descriptive paragraph directly between the `###` heading and the `![alt](url)` image tag.
     * **Image Syntax**: Standard markdown `![Descriptive Alt Text](project_details/changelog/v[VERSION]/screenshots/[filename].png)`. Do not use HTML `<img>` tags.
     * **Relative Paths**: Use valid relative paths prefixed by repository root.

---

### Phase 5: Atomic Release Commit & Tagging

1. **Order of Operations**:
   * ALWAYS generate changelog walkthroughs, documentation updates, proof assets, and package version bumps *before* creating the commit.
   * Bundle all changes into a single atomic release commit. Never create separate documentation only follow up commits.

2. **Stage and Commit**:
   * `git add -A`
   * `git commit -m "release: v[VERSION]"`

3. **Create Release Tag**:
   * `git tag v[VERSION]`
   * Matches the exact version string from `package.json` (e.g., `v0.25.0`).

---

### Phase 6: Explicit Push Authorization Gate

1. **Present Pre Push Verification Summary**:
   * Output a concise pre push report containing:
     * Commit SHA and commit message
     * Git tag name
     * Target remote and branches (`origin/master`, `origin/v[VERSION]`)
     * Status of tests (100% pass)
     * Status of build (clean production build)
     * Fork surveillance result (0 forks ahead)
     * State of dev servers (safely terminated)

2. **Mandatory Authorization Pause**:
   * **CRITICAL CONSTRAINT**: The agent must NEVER execute `git push` or commands modifying remote repositories without direct, explicit user authorization for that specific push.
   * Explicitly ask the user for permission to execute `git push origin master && git push origin v[VERSION]`.

---

### Phase 7: Remote Push & Proactive CI/CD Validation

1. **Push Master & Tag**:
   * Upon receiving confirmation, execute:
     * `git push origin master`
     * `git push origin v[VERSION]`

2. **Automated CI/CD Pipeline Tracking (`project_details/playbooks/validate_ci.cjs`)**:
   * Launch a background monitoring script that polls the GitHub REST API (`https://api.github.com/repos/[owner]/[repo]/actions/runs`).
   * Identify all workflow runs triggered by the commit SHA across push and tag events.
   * Wait until all workflow runs reach `status === 'completed'`.
   * Verify that every workflow concluded with `conclusion === 'success'`.

3. **Proactive Annotations & Warning Audit**:
   * Query the GitHub Check Runs Annotations API (`/check-runs/[job_id]/annotations`) and runner logs.
   * Identify any warnings, deprecation notices, or environment updates (e.g., Node.js runner deprecation, OS runner image migrations).
   * For each notice, formulate an explicit **Context** and **Advisory**:
     * **Context**: Explain why the notification was emitted by the platform runner.
     * **Advisory**: Inform the user whether immediate code intervention is necessary or if action can be scheduled for future maintenance milestones.

4. **Final Deployment & CI/CD Report**:
   * Output a structured Markdown table summarizing all executed workflows, events, conclusions, and direct GitHub Action URLs.
   * Present the advisory breakdown.
   * Summarize the published release highlights.

---

## Reusable Automation Scripts Reference

### CI/CD Validator Script (`project_details/playbooks/validate_ci.cjs`)
```javascript
/**
 * Automated GitHub Actions Pipeline Monitor & Annotation Auditor
 * Usage: node project_details/playbooks/validate_ci.cjs <commit_sha>
 */
const REPO = 'upioneer/WLEDashboard';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getRuns(sha) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/runs?per_page=15`, {
    headers: { 'User-Agent': 'WLEDashboard-CI-Monitor' }
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = await res.json();
  return (data.workflow_runs || []).filter(r => r.head_sha.startsWith(sha));
}

async function getAnnotations(runId) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/runs/${runId}/jobs`, {
    headers: { 'User-Agent': 'WLEDashboard-CI-Monitor' }
  });
  if (!res.ok) return [];
  const data = await res.json();
  const annotations = [];
  for (const job of data.jobs || []) {
    const annRes = await fetch(`https://api.github.com/repos/${REPO}/check-runs/${job.id}/annotations`, {
      headers: { 'User-Agent': 'WLEDashboard-CI-Monitor' }
    });
    if (annRes.ok) {
      const anns = await annRes.json();
      if (Array.isArray(anns)) {
        for (const a of anns) {
          annotations.push({ jobName: job.name, ...a });
        }
      }
    }
  }
  return annotations;
}

async function main() {
  const sha = process.argv[2];
  if (!sha) {
    console.error('Please provide a commit SHA');
    process.exit(1);
  }

  console.log(`Starting CI validation for commit SHA: ${sha}...`);
  const maxAttempts = 60; // 10 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    const runs = await getRuns(sha);
    if (runs.length === 0) {
      console.log(`[Attempt ${attempts}] Waiting for workflow runs to register...`);
      await sleep(10000);
      continue;
    }

    const completed = runs.filter(r => r.status === 'completed');
    console.log(`[Attempt ${attempts}] ${completed.length}/${runs.length} workflows completed...`);

    if (completed.length === runs.length && runs.length > 0) {
      console.log('\nAll workflows finished. Auditing results and annotations...\n');
      let allSuccess = true;
      for (const r of runs) {
        console.log(`Workflow: ${r.name} | Status: ${r.status} | Conclusion: ${r.conclusion}`);
        if (r.conclusion !== 'success') allSuccess = false;

        const annotations = await getAnnotations(r.id);
        for (const a of annotations) {
          console.log(`  [${(a.annotation_level || 'INFO').toUpperCase()}] ${a.jobName}: ${a.message || a.title}`);
        }
      }

      if (!allSuccess) {
        console.error('\nOne or more workflows failed.');
        process.exit(1);
      }
      console.log('\nAll workflows passed successfully!');
      process.exit(0);
    }

    await sleep(10000);
  }

  console.error('Timed out waiting for workflows to finish.');
  process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

---

## Universal Invariants & Constraints Checklist

* **Zero Emojis**: Never use emojis in UI code, git messages, changelogs, or documentation.
* **Consistent Typography**: Use asterisks `*` exclusively for bullet points in markdown artifacts; never use hyphens or em dashes.
* **Full File Edits**: Always provide complete code files during implementation iterations rather than isolated snippets.
* **UTF-8 Clean (No BOM)**: Never use PowerShell `Set-Content` or `Out-File` without BOM prevention. Use Node.js `fs.writeFileSync(path, content, 'utf8')`.
* **Idempotent Database Migrations**: Never define columns in base migrations that are later altered. Ensure migration runners are safe for both clean installs and incremental upgrades.
* **Two Gate Approval Architecture**:
  1. Gate 1: Version increment reasoning and drafted changelog summary approval before executing `./bump_version.ps1`.
  2. Gate 2: Explicit pre push verification summary authorization before executing `git push`.
