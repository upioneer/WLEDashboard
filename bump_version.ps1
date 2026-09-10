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

$nodeScript = @"
const fs = require('fs');
const files = [
  'package.json',
  'apps/api/package.json',
  'apps/web/package.json',
  'custom_components/wledashboard/manifest.json'
];
const version = process.argv[1];
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  const json = JSON.parse(content);
  json.version = version;
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log('  Updated ' + file);
}
"@

node -e $nodeScript $Version

Write-Host "Version bumped to $Version" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Create changelog: project_details/changelog/v$Version/readme.md"
Write-Host "  2. git add -A"
Write-Host "  3. git commit -m 'release: v$Version'"
Write-Host "  4. git tag v$Version"
Write-Host "  5. git push && git push origin v$Version"
