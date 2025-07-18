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

echo [1/6] Checking Node.js installation...
call :check_nodejs
set "NODE_CHECK_RESULT=!errorlevel!"
if !NODE_CHECK_RESULT! neq 0 (
    echo   ✗ Node.js not found or not functional
    call :log "Node.js check failed with exit code !NODE_CHECK_RESULT!"
    goto :error_exit
) else (
    echo   ✓ Node.js installation verified successfully
    call :log "Node.js installation verified successfully"
)

echo [2/6] Installing Node.js modules...
call :install_modules
if !errorlevel! neq 0 (
    call :log "Node modules installation failed"
    goto :error_exit
)

echo [3/6] Configuring PM2 service...
call :configure_pm2
if !errorlevel! neq 0 (
    call :log "PM2 configuration failed"
    goto :error_exit
)

echo [4/6] Updating dependencies...
call :update_dependencies
if !errorlevel! neq 0 (
    call :log "Dependency update failed"
    goto :error_exit
)

echo [5/6] Building and starting application...
call :build_and_start
if !errorlevel! neq 0 (
    call :log "Application build/start failed"
    goto :error_exit
)

echo [6/6] Launching application...
call :launch_application
if !errorlevel! neq 0 (
    call :log "Application launch failed"
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

call :log "Running npm run build"
npm run build 2>&1 | tee -a "%LOG_FILE%"

if !errorlevel! neq 0 (
    echo   ✗ Build failed
    call :log "Build failed"
    exit /b 1
)

echo   ✓ Application built successfully
call :log "Application built successfully"

:: Stop existing PM2 process if running
echo   Stopping any existing instances...
pm2 stop !APP_NAME! >nul 2>&1
pm2 delete !APP_NAME! >nul 2>&1

:: Start application with PM2
echo   Starting application with PM2...
call :log "Starting application with PM2"
pm2 start ecosystem.config.js 2>&1 | tee -a "%LOG_FILE%"

if !errorlevel! neq 0 (
    echo   ✗ Failed to start application
    call :log "Failed to start application with PM2"
    exit /b 1
)

:: Save PM2 configuration
pm2 save >nul 2>&1

echo   ✓ Application started successfully
call :log "Application started successfully"

:: Wait for application to be ready
echo   Waiting for application to be ready...
timeout /t 10 >nul

:: Check if application is responding
powershell -Command "(New-Object Net.WebClient).DownloadString('!APP_URL!') | Out-Null" 2>nul
if !errorlevel! equ 0 (
    echo   ✓ Application is responding
    call :log "Application is responding"
    exit /b 0
) else (
    echo   ⚠ Application may still be starting up
    call :log "Application may still be starting up"
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
call :log "Installation failed"
echo.
echo ========================================================
echo          Installation Failed!
echo ========================================================
echo.
echo ✗ The installation process encountered an error.
echo.
echo Please check the log file for details: %LOG_FILE%
echo.
echo Common solutions:
echo   1. Ensure Node.js is installed (visit https://nodejs.org/)
echo   2. Run as Administrator
echo   3. Check internet connection
echo   4. Try running the script again
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

:end
call :log "Launcher script finished"
endlocal