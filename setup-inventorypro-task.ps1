powershell
# Set execution policy for this session
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Start transcript to log output
Start-Transcript -Path "task-setup-log.txt" -Append

Write-Host "🔧 Cleaning broken import lines in server/routes.ts..."
$routesPath = "server/routes.ts"
if (Test-Path $routesPath) {
    $cleanedLines = Get-Content $routesPath | Where-Object { $_ -notmatch '^\s*import\s+\.\/' }
    Set-Content -Path $routesPath -Value $cleanedLines
    Write-Host "✅ Cleaned broken import lines."
} else {
    Write-Error "❌ server/routes.ts not found."
    Stop-Transcript
    pause
    exit 1
}

Write-Host "🔧 Building backend with esbuild..."
if (-Not (Test-Path "node_modules/.bin/esbuild.cmd")) {
    Write-Host "📦 Installing esbuild..."
    npm install esbuild --save-dev --legacy-peer-deps
}

if (-Not (Test-Path "dist")) {
    New-Item -ItemType Directory -Path "dist" | Out-Null
}

$buildCommand = "npx esbuild server/index.ts --bundle --outfile=dist/index.js --platform=node --format=esm --external:lightningcss"
try {
    Invoke-Expression $buildCommand
    Write-Host "✅ Backend build completed."
} catch {
    Write-Error "❌ Backend build failed."
    Stop-Transcript
    pause
    exit 1
}

Write-Host "🧹 Removing PM2 if installed..."
npm uninstall -g pm2

Write-Host "🗂️ Setting up Windows Task Scheduler task..."
$taskName = "InventoryProServer"
$nodePath = (Get-Command node).Source
$projectPath = (Get-Location).Path
$scriptPath = "$projectPath\\dist\\index.js"

if (-Not (Test-Path $scriptPath)) {
    Write-Error "❌ dist/index.js not found. Build may have failed."
    Stop-Transcript
    pause
    exit 1
}

$action = New-ScheduledTaskAction -Execute $nodePath -Argument "`"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest
$task = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal

try {
    Register-ScheduledTask -TaskName $taskName -InputObject $task -Force
    Write-Host "✅ Task '$taskName' registered successfully."
} catch {
    Write-Error "❌ Failed to register scheduled task."
    Stop-Transcript
    pause
    exit 1
}

Stop-Transcript
pause
