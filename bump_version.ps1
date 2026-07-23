param (
  [Parameter(Mandatory = $true)]
  [string]$Version
)

# Validate semver format
if ($Version -notmatch '^\d+\.\d+\.\d+$') {
  Write-Error "Invalid version format: '$Version'. Must be major.minor.patch (e.g. 1.2.3)"
  exit 1
}

Write-Host "Bumping version to $Version..." -ForegroundColor Cyan

$files = @(
  "package.json",
  "apps/api/package.json",
  "apps/web/package.json"
)

foreach ($file in $files) {
  if (-not (Test-Path $file)) {
    Write-Warning "File not found, skipping: $file"
    continue
  }
  $json = Get-Content $file -Raw | ConvertFrom-Json
  $json.version = $Version
  $json | ConvertTo-Json -Depth 10 | Set-Content $file -Encoding UTF8
  Write-Host "  Updated $file" -ForegroundColor Green
}

Write-Host "Version bumped to $Version" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Create changelog: project_details/changelog/v$Version/readme.md"
Write-Host "  2. git add -A"
Write-Host "  3. git commit -m 'release: v$Version'"
Write-Host "  4. git tag v$Version"
Write-Host "  5. git push && git push origin v$Version"
