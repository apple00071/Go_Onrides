$filePath = "src\app\(dashboard)\dashboard\bookings\[id]\page.tsx"
$content = Get-Content $filePath
$content = $content -replace "hasPermission\('can_edit_bookings'\)", "hasPermission('manageBookings')"
$content | Set-Content $filePath
Write-Host "Fixed permission checks in booking details page"
