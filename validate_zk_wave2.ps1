# ZK Wave 2 Validation Script (PowerShell)
# Tests all implementations for ZK-107, ZK-108, ZK-109, ZK-110

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "ZK Wave 2 Implementation Validation" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$PASS_COUNT = 0
$FAIL_COUNT = 0

function Run-Test {
    param(
        [string]$TestName,
        [string]$TestCommand
    )
    
    Write-Host "Running: $TestName" -ForegroundColor Yellow
    Write-Host "Command: $TestCommand" -ForegroundColor Yellow
    Write-Host "-------------------------------------------" -ForegroundColor Gray
    
    try {
        $output = Invoke-Expression $TestCommand 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ PASSED: $TestName" -ForegroundColor Green
            $script:PASS_COUNT++
        } else {
            Write-Host "✗ FAILED: $TestName" -ForegroundColor Red
            $script:FAIL_COUNT++
        }
    } catch {
        Write-Host "✗ FAILED: $TestName" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        $script:FAIL_COUNT++
    }
    
    Write-Host ""
}

Write-Host "1. Validating ZK-107: SDK Smoke Tests" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Set-Location sdk
Run-Test "SDK Smoke Tests (ZK-107)" "npm run test:smoke 2>&1 | Select-Object -First 50"
Set-Location ..
Write-Host ""

Write-Host "2. Validating ZK-108: Schema Parity Tests" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Set-Location sdk
Run-Test "Schema Parity Tests (ZK-108)" "npm run test:schema-parity 2>&1 | Select-Object -First 50"
Set-Location ..
Write-Host ""

Write-Host "3. Validating ZK-109: Documentation Lint" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Run-Test "Documentation Lint (ZK-109)" "node scripts/lint-zk-docs.mjs 2>&1 | Select-Object -First 50"
Write-Host ""

Write-Host "4. Validating ZK-110: Triage Manifest" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
if (Test-Path "zk-failure-triage.json") {
    Write-Host "✓ PASSED: ZK failure triage manifest exists" -ForegroundColor Green
    $script:PASS_COUNT++
    
    # Validate JSON structure
    try {
        $json = Get-Content "zk-failure-triage.json" -Raw | ConvertFrom-Json
        Write-Host "✓ PASSED: Triage manifest is valid JSON" -ForegroundColor Green
        $script:PASS_COUNT++
    } catch {
        Write-Host "✗ FAILED: Triage manifest has invalid JSON" -ForegroundColor Red
        $script:FAIL_COUNT++
    }
} else {
    Write-Host "✗ FAILED: ZK failure triage manifest not found" -ForegroundColor Red
    $script:FAIL_COUNT++
}
Write-Host ""

Write-Host "5. Validating zk_ticket_check integration" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Run-Test "ZK-107 Ticket Check" "node scripts/zk_ticket_check.mjs --issue-key ZK-107 2>&1 | Select-Object -First 30"
Run-Test "ZK-108 Ticket Check" "node scripts/zk_ticket_check.mjs --issue-key ZK-108 2>&1 | Select-Object -First 30"
Run-Test "ZK-109 Ticket Check" "node scripts/zk_ticket_check.mjs --issue-key ZK-109 2>&1 | Select-Object -First 30"
Run-Test "ZK-110 Ticket Check" "node scripts/zk_ticket_check.mjs --issue-key ZK-110 2>&1 | Select-Object -First 30"
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Validation Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Passed: $PASS_COUNT" -ForegroundColor Green
Write-Host "Failed: $FAIL_COUNT" -ForegroundColor Red
Write-Host ""

if ($FAIL_COUNT -gt 0) {
    Write-Host "Some validations failed. Please review the output above." -ForegroundColor Red
    exit 1
} else {
    Write-Host "All validations passed!" -ForegroundColor Green
    exit 0
}
