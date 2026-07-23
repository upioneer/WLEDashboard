# deploy/deploy.ps1
# Generic robust orchestrator that reads credentials from ../.env and deploys to remote Linux LXC
# Uses plink/pscp (PuTTY CLI) with absolute path resolution and array splatting for secure automation

$ErrorActionPreference = "Stop"

# ── Load and Self-Heal .env Configuration ────────────────────
$envFile = Join-Path $PSScriptRoot "../.env"

# Auto-create .env file if it does not exist
if (-not (Test-Path $envFile)) {
    Write-Host "==> Config file .env not found. Creating a fresh .env template at root..."
    $envTemplate = @"
# ── REMOTE SSH DEPLOYMENT PARAMETERS ───────────────────────────
SSH_HOST=
SSH_PORT=22
SSH_USER=
SSH_PW=
SSH_KEY=
SSH_HOST_KEY=
PROJECT_NAME=test-site
TARGET_DIR=/var/www/test-site
VITE_API_URL=
"@
    Set-Content -Path $envFile -Value $envTemplate -Force
    Write-Warning ".env template created successfully at project root! Please populate it with your SSH credentials and run the script again."
    throw "Please populate the new .env file before running deployment."
}

# Verify required keys are present and append them if missing
$content = Get-Content $envFile -Raw
$requiredKeys = @("SSH_HOST", "SSH_PORT", "SSH_USER", "SSH_PW", "SSH_KEY", "SSH_HOST_KEY", "PROJECT_NAME", "TARGET_DIR")
$missingLines = @()

foreach ($key in $requiredKeys) {
    if ($content -notmatch "(?m)^${key}=") {
        $missingLines += "${key}="
    }
}

if ($missingLines.Count -gt 0) {
    Write-Host "==> Appending missing configuration keys to your .env file..."
    Add-Content -Path $envFile -Value "`n# Automatically added missing parameters:"
    foreach ($line in $missingLines) {
        Add-Content -Path $envFile -Value $line
    }
    Write-Warning "Appended missing keys to your .env file: $($missingLines -join ', '). Please check the .env file and run the script again."
    throw "Please populate the newly appended .env keys before proceeding."
}

# ── Verify .env is listed in .gitignore ────────────────────────
$gitignoreFile = Join-Path $PSScriptRoot "../.gitignore"
if (-not (Test-Path $gitignoreFile)) {
    Write-Host "==> Gitignore file not found. Creating a fresh .gitignore at root..."
    Set-Content -Path $gitignoreFile -Value ".env" -Force
} else {
    $gitignoreContent = Get-Content $gitignoreFile -Raw
    if ($gitignoreContent -notmatch "(?m)^\.env\b") {
        Write-Host "==> Adding .env to your .gitignore to protect credentials..."
        Add-Content -Path $gitignoreFile -Value "`n# Protect sensitive credentials:`n.env"
    }
}

$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match "^([^=]+)=(.+)$") {
        $envVars[$matches[1].Trim()] = $matches[2].Trim()
    }
}

$hostName = $envVars["SSH_HOST"]
$user = $envVars["SSH_USER"]
$pw = $envVars["SSH_PW"]
$pubKey = $envVars["SSH_KEY"]
$hk = $envVars["SSH_HOST_KEY"]
$port = $envVars["SSH_PORT"]
$projectName = if ($envVars["PROJECT_NAME"]) { $envVars["PROJECT_NAME"] } else { "test-site" }

if ([string]::IsNullOrEmpty($user) -or [string]::IsNullOrEmpty($pw) -or [string]::IsNullOrEmpty($hostName)) {
    throw "Please configure SSH_HOST, SSH_USER, and SSH_PW variables in your .env file."
}

# Separate host target from username to prevent double-@ parser conflicts
$target = $hostName
$userArg = @("-l", $user)
$portArg = if ($port) { @("-P", $port) } else { @() }
$hkArg = if ($hk) { @("-hostkey", $hk) } else { @() }
$scpPortArg = if ($port) { @("-P", $port) } else { @() }

# PuTTY executables search sequence
$plink = "plink.exe"
$pscp = "pscp.exe"

# Resolve full absolute paths via Get-Command to bypass local Test-Path scope issues
$plinkCmd = Get-Command $plink -ErrorAction SilentlyContinue
$pscpCmd = Get-Command $pscp -ErrorAction SilentlyContinue

if ($plinkCmd -and $pscpCmd) {
    $plink = $plinkCmd.Source
    $pscp = $pscpCmd.Source
} else {
    # Fallback check standard 64-bit installation folder
    $plink = "C:\Program Files\PuTTY\plink.exe"
    $pscp = "C:\Program Files\PuTTY\pscp.exe"
}

if (-not (Test-Path $plink)) {
    # Fallback check standard 32-bit installation folder
    $plink = "C:\Program Files (x86)\PuTTY\plink.exe"
    $pscp = "C:\Program Files (x86)\PuTTY\pscp.exe"
}

if (-not (Test-Path $plink)) {
    Write-Warning "PuTTY executables (plink.exe/pscp.exe) not found. Attempting automatic installation via winget..."

    $winget = Get-Command winget -ErrorAction SilentlyContinue
    $installSuccess = $false

    if ($winget) {
        try {
            winget install --id PuTTY.PuTTY --silent --accept-package-agreements --accept-source-agreements
            if ($LASTEXITCODE -eq 0) {
                Write-Host "==> PuTTY installed successfully. Re-resolving executable paths..."
                # Refresh PATH for the current session so newly installed executables are visible
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
                $plinkCmd = Get-Command plink.exe -ErrorAction SilentlyContinue
                $pscpCmd  = Get-Command pscp.exe  -ErrorAction SilentlyContinue
                if ($plinkCmd -and $pscpCmd) {
                    $plink = $plinkCmd.Source
                    $pscp  = $pscpCmd.Source
                    $installSuccess = $true
                } else {
                    # winget install succeeded but PATH still needs a new shell -- fall through to manual instructions
                    $plink = "C:\Program Files\PuTTY\plink.exe"
                    $pscp  = "C:\Program Files\PuTTY\pscp.exe"
                    if (Test-Path $plink) { $installSuccess = $true }
                }
            }
        } catch {
            Write-Warning "winget install encountered an error: $_"
        }
    } else {
        Write-Warning "winget is not available on this system."
    }

    if (-not $installSuccess) {
        Write-Host ""
        Write-Host "=========================================================="
        Write-Host "  PuTTY could not be installed automatically."
        Write-Host "  Please install it manually using one of the steps below:"
        Write-Host "=========================================================="
        Write-Host ""
        Write-Host "  Option 1 -- winget (Windows Package Manager):"
        Write-Host "    winget install --id PuTTY.PuTTY"
        Write-Host ""
        Write-Host "  Option 2 -- Official installer:"
        Write-Host "    1. Visit https://www.putty.org and click 'Download PuTTY'."
        Write-Host "    2. Run the MSI installer (putty-<version>-installer.msi)."
        Write-Host "    3. During setup, ensure 'Add PuTTY to PATH' is checked."
        Write-Host ""
        Write-Host "  Option 3 -- Chocolatey:"
        Write-Host "    choco install putty -y"
        Write-Host ""
        Write-Host "  After installation, close and reopen your terminal, then"
        Write-Host "  run this script again."
        Write-Host "=========================================================="
        Write-Host ""
        throw "PuTTY (plink.exe / pscp.exe) not found. See manual instructions above."
    }
}

Write-Host "==> 1. Verifying remote connection to ${hostName}..."
& $plink -batch $portArg $hkArg $userArg -pw $pw $target "echo connection_ok" 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "Connection to target host failed. Verify hostname, credentials, or target port."
}
Write-Host "    [Connection Success]"

# Optional passwordless key installation
if (-not [string]::IsNullOrEmpty($pubKey)) {
    Write-Host "==> 2. Installing SSH key for automated future authentications..."
    & $plink -batch $portArg $hkArg $userArg -pw $pw $target "mkdir -p ~/.ssh; grep -qxF '$pubKey' ~/.ssh/authorized_keys 2>/dev/null || echo '$pubKey' >> ~/.ssh/authorized_keys; chmod 700 ~/.ssh; chmod 600 ~/.ssh/authorized_keys; echo key_ok"
}

Write-Host "==> 3. Copying storefront distribution assets to /tmp..."
& $plink -batch $portArg $hkArg $userArg -pw $pw $target "rm -rf /tmp/${projectName}-dist && mkdir -p /tmp/${projectName}-dist"
& $pscp -batch $scpPortArg $hkArg $userArg -pw $pw -r "$PSScriptRoot/../dist" "${target}:/tmp/${projectName}-dist"
if ($LASTEXITCODE -ne 0) {
    throw "Asset transfer to remote target host failed."
}

Write-Host "==> 4. Copying deployment setup scripts to /tmp..."
& $plink -batch $portArg $hkArg $userArg -pw $pw $target "rm -rf /tmp/${projectName}-deploy && mkdir -p /tmp/${projectName}-deploy"
& $pscp -batch $scpPortArg $hkArg $userArg -pw $pw -r "$PSScriptRoot" "${target}:/tmp/${projectName}-deploy"
if ($LASTEXITCODE -ne 0) {
    throw "Deployment script transfer to remote target host failed."
}

Write-Host "==> 5. Launching elevated Nginx setup script on ${hostName}..."
# Triggers setup-lxc.sh using elevated sudo credentials securely
& $plink -batch $portArg $hkArg $userArg -pw $pw $target "echo '$pw' | sudo -S bash /tmp/${projectName}-deploy/deploy/setup-lxc.sh"
if ($LASTEXITCODE -ne 0) {
    throw "Remote deployment setup script execution failed."
}

Write-Host ""
Write-Host "$(([char]0x1F389)) Deployment completed successfully!"
Write-Host "   Access URL: http://${hostName}/${projectName}/"
Write-Host ""