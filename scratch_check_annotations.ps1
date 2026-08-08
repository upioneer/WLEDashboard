$runId = (Invoke-RestMethod -Uri "https://api.github.com/repos/upioneer/WLEDashboard/actions/runs?per_page=1").workflow_runs[0].id
$jobsUrl = "https://api.github.com/repos/upioneer/WLEDashboard/actions/runs/$runId/jobs"
$jobs = Invoke-RestMethod -Uri $jobsUrl
foreach ($job in $jobs.jobs) {
    Write-Host "Job: $($job.name)"
    $annUrl = "https://api.github.com/repos/upioneer/WLEDashboard/check-runs/$($job.id)/annotations"
    $ann = Invoke-RestMethod -Uri $annUrl
    $ann | ConvertTo-Json
}
