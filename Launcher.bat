@echo off
setlocal enabledelayedexpansion

:: Inventory Pro Launcher Script
:: This script automates the setup and service configuration of Inventory-Pro
:: Requirements: Windows 10/11, Node.js pre-installed on the system

title Inventory Pro Launcher
color 0B
echo.
echo ========================================================
echo          Inventory Pro Launcher v1.0
echo ========================================================
echo.
echo Starting automated installation and setup...
echo.

:: Set script directory as working directory
cd /d "%~dp0"
set "SCRIPT_DIR=%~dp0"
set "LOG_FILE=%SCRIPT_DIR%launcher.log"
set "APP_NAME=inventory-pro"
set "APP_PORT=5000"
set "APP_URL=http://localhost:%APP_PORT%"

:: Flag to track environment refresh - prevents infinite loops
set "ENV_REFRESHED=0"

:: Initialize log file
echo [%DATE% %TIME%] Inventory Pro Launcher started > "%LOG_FILE%"

:: Function to log messages
call :log "Starting Inventory Pro Launcher"

call :log_step "[1/6] Checking Node.js installation..."
call :check_nodejs
set "NODE_CHECK_RESULT=!errorlevel!"
if !NODE_CHECK_RESULT! neq 0 (
    echo   ✗ Node.js not found or not functional
    call :report_error "Node.js check failed" "!NODE_CHECK_RESULT!" "Install Node.js from https://nodejs.org/ or ensure it's properly configured"
    goto :error_exit
) else (
    echo   ✓ Node.js installation verified successfully
    call :log_success "Node.js installation verified successfully"
)

call :log_step "[2/6] Installing Node.js modules..."
call :install_modules
if !errorlevel! neq 0 (
    call :report_error "Node modules installation failed" "!errorlevel!" "Check internet connection and npm configuration"
    goto :error_exit
)

call :log_step "[3/6] Configuring PM2 service..."
call :configure_pm2
if !errorlevel! neq 0 (
    call :report_error "PM2 configuration failed" "!errorlevel!" "Ensure npm is working and try installing PM2 manually: npm install -g pm2"
    goto :error_exit
)

call :log_step "[4/6] Updating dependencies..."
call :update_dependencies
if !errorlevel! neq 0 (
    call :report_error "Dependency update failed" "!errorlevel!" "Check package.json and network connectivity"
    goto :error_exit
)

call :log_step "[5/6] Building and starting application..."
call :build_and_start
if !errorlevel! neq 0 (
    call :report_error "Application build/start failed" "!errorlevel!" "Check build logs and ensure all dependencies are installed"
    goto :error_exit
)

call :log_step "[6/6] Launching application..."
call :launch_application
if !errorlevel! neq 0 (
    call :report_error "Application launch failed" "!errorlevel!" "Check if browser is available and application is running"
    goto :error_exit
)

call :success_message
goto :end

:: ============================
:: Function: Check Node.js
:: ============================
:check_nodejs
call :log "Checking Node.js installation"
echo   Checking for Node.js...

:: Check if Node.js is installed using where command
where node >nul 2>&1
set "WHERE_NODE_RESULT=!errorlevel!"

:: Check if Node.js is functional using version command
node --version >nul 2>&1
set "NODE_CMD_RESULT=!errorlevel!"

:: Both checks must pass for Node.js to be considered available
if !WHERE_NODE_RESULT! equ 0 (
    if !NODE_CMD_RESULT! equ 0 (
        for /f "tokens=*" %%i in ('node --version 2^>nul') do set "NODE_VERSION=%%i"
        if defined NODE_VERSION (
            echo   ✓ Node.js found: !NODE_VERSION!
            call :log "Node.js found: !NODE_VERSION!"
            
            :: Get Node.js path
            for /f "tokens=*" %%a in ('where node 2^>nul') do (
                set "NODE_PATH=%%a"
                echo   ✓ Node.js path: !NODE_PATH!
                call :log "Node.js path: !NODE_PATH!"
            )
            
            :: Validate Node.js version
            call :validate_node_version "!NODE_VERSION!"
            set "VERSION_CHECK_RESULT=!errorlevel!"
            if !VERSION_CHECK_RESULT! neq 0 (
                echo   ⚠ Node.js version !NODE_VERSION! validation failed
                echo   ⚠ The application may not work correctly, but will continue anyway
                call :log "Node.js version !NODE_VERSION! validation failed, continuing"
            ) else (
                echo   ✓ Node.js version !NODE_VERSION! is compatible
                call :log "Node.js version !NODE_VERSION! is compatible"
            )
        ) else (
            echo   ✗ Node.js command succeeded but version not detected
            call :log "Node.js command succeeded but version not detected"
            call :nodejs_not_found_message
            exit /b 1
        )
        
        :: Check npm availability (critical for functionality)
        call :check_npm
        set "NPM_CHECK_RESULT=!errorlevel!"
        if !NPM_CHECK_RESULT! neq 0 (
            echo   ✗ npm verification failed, cannot continue
            call :log "npm verification failed, cannot continue"
            call :nodejs_not_found_message
            exit /b 1
        )
        
        call :log "Node.js and npm verification completed successfully"
        exit /b 0
    ) else (
        echo   ✗ Node.js found in PATH but not functional (exit code: !NODE_CMD_RESULT!)
        call :log "Node.js found in PATH but not functional with exit code: !NODE_CMD_RESULT!"
        call :nodejs_not_found_message
        exit /b 1
    )
) else (
    echo   ✗ Node.js not found in system PATH
    call :log "Node.js not found in system PATH"
    call :nodejs_not_found_message
    exit /b 1
)

:check_npm
call :log "Checking npm installation"
echo   Verifying npm availability...

:: First check if npm command exists
where npm >nul 2>&1
if !errorlevel! neq 0 (
    echo   ✗ npm command not found in PATH
    call :log "npm command not found in PATH"
    call :log "Current PATH: !PATH!"
    
    :: Try to refresh environment variables (only once)
    if !ENV_REFRESHED! equ 0 (
        call :refresh_env
        
        :: Check again after refresh
        where npm >nul 2>&1
        if !errorlevel! neq 0 (
            echo   ✗ npm still not found after environment refresh
            call :log "npm still not found after environment refresh"
            exit /b 1
        )
    ) else (
        echo   ✗ npm not found and environment already refreshed
        call :log "npm not found and environment already refreshed"
        exit /b 1
    )
)

:: Check if npm is functional
npm --version >nul 2>&1
if !errorlevel! equ 0 (
    for /f "tokens=*" %%i in ('npm --version') do set "NPM_VERSION=%%i"
    echo   ✓ npm found and functional: v!NPM_VERSION!
    call :log "npm found and functional: v!NPM_VERSION!"
    
    :: Validate npm version (should be reasonably recent)
    call :validate_npm_version "!NPM_VERSION!"
    set "NPM_VERSION_CHECK=!errorlevel!"
    if !NPM_VERSION_CHECK! neq 0 (
        echo   ⚠ npm version !NPM_VERSION! is quite old, consider updating
        call :log "npm version !NPM_VERSION! is quite old but acceptable"
    ) else (
        echo   ✓ npm version !NPM_VERSION! is acceptable
        call :log "npm version !NPM_VERSION! is acceptable"
    )
    
    call :log "npm verification successful"
    exit /b 0
) else (
    echo   ✗ npm found but not functional
    call :log "npm found but not functional"
    
    :: Try to get more detailed error information
    npm --version 2>&1 | findstr /r ".*" > "%TEMP%\npm_error.txt"
    if exist "%TEMP%\npm_error.txt" (
        echo   npm error details:
        type "%TEMP%\npm_error.txt"
        call :log "npm error details:"
        for /f "tokens=*" %%i in ('type "%TEMP%\npm_error.txt"') do call :log "  %%i"
        del "%TEMP%\npm_error.txt"
    )
    
    exit /b 1
)

:: ============================
:: Function: Node.js Not Found Message
:: ============================
:nodejs_not_found_message
echo.
echo ========================================================
echo          Node.js Installation Required
echo ========================================================
echo.
echo ✗ Node.js was not found on your system.
echo   Node.js is required to run Inventory Pro.
echo.
echo Please install Node.js before running this application:
echo.
echo   1. Visit: https://nodejs.org/
echo   2. Download the LTS version for Windows
echo   3. Run the installer with default settings
echo   4. Restart this script after installation
echo.
echo Recommended version: Node.js LTS (Latest Long Term Support)
echo Minimum version: Node.js v16.0.0
echo.
echo After installation, you can verify it works by running:
echo   node --version
echo   npm --version
echo.
call :log "Node.js not found message displayed to user"
goto :eof


:: ============================
:: Function: Install Modules
:: ============================
:install_modules
call :log "Checking and installing Node.js modules"
echo   Checking for node_modules...

if exist "%SCRIPT_DIR%node_modules" (
    echo   ✓ node_modules directory found
    call :log "node_modules directory found"
    
    :: Check if package.json has been modified
    if exist "%SCRIPT_DIR%package-lock.json" (
        for /f %%i in ('powershell -Command "Get-Date (Get-Item '%SCRIPT_DIR%package.json').LastWriteTime -Format 'yyyyMMddHHmmss'"') do set "PKG_DATE=%%i"
        for /f %%i in ('powershell -Command "Get-Date (Get-Item '%SCRIPT_DIR%package-lock.json').LastWriteTime -Format 'yyyyMMddHHmmss'"') do set "LOCK_DATE=%%i"
        
        if !PKG_DATE! gtr !LOCK_DATE! (
            echo   ⚠ package.json is newer than package-lock.json, updating modules...
            call :log "package.json is newer, updating modules"
            goto :run_npm_install
        )
    )
    
    echo   ✓ Modules appear to be up to date
    call :log "Modules appear to be up to date"
    exit /b 0
) else (
    echo   ✗ node_modules not found
    call :log "node_modules not found"
)

:run_npm_install
echo   Installing Node.js modules...
echo   This may take several minutes...

call :log "Running npm install"
npm install --no-audit --no-fund 2>&1 | tee -a "%LOG_FILE%"

if !errorlevel! equ 0 (
    echo   ✓ Node.js modules installed successfully
    call :log "Node.js modules installed successfully"
    exit /b 0
) else (
    echo   ✗ Failed to install Node.js modules
    call :log "Failed to install Node.js modules"
    echo   Please check your internet connection and try again.
    exit /b 1
)

:: ============================
:: Function: Configure PM2
:: ============================
:configure_pm2
call :log "Configuring PM2 service"
echo   Configuring PM2 service...

:: Check if PM2 is already installed
pm2 --version >nul 2>&1
if !errorlevel! neq 0 (
    echo   Installing PM2 globally...
    call :log "Installing PM2 globally"
    npm install -g pm2 2>&1 | tee -a "%LOG_FILE%"
    
    if !errorlevel! neq 0 (
        echo   ✗ Failed to install PM2
        call :log "Failed to install PM2"
        exit /b 1
    )
    
    :: Refresh environment
    if !ENV_REFRESHED! equ 0 (
        call :refresh_env
    ) else (
        echo   ✓ Environment already refreshed, skipping
        call :log "Environment already refreshed, skipping"
    )
)

for /f "tokens=*" %%i in ('pm2 --version') do set "PM2_VERSION=%%i"
echo   ✓ PM2 found: !PM2_VERSION!
call :log "PM2 found: !PM2_VERSION!"

:: Create PM2 ecosystem file
echo   Creating PM2 configuration...
call :log "Creating PM2 ecosystem file"

(
echo module.exports = {
echo   apps: [{
echo     name: '!APP_NAME!',
echo     script: 'dist/index.js',
echo     cwd: '%SCRIPT_DIR%',
echo     env: {
echo       NODE_ENV: 'production',
echo       PORT: !APP_PORT!
echo     },
echo     instances: 1,
echo     autorestart: true,
echo     watch: false,
echo     max_memory_restart: '1G',
echo     error_file: './logs/err.log',
echo     out_file: './logs/out.log',
echo     log_file: './logs/combined.log',
echo     time: true
echo   }]
echo };
) > "%SCRIPT_DIR%ecosystem.config.js"

echo   ✓ PM2 configuration created
call :log "PM2 ecosystem file created"

:: Create logs directory
if not exist "%SCRIPT_DIR%logs" mkdir "%SCRIPT_DIR%logs"

:: Install PM2 startup service
echo   Setting up PM2 startup service...
call :log "Setting up PM2 startup service"
pm2 startup >nul 2>&1
pm2 save >nul 2>&1

echo   ✓ PM2 service configured
call :log "PM2 service configured successfully"
exit /b 0

:: ============================
:: Function: Update Dependencies
:: ============================
:update_dependencies
call :log "Updating dependencies"
echo   Updating dependencies...

:: Update npm first
echo   Updating npm to latest version...
call :log "Updating npm to latest version"
npm install -g npm@latest 2>&1 | tee -a "%LOG_FILE%"

if !errorlevel! neq 0 (
    echo   ⚠ npm update failed, continuing with current version
    call :log "npm update failed, continuing with current version"
)

:: Create list of UI/styling packages to exclude from updates
set "EXCLUDE_PACKAGES=@radix-ui @tailwindcss tailwindcss tailwind-merge tailwindcss-animate next-themes @vitejs/plugin-react vite postcss autoprefixer"

echo   Checking for outdated packages...
call :log "Checking for outdated packages"

:: Get list of outdated packages (excluding UI packages)
for /f "skip=1 tokens=1" %%i in ('npm outdated --json 2^>nul ^| findstr /v "!EXCLUDE_PACKAGES!"') do (
    set "PACKAGE=%%i"
    if not "!PACKAGE!"=="" (
        echo   Updating !PACKAGE!...
        call :log "Updating package: !PACKAGE!"
        npm update "!PACKAGE!" --save 2>&1 | tee -a "%LOG_FILE%"
    )
)

:: Pin critical dependencies
echo   Pinning critical dependencies...
call :log "Pinning critical dependencies"
npm install --save-exact express@^4.21.2 2>nul
npm install --save-exact react@^18.3.1 2>nul
npm install --save-exact typescript@5.6.3 2>nul

echo   ✓ Dependencies updated successfully
call :log "Dependencies updated successfully"
exit /b 0

:: ============================
:: Function: Build and Start
:: ============================
:build_and_start
call :log "Building and starting application"
echo   Building application...

:: Clean previous build if it exists
if exist "%SCRIPT_DIR%dist" (
    echo   Cleaning previous build...
    call :log "Cleaning previous build directory"
    rmdir /s /q "%SCRIPT_DIR%dist" 2>nul
)

call :log "Running npm run build"
npm run build 2>&1 | tee -a "%LOG_FILE%"

if !errorlevel! neq 0 (
    echo   ✗ Build failed
    call :log "Build failed with exit code !errorlevel!"
    exit /b 1
)

:: Verify build output exists and is valid
call :verify_build_output
if !errorlevel! neq 0 (
    echo   ✗ Build verification failed
    call :log "Build verification failed"
    exit /b 1
)

echo   ✓ Application built and verified successfully
call :log "Application built and verified successfully"

:: Stop existing PM2 process if running
echo   Stopping any existing instances...
call :log "Stopping existing PM2 instances"
pm2 stop !APP_NAME! >nul 2>&1
pm2 delete !APP_NAME! >nul 2>&1

:: Start application with PM2
echo   Starting application with PM2...
call :log "Starting application with PM2"
pm2 start ecosystem.config.js 2>&1 | tee -a "%LOG_FILE%"

if !errorlevel! neq 0 (
    echo   ✗ Failed to start application
    call :log "Failed to start application with PM2, exit code: !errorlevel!"
    exit /b 1
)

:: Verify PM2 process is running
call :verify_pm2_health
if !errorlevel! neq 0 (
    echo   ✗ PM2 health check failed
    call :log "PM2 health check failed"
    exit /b 1
)

:: Save PM2 configuration
pm2 save >nul 2>&1
call :log "PM2 configuration saved"

echo   ✓ Application started and verified successfully
call :log "Application started and verified successfully"

:: Comprehensive application health check
call :verify_application_health
set "HEALTH_CHECK_RESULT=!errorlevel!"
if !HEALTH_CHECK_RESULT! equ 0 (
    echo   ✓ Application health check passed
    call :log "Application health check passed"
    exit /b 0
) else (
    echo   ⚠ Application health check failed, but PM2 service is running
    call :log "Application health check failed with exit code !HEALTH_CHECK_RESULT!"
    echo   ⚠ The service may still be starting up or there may be configuration issues
    echo   ⚠ Check logs with: pm2 logs !APP_NAME!
    exit /b 0
)

:: ============================
:: Function: Launch Application
:: ============================
:launch_application
call :log "Launching application in browser"
echo   Opening application in default browser...

:: Open browser
start "" "!APP_URL!"

:: Wait a moment for browser to open
timeout /t 3 >nul

echo   ✓ Application launched in browser
call :log "Application launched in browser"
exit /b 0

:: ============================
:: Function: Success Message
:: ============================
:success_message
call :log "Installation completed successfully"
echo.
echo ========================================================
echo          Installation Completed Successfully!
echo ========================================================
echo.
echo ✓ Node.js is installed and configured
echo ✓ All dependencies are installed
echo ✓ PM2 service is configured and running
echo ✓ Application is built and started
echo ✓ Browser launched with application
echo.
echo Application Details:
echo   Name: !APP_NAME!
echo   URL: !APP_URL!
echo   Status: Running as a service
echo.
echo Useful Commands:
echo   View logs: pm2 logs !APP_NAME!
echo   Restart: pm2 restart !APP_NAME!
echo   Stop: pm2 stop !APP_NAME!
echo   Status: pm2 status
echo.
echo The application will automatically start on system boot.
echo.
echo Press any key to exit...
pause >nul
goto :end

:: ============================
:: Function: Error Exit
:: ============================
:error_exit
call :report_error "Installation process failed" "%errorlevel%" "Check the detailed error report and log files"

echo Common troubleshooting steps:
echo   1. Ensure Node.js is installed (visit https://nodejs.org/)
echo   2. Run as Administrator  
echo   3. Check internet connection
echo   4. Verify antivirus is not blocking the installation
echo   5. Try running the script again
echo   6. Check Windows User Account Control settings
echo.
echo For advanced troubleshooting:
echo   • Review the error report generated above
echo   • Check PM2 logs if PM2 was installed: pm2 logs %APP_NAME%
echo   • Verify system requirements and permissions
echo.
echo Press any key to exit...
pause >nul
goto :end

:: ============================
:: Utility Functions
:: ============================
:log
echo [%DATE% %TIME%] %~1 >> "%LOG_FILE%"
goto :eof

:log_error
echo [%DATE% %TIME%] ERROR: %~1 >> "%LOG_FILE%"
echo [%DATE% %TIME%] ERROR: %~1
goto :eof

:log_warning
echo [%DATE% %TIME%] WARNING: %~1 >> "%LOG_FILE%"
echo [%DATE% %TIME%] WARNING: %~1
goto :eof

:log_success
echo [%DATE% %TIME%] SUCCESS: %~1 >> "%LOG_FILE%"
goto :eof

:log_step
echo [%DATE% %TIME%] STEP: %~1 >> "%LOG_FILE%"
echo.
echo ========================================================
echo %~1
echo ========================================================
goto :eof

:: ============================
:: Function: Enhanced Error Reporting  
:: ============================
:report_error
set "ERROR_MSG=%~1"
set "ERROR_CODE=%~2"
set "SUGGESTED_ACTION=%~3"

call :log_error "!ERROR_MSG! (Exit Code: !ERROR_CODE!)"

echo.
echo ========================================================
echo          Error Occurred
echo ========================================================
echo.
echo ✗ Error: !ERROR_MSG!
echo   Exit Code: !ERROR_CODE!
if not "!SUGGESTED_ACTION!"=="" (
    echo   Suggested Action: !SUGGESTED_ACTION!
)
echo.
echo Log file location: %LOG_FILE%
echo.

:: Generate error report
call :generate_error_report "!ERROR_MSG!" "!ERROR_CODE!"

goto :eof

:generate_error_report
set "ERROR_MSG=%~1"  
set "ERROR_CODE=%~2"
set "ERROR_REPORT_FILE=%SCRIPT_DIR%error_report_%DATE:~0,4%%DATE:~5,2%%DATE:~8,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%.txt"

(
echo Inventory Pro Launcher - Error Report
echo Generated: %DATE% %TIME%
echo ================================================
echo.
echo Error Details:
echo   Message: !ERROR_MSG!
echo   Exit Code: !ERROR_CODE!
echo   Script Directory: %SCRIPT_DIR%
echo   Log File: %LOG_FILE%
echo.
echo System Information:
echo   OS Version: %OS%
echo   Computer Name: %COMPUTERNAME%
echo   Username: %USERNAME%
echo   Current Path: %PATH%
echo.
echo Node.js Information:
node --version 2>&1 || echo   Node.js: Not available
npm --version 2>&1 || echo   npm: Not available
echo.
echo PM2 Information:
pm2 --version 2>&1 || echo   PM2: Not available
pm2 list 2>&1 || echo   PM2 Process List: Not available
echo.
echo Port Information:
netstat -an | findstr ":5000 " || echo   Port 5000: Not listening
echo.
echo Last 10 lines of launcher log:
echo --------------------------------
if exist "%LOG_FILE%" (
    powershell -Command "Get-Content '%LOG_FILE%' | Select-Object -Last 10"
) else (
    echo   Log file not found
)
echo.
) > "%ERROR_REPORT_FILE%"

call :log "Error report generated: %ERROR_REPORT_FILE%"
echo Error report saved to: %ERROR_REPORT_FILE%
goto :eof

:: ============================
:: Function: Check Version
:: ============================
:check_version
set "version=%~1"
call :log "Checking version: %version%"

:: Handle empty version string
if "!version!"=="" (
    call :log "Empty version string provided"
    set "NODE_VERSION_OK=0"
    exit /b 1
)

:: Remove 'v' prefix if present
set "version=!version:v=!"
call :log "Version string after removing v prefix: !version!"

:: Parse version into major, minor, patch
for /f "tokens=1,2,3 delims=." %%a in ("!version!") do (
    set "major=%%a"
    set "minor=%%b"
    set "patch=%%c"
)

:: Validate major version is numeric
echo !major! | findstr /r "^[0-9][0-9]*$" >nul
if !errorlevel! neq 0 (
    call :log "Invalid major version format: !major!"
    set "NODE_VERSION_OK=0"
    exit /b 1
)

call :log "Parsed version - Major: !major!, Minor: !minor!, Patch: !patch!"

:: Version compatibility check
set "MIN_MAJOR=16"
set "MAX_MAJOR=24"

if !major! geq !MIN_MAJOR! (
    if !major! leq !MAX_MAJOR! (
        echo [%date% %time%] Node.js version !version! is compatible
        call :log "Node.js version !version! is compatible"
        set "NODE_VERSION_OK=1"
    ) else (
        echo [%date% %time%] Warning: Node.js version !version! is newer than recommended
        call :log "Warning: Node.js version !version! is newer than recommended"
        set "NODE_VERSION_OK=1"
    )
) else (
    echo [%date% %time%] Warning: Node.js version !version! is older than recommended
    call :log "Warning: Node.js version !version! is older than recommended"
    set "NODE_VERSION_OK=1"
)

exit /b 0

:refresh_env
:: Refresh environment variables - execute only once per script run
if !ENV_REFRESHED! equ 1 (
    echo   ✓ Environment variables already refreshed
    call :log "Environment refresh skipped - already completed"
    goto :eof
)

call :log "Refreshing environment variables (single execution)"
echo   Refreshing environment variables...

:: Mark as refreshed to prevent infinite loops
set "ENV_REFRESHED=1"

:: Use PowerShell to refresh environment variables reliably
powershell -Command "try { $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User'); Write-Host 'Environment variables refreshed successfully'; exit 0 } catch { Write-Warning 'Failed to refresh environment variables'; exit 1 }" 2>nul
set "REFRESH_RESULT=!errorlevel!"

if !REFRESH_RESULT! equ 0 (
    :: Get updated PATH from PowerShell
    for /f "tokens=*" %%i in ('powershell -Command "[Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')" 2^>nul') do (
        set "PATH=%%i"
    )
    echo   ✓ Environment variables refreshed successfully
    call :log "Environment variables refreshed successfully"
) else (
    echo   ⚠ Environment refresh encountered issues, but continuing
    call :log "Environment refresh encountered issues, but continuing"
)

call :log "Environment refresh completed with result: !REFRESH_RESULT!"
call :log "Updated PATH: !PATH!"
goto :eof

:validate_node_version
:: Validate Node.js version using improved check_version function
set "VERSION_STR=%~1"
call :log "Validating Node.js version: %VERSION_STR%"

:: Use the new check_version function
call :check_version "%VERSION_STR%"
set "CHECK_RESULT=!errorlevel!"

:: Return the result and NODE_VERSION_OK status
if !CHECK_RESULT! equ 0 (
    if "!NODE_VERSION_OK!"=="1" (
        call :log "Node.js version validation passed with NODE_VERSION_OK=1"
        exit /b 0
    ) else (
        call :log "Node.js version validation failed with NODE_VERSION_OK=!NODE_VERSION_OK!"
        exit /b 1
    )
) else (
    call :log "Node.js version validation failed with exit code !CHECK_RESULT!"
    exit /b 1
)
goto :eof

:validate_npm_version
:: Validate npm version (warn if below v6)
set "NPM_VERSION_STR=%~1"
call :log "Validating npm version: %NPM_VERSION_STR%"

:: Handle empty version string
if "!NPM_VERSION_STR!"=="" (
    call :log "Empty npm version string provided"
    exit /b 1
)

:: Extract major version number
for /f "tokens=1 delims=." %%a in ("!NPM_VERSION_STR!") do set "NPM_MAJOR_VERSION=%%a"

:: Validate that we got a numeric major version
echo !NPM_MAJOR_VERSION! | findstr /r "^[0-9][0-9]*$" >nul
if !errorlevel! neq 0 (
    call :log "Invalid npm major version format: !NPM_MAJOR_VERSION!"
    exit /b 1
)

call :log "Extracted npm major version: !NPM_MAJOR_VERSION!"

:: Check if major version is 6 or higher (v6 was released in 2018)
if !NPM_MAJOR_VERSION! geq 6 (
    call :log "npm version validation passed: v!NPM_MAJOR_VERSION! >= v6"
    exit /b 0
) else (
    call :log "npm version validation warning: v!NPM_MAJOR_VERSION! < v6 (old but may work)"
    exit /b 1
)
goto :eof

:: ============================
:: Function: Verify Build Output
:: ============================
:verify_build_output
call :log "Verifying build output"
echo   Verifying build artifacts...

:: Check if dist directory exists
if not exist "%SCRIPT_DIR%dist" (
    echo   ✗ Build output directory not found: %SCRIPT_DIR%dist
    call :log "Build output directory not found: %SCRIPT_DIR%dist"
    exit /b 1
)

:: Check if main server file exists
if not exist "%SCRIPT_DIR%dist\index.js" (
    echo   ✗ Server bundle not found: %SCRIPT_DIR%dist\index.js
    call :log "Server bundle not found: %SCRIPT_DIR%dist\index.js"
    exit /b 1
)

:: Check if client build output exists
if not exist "%SCRIPT_DIR%dist\public" (
    echo   ✗ Client build output not found: %SCRIPT_DIR%dist\public
    call :log "Client build output not found: %SCRIPT_DIR%dist\public"
    exit /b 1
)

:: Check if client index.html exists
if not exist "%SCRIPT_DIR%dist\public\index.html" (
    echo   ✗ Client index.html not found: %SCRIPT_DIR%dist\public\index.html
    call :log "Client index.html not found: %SCRIPT_DIR%dist\public\index.html"
    exit /b 1
)

:: Verify server bundle is not empty
for %%A in ("%SCRIPT_DIR%dist\index.js") do set "SERVER_SIZE=%%~zA"
if !SERVER_SIZE! lss 1000 (
    echo   ✗ Server bundle appears to be too small: !SERVER_SIZE! bytes
    call :log "Server bundle appears to be too small: !SERVER_SIZE! bytes"
    exit /b 1
)

:: Verify server bundle contains expected content
findstr /c:"express" "%SCRIPT_DIR%dist\index.js" >nul 2>&1
if !errorlevel! neq 0 (
    echo   ⚠ Server bundle may not contain expected Express framework
    call :log "Server bundle may not contain expected Express framework"
)

echo   ✓ Build artifacts verified successfully
call :log "Build verification completed - dist: %SCRIPT_DIR%dist, server: !SERVER_SIZE! bytes"
exit /b 0

:: ============================
:: Function: Verify PM2 Health
:: ============================
:verify_pm2_health
call :log "Verifying PM2 process health"
echo   Verifying PM2 process status...

:: Wait a moment for PM2 to initialize
timeout /t 3 >nul

:: Check if PM2 process is running
pm2 describe !APP_NAME! >nul 2>&1
if !errorlevel! neq 0 (
    echo   ✗ PM2 process !APP_NAME! not found
    call :log "PM2 process !APP_NAME! not found"
    exit /b 1
)

:: Get process status
for /f "tokens=*" %%i in ('pm2 jlist 2^>nul ^| findstr /i "!APP_NAME!"') do set "PM2_STATUS=%%i"

:: Check if process status contains "online"
echo !PM2_STATUS! | findstr /i "online" >nul 2>&1
if !errorlevel! neq 0 (
    echo   ✗ PM2 process !APP_NAME! is not in online status
    call :log "PM2 process !APP_NAME! is not in online status"
    echo   Process status: !PM2_STATUS!
    call :log "Process status: !PM2_STATUS!"
    exit /b 1
)

:: Check for restart count (high restart count indicates issues)
for /f "tokens=*" %%i in ('pm2 jlist 2^>nul ^| findstr /i "restart_time"') do (
    echo %%i | findstr /r "[5-9][0-9]" >nul 2>&1
    if !errorlevel! equ 0 (
        echo   ⚠ High restart count detected for PM2 process
        call :log "High restart count detected for PM2 process"
    )
)

echo   ✓ PM2 process health verified
call :log "PM2 process health verification completed"
exit /b 0

:: ============================
:: Function: Verify Application Health
:: ============================
:verify_application_health
call :log "Performing comprehensive application health check"
echo   Performing application health check...

:: Wait for application to be ready
echo   Waiting for application to initialize...
timeout /t 10 >nul

:: Check if the port is listening
netstat -an | findstr ":!APP_PORT! " >nul 2>&1
if !errorlevel! neq 0 (
    echo   ✗ Application port !APP_PORT! is not listening
    call :log "Application port !APP_PORT! is not listening"
    exit /b 1
)

echo   ✓ Application port !APP_PORT! is listening
call :log "Application port !APP_PORT! is listening"

:: Test basic HTTP connectivity
echo   Testing HTTP connectivity...
powershell -Command "try { $response = Invoke-WebRequest -Uri '!APP_URL!' -TimeoutSec 10 -UseBasicParsing; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
set "HTTP_TEST_RESULT=!errorlevel!"

if !HTTP_TEST_RESULT! equ 0 (
    echo   ✓ HTTP connectivity test passed
    call :log "HTTP connectivity test passed"
) else (
    echo   ⚠ HTTP connectivity test failed
    call :log "HTTP connectivity test failed"
    
    :: Additional diagnostic - check if it's a redirect or other issue
    powershell -Command "try { $response = Invoke-WebRequest -Uri '!APP_URL!' -TimeoutSec 5 -UseBasicParsing; Write-Host 'Status:' $response.StatusCode } catch { Write-Host 'Error:' $_.Exception.Message }" 2>nul
    
    exit /b 1
)

:: Test if the application returns expected content (looking for HTML)
echo   Testing application content...
powershell -Command "try { $response = Invoke-WebRequest -Uri '!APP_URL!' -TimeoutSec 10 -UseBasicParsing; if ($response.Content -like '*html*') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
set "CONTENT_TEST_RESULT=!errorlevel!"

if !CONTENT_TEST_RESULT! equ 0 (
    echo   ✓ Application content test passed
    call :log "Application content test passed"
) else (
    echo   ⚠ Application content test failed - may still be starting
    call :log "Application content test failed - may still be starting"
)

:: Check PM2 logs for any immediate errors
echo   Checking for startup errors...
pm2 logs !APP_NAME! --lines 5 --nostream 2>&1 | findstr /i "error" >nul 2>&1
if !errorlevel! equ 0 (
    echo   ⚠ Recent errors detected in application logs
    call :log "Recent errors detected in application logs"
    echo   Check logs with: pm2 logs !APP_NAME!
)

:: Overall health assessment
if !HTTP_TEST_RESULT! equ 0 (
    if !CONTENT_TEST_RESULT! equ 0 (
        echo   ✓ Application health check: EXCELLENT
        call :log "Application health check: EXCELLENT - all tests passed"
        exit /b 0
    ) else (
        echo   ✓ Application health check: GOOD - connectivity OK, content loading
        call :log "Application health check: GOOD - connectivity OK, content may still be loading"
        exit /b 0
    )
) else (
    echo   ⚠ Application health check: POOR - connectivity issues detected
    call :log "Application health check: POOR - connectivity issues detected"
    exit /b 1
)

:end
call :log "Launcher script finished"
endlocal