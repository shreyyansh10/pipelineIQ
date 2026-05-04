# Docker Build Script with Retry Logic
# Builds all services one at a time to avoid network timeout issues

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Building PaperPilot Docker Images" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue

$services = @(
    @{Name="frontend"; Path="./frontend"},
    @{Name="api-gateway"; Path="./services/api-gateway"},
    @{Name="citation-service"; Path="./services/citation-service"},
    @{Name="paper-service"; Path="./services/paper-service"},
    @{Name="ai-service"; Path="./services/ai-service"},
    @{Name="vector-service"; Path="./services/vector-service"},
    @{Name="auth-service"; Path="./services/auth-service"}
)

$failed = @()
$succeeded = @()

foreach ($service in $services) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Building: $($service.Name)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $maxRetries = 3
    $retryCount = 0
    $success = $false
    
    while ($retryCount -lt $maxRetries -and -not $success) {
        if ($retryCount -gt 0) {
            Write-Host "`nRetry $retryCount of $maxRetries for $($service.Name)..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        }
        
        try {
            docker build -t "paperpilot-$($service.Name):latest" $service.Path
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Successfully built: $($service.Name)" -ForegroundColor Green
                $succeeded += $service.Name
                $success = $true
            } else {
                throw "Build failed with exit code $LASTEXITCODE"
            }
        } catch {
            $retryCount++
            Write-Host "❌ Build failed for $($service.Name): $_" -ForegroundColor Red
            
            if ($retryCount -ge $maxRetries) {
                Write-Host "❌ Max retries reached for $($service.Name)" -ForegroundColor Red
                $failed += $service.Name
            }
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Blue
Write-Host "Build Summary" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue

if ($succeeded.Count -gt 0) {
    Write-Host "`n✅ Successfully built ($($succeeded.Count)):" -ForegroundColor Green
    foreach ($s in $succeeded) {
        Write-Host "  - $s" -ForegroundColor Green
    }
}

if ($failed.Count -gt 0) {
    Write-Host "`n❌ Failed to build ($($failed.Count)):" -ForegroundColor Red
    foreach ($f in $failed) {
        Write-Host "  - $f" -ForegroundColor Red
    }
    Write-Host "`nTroubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Check your internet connection" -ForegroundColor Yellow
    Write-Host "2. Try running: docker system prune -a" -ForegroundColor Yellow
    Write-Host "3. Increase Docker memory to 4GB+" -ForegroundColor Yellow
    Write-Host "4. Run this script again (it will retry failed builds)" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "`n🎉 All services built successfully!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Configure .env file" -ForegroundColor White
    Write-Host "2. Run: docker-compose up -d" -ForegroundColor White
    Write-Host "3. Check logs: docker-compose logs -f" -ForegroundColor White
}
