---
name: website_deploy_linux
description: Enterprise Linux Deployment Agent for deploying static sites and SPAs to Nginx locally or remotely via SSH or PuTTY CLI (plink/pscp) using keys and credentials defined in .env, with strict upfront architectural checks and subdirectory safety rules.
---

# Enterprise Linux Deployment Agent

This skill guides the agent through deploying, building, and serving web applications (specifically static sites and Single Page Applications) onto a local or remote Linux server (such as an LXC container) running Nginx.

## Upfront Architectural Prompting

To eliminate configuration mismatch, avoid post-deployment refactoring, and establish a seamless deployment flow, the agent must prompt the user with three specific architectural questions **at the very beginning of the interaction** before taking any other action:

### 1. LXC Hosting Architecture Check
* **Prompt**: "How is this LXC hosted: is it dedicated to this one site, or does it share with other apps?"
* **Mapping**:
  * If dedicated: The agent can bind the application directly to the server's default blocks or root directories, and manage standard configuration entries without affecting other applications.
  * If shared: The agent must strictly isolate the project configurations, write dedicated configurations, and avoid overriding default blocks.

### 2. Access Method Selection
* **Prompt**: "How should the site be accessed? (domain/ip, subdomain, or slug)"
* **Mapping**:
  * If domain or subdomain: Prompts for the FQDN and deploys using the Dedicated Virtual Host Strategy (Strategy 1).
  * If IP or slug: Deploys using the Shared Host Subdirectory Strategy (Strategy 2), aliases routing paths, and compiles custom assets under the matching subdirectory.

### 3. Domain Availability Check
* **Prompt**: "Do you have a domain name to use?"
* **Mapping**:
  * If yes: Configures dedicated virtual hosts binding to that specific domain.
  * If no: Configures subdirectory slug locations running off the default IP address.

## Host Environments

The agent can deploy applications to two host environments:

* **Local Host**: The current Linux environment where the agent is running.
* **Remote Host (SSH / LXC)**: A remote Linux server or LXC container accessed securely via SSH/SCP or Windows PuTTY CLI (`plink.exe` and `pscp.exe`).

### Secure SSH Credential File Setup (.env)

To automate remote execution securely, the agent must check and maintain credentials within the project's root environment file:

* **Verification Sequence**:
  * Check if the `.env` file exists in the project root directory.
  * If `.env` does not exist, create it in the root folder.
  * If `.env` does exist, read its contents. If the lines `ssh_key=` or `ssh_pw=` are missing, append them as new lines at the end of the file.
* **Environment Credentials**:
  * `ssh_pw`: The password for the remote deployment user.
  * `ssh_key`: The public key string used for automated key authentication.
* **Security Constraints**: Never expose these credentials in active console output, log artifacts, or version-tracked repositories. Keep the variables protected locally.

## Reference Scripts

The agent must follow the configuration and orchestration patterns demonstrated in the target reference scripts included with the skill:

* [setup-lxc.sh](file:///C:/Users/hgran/OneDrive/Documents/code/Projects/Agent%20Skills/.skills/website-deploy-linux/assets/setup-lxc.sh): A Linux bash script that automates native Nginx installations, directory setups, asset copying (`www-data` user ownership and `755`/`644` permissions), and syntax tests on the remote target.
* [deploy.ps1](file:///C:/Users/hgran/OneDrive/Documents/code/Projects/Agent%20Skills/.skills/website-deploy-linux/assets/deploy.ps1): A PowerShell orchestrator that loads variables from `.env`, validates host keys, installs authorized keys, securely moves folders, and triggers elevated setup scripts via PuTTY CLI.

## Non-Destructive Subdirectory Safeguards (Data Protection)

To prevent accidental data loss, the agent must adhere to strict folder preservation rules:

* **Prohibition of Clears**: **Never delete existing project directories, nor use command flags that automatically clear folders (such as the Vite `--overwrite` scaffolding flag or equivalent Next.js/React folder clearing options).**
* **Safe Directory Strategy**: When scaffolding new frameworks, compiling, or building:
  * Create a new working subdirectory (e.g. `scaffold-new/`) for isolated builds.
  * Alternatively, move existing folders and assets safely to a backup location before starting to prevent overwriting of custom source files.

## PuTTY Command Line Orchestration (Windows Hosts)

When executing remote deployments from a Windows workspace, the agent must use the PuTTY Command Line Interface (`plink.exe` and `pscp.exe`) for non-interactive execution.

### PuTTY Availability Check and Auto-Installation

Before running any `plink.exe` or `pscp.exe` commands, the agent must verify that PuTTY is installed and reachable on the system PATH. The resolution order is:

1. `Get-Command plink.exe` / `Get-Command pscp.exe` (checks PATH)
2. `C:\Program Files\PuTTY\plink.exe` (standard 64-bit install location)
3. `C:\Program Files (x86)\PuTTY\plink.exe` (standard 32-bit install location)

If PuTTY is not found after all three checks, the agent must attempt automatic installation:

```powershell
winget install --id PuTTY.PuTTY --silent --accept-package-agreements --accept-source-agreements
```

After a successful install, refresh the current session PATH and re-resolve executable paths before continuing.

**If winget is unavailable or the installation fails**, the agent must display the following manual instructions to the user and halt execution:

```
==========================================================
  PuTTY could not be installed automatically.
  Please install it manually using one of the steps below:
==========================================================

  Option 1 -- winget (Windows Package Manager):
    winget install --id PuTTY.PuTTY

  Option 2 -- Official installer:
    1. Visit https://www.putty.org and click 'Download PuTTY'.
    2. Run the MSI installer (putty-<version>-installer.msi).
    3. During setup, ensure 'Add PuTTY to PATH' is checked.

  Option 3 -- Chocolatey:
    choco install putty -y

  After installation, close and reopen your terminal, then
  run this script again.
==========================================================
```

### 1. Verify Remote Connection

* Use `plink.exe` with `-batch`, `-hostkey`, and `-pw` arguments to confirm connectivity:
  `plink.exe -batch -hostkey "SHA256:ServerHostKeyString" -pw "sshPassword" user@targetIP "echo OK"`
* Halt immediately if the exit code indicates connection failure.

### 2. Passwordless SSH Key Installation

* Configure the target host for passwordless future access:
  `plink.exe -batch -hostkey "SHA256:ServerHostKeyString" -pw "sshPassword" user@targetIP "mkdir -p ~/.ssh; grep -qxF 'sshPublicKeyString' ~/.ssh/authorized_keys 2>/dev/null || echo 'sshPublicKeyString' >> ~/.ssh/authorized_keys; chmod 700 ~/.ssh; chmod 600 ~/.ssh/authorized_keys"`

### 3. Folder Copy Operations (pscp.exe)

* Prepare target directories securely:
  `plink.exe -batch -hostkey "SHA256:ServerHostKeyString" -pw "sshPassword" user@targetIP "rm -rf /tmp/my-app-dist && mkdir -p /tmp/my-app-dist"`
* Execute file copies securely:
  `pscp.exe -batch -hostkey "SHA256:ServerHostKeyString" -pw "sshPassword" -r "localDistFolder" user@targetIP:/tmp/my-app-dist`

### 4. Sudo Elevated Command Execution

* Execute administrative scripts on the remote host by feeding passwords securely into the standard input:
  `plink.exe -batch -hostkey "SHA256:ServerHostKeyString" -pw "sshPassword" user@targetIP "echo 'sshPassword' | sudo -S bash /tmp/my-app-dist/setup-lxc.sh"`

## Interactive Pre-Flight Sanity Checks

Prior to initiating any checkout or build tasks, the agent must perform three sequential sanity checks:

### 1. Asset Path Verification

* **Behavior**: Prompt the user: "Have you verified your asset paths are relative? (y/n)".
* **Context**: Explain that subdirectory routing requires relative pathing (e.g. `<img src="./logo.png" />` instead of `<img src="/logo.png" />`) to prevent assets from returning 404 errors.
* **Halt Condition**: If the user does not confirm, abort the deployment to allow asset changes.

### 2. Environment Variables (.env) Injection

* **Behavior**: Prompt the user: "Do you need to inject environment variables for this build? (y/n)".
* **Variable Capture**: If confirmed, prompt the user for the variables formatted for inline bash (e.g. `VITE_API_URL='http://api.internal' VAR2='val'`).

### 3. Target Specifications

* **Parameters**: Gathers project name, routing strategy selection, source path, and target server host keys.

## Headless Browser System Dependencies

* **Verification**: Execute a dry-run check via `npx playwright install-deps --dry-run`.
* **Auto-Installation**: If system libraries are missing, automatically execute `sudo npx playwright install-deps` to install them on the target host.

## Interactive Pre-Flight Execution Summary

Before executing any script actions, making file changes, or initiating file copies, the agent must construct a detailed Markdown confirmation report and present it to the user.

* **Summary Structure**:
  * **Target Environment**: Local or Remote SSH Host Details (IP, Port, Username, PuTTY connection checks).
  * **Routing Strategy**: Dedicated Virtual Host or Shared Host Subdirectory Path.
  * **Target Web Directory**: The destination folder (e.g. `/var/www/my-app`).
  * **Build Settings**: Environment variables to be injected and base path parameters.
  * **Credentials Setup**: Confirmation of `.env` check and variable insertions.
  * **Action Sequence**: Checklist of commands that will be executed in order.
* **User Confirmation Requirement**: Present this summary, halt execution, and wait for explicit user approval to proceed or cancel.

## Dynamic Runtime Conflict Resolution

* **Nginx Domain Name Overlap**: Warn the user, describe the conflict, and prompt them to either abort or change the domain.
* **Target Directory Exists**: Confirm if they wish to overwrite, merge, specify a different project name, or abort.
* **Build Failures**: Present compilation logs and prompt for troubleshooting or cancellation.
* **Permission Denied Logs**: Explain the requirement and prompt to allow sudo or elevated credentials.

## Routing Strategies

### Strategy 1: Dedicated Virtual Host (FQDN / Custom Domain)

* **Configuration Target**: Writes to `/etc/nginx/conf.d/${PROJECT_NAME}.conf`.
* **Behavior**: Maps custom domain names (`SERVER_NAME`) to the target folder. Incorporates location routing falling back to `/index.html` for single-page routing structures.

### Strategy 2: Shared Host Subdirectory Path (IP or Hostname Path)

* **Configuration Target**: Writes to `/etc/nginx/default.d/${PROJECT_NAME}.conf`.
* **Behavior**: Aliases subdirectory requests (e.g. `http://IP_ADDRESS/${PROJECT_NAME}`) to the target folder using `alias ${TARGET_DIR}/;`. Configures fallback location routing to `/${PROJECT_NAME}/index.html` and automatically builds Node.js builds using the base subdirectory argument (`npm run build -- --base=/${PROJECT_NAME}/`).

## Step-by-Step Execution Workflow

The agent must follow this exact sequence:

### 1. Upfront Architectural Prompting

* **Prompts Sequence**:
  * Prompt 1: Ask "How is this LXC hosted: is it dedicated to this one site, or does it share with other apps?"
  * Prompt 2: Ask "How should the site be accessed? (domain/ip, subdomain, or slug)"
  * Prompt 3: Ask "Do you have a domain name to use?"
* Map the responses directly to the target directory paths, Nginx virtual host configurations, and base path settings.

### 2. Credentials File Verification

* Run `.env` sanity verification. Create the file in the project root if missing.
* Read variables. If `ssh_key=` or `ssh_pw=` are absent, append them as empty placeholder lines to prompt the user to fill them.

### 3. Sanity Checks and Parameters

* Execute Asset Path Verification (Sanity Check 1). Abort if not confirmed.
* Execute Environment Variables Injection (Sanity Check 2).
* Gathers target specifications and connection strings (Sanity Check 3).

### 4. Environment Pre-Flight Validation

* Scan the target environment for the required tools: `nginx`, `node`, `npm`, `rsync`, and `git`.
* Verify Playwright native dependencies and execute auto-installs if libraries are missing.
* Scan `/etc/nginx/conf.d` for domain conflicts if Strategy 1 is active.

### 5. Source Fetching and Workspace Preparation

* Clear the local build workspace at `/tmp/deployment-${PROJECT_NAME}`.
* Synchronize or clone files from the source path using safe non-destructive workspace copies.

### 6. Present Pre-Flight Summary

* Build the complete Markdown summary including credentials validation status, safe directory directories, environment variables, Nginx routing strategies, and command actions.
* Present the summary, halt execution, and wait for explicit user approval.

### 7. Safe Subdirectory Compilation

* Run `npm install` and compile:
  * Build in isolated working subdirectories to prevent overwriting existing structures.
  * Prepend captured environment variables securely: `eval "${ENV_INJECTIONS} npm run build -- --base=/${PROJECT_NAME}/"` (for Strategy 2) or `eval "${ENV_INJECTIONS} npm run build"` (for Strategy 1).

### 8. Remote or Local Asset Transfer (PuTTY Orchestration)

* Ensure the target web folder exists.
* Transfer the compiled assets:
  * For local: Sync via `rsync -avz --delete`.
  * For remote Windows host: Run `plink.exe` workspace checks, transfer files via `pscp.exe`, and execute `setup-lxc.sh` using secure piped sudo passwords as shown in `deploy.ps1`.
  * For remote Linux host: Transfer via SSH/SCP tools using key authentication.

### 9. Permissions and Security Contexts

* Set folder permissions recursively to `nginx:nginx` ownership, `755` for directories, `644` for files.
* If SELinux is active, configure contexts to `httpd_sys_content_t` and trigger `restorecon`.

### 10. Nginx Configuration, Validation, and Reload

* Write configuration blocks based on Strategy 1 or Strategy 2.
* Validate configuration via `nginx -t` and reload. Roll back immediately if validation fails.

### 11. Post-Deployment Testing

* Remove build workspace folders.
* Construct target validation URL and run validation checks using Playwright automation.
