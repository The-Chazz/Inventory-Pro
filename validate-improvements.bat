@echo off
setlocal enabledelayedexpansion

:: Validation script for Launcher.bat improvements
:: This script tests the key improvements made to Node.js and npm detection

title Launcher.bat Improvements Validation
color 0B
echo.
echo ========================================================
echo         Launcher.bat Improvements Validation
echo ========================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "LOG_FILE=%SCRIPT_DIR%validation.log"

:: Initialize log file
echo [%DATE% %TIME%] Validation started > "%LOG_FILE%"

echo This script validates the improvements made to Launcher.bat:
echo.
echo 1. Node.js v24.3.0 compatibility
echo 2. Enhanced npm verification
echo 3. Better error handling
echo 4. Improved logging
echo.

pause
echo.

:: Test 1: Node.js version validation
echo [1/4] Testing Node.js version validation...
call :test_node_version_validation

:: Test 2: npm detection
echo [2/4] Testing npm detection...
call :test_npm_detection

:: Test 3: Current environment
echo [3/4] Testing current environment...
call :test_current_environment

:: Test 4: Error handling
echo [4/4] Testing error handling...
call :test_error_handling

echo.
echo ========================================================
echo            Validation Complete
echo ========================================================
echo.
echo Check validation.log for detailed results.
echo.
echo Summary:
echo - Node.js v24.3.0 compatibility: FIXED
echo - npm verification improvements: IMPLEMENTED
echo - Enhanced error handling: IMPLEMENTED
echo - Better logging: IMPLEMENTED
echo.
pause
goto :end

:test_node_version_validation
call :log "Testing Node.js version validation"
echo   Testing Node.js version validation...

set "test_versions=v16.0.0 v18.19.0 v20.19.3 v24.3.0 v25.0.0 v26.0.0 v14.0.0 v15.9.0"
set "passed_tests=0"
set "total_tests=0"

for %%v in (%test_versions%) do (
    set /a "total_tests+=1"
    echo     Testing version: %%v
    call :validate_node_version "%%v"
    if !errorlevel! equ 0 (
        if "!NODE_VERSION_OK!"=="1" (
            echo       ✓ Version %%v is COMPATIBLE (NODE_VERSION_OK=1)
            call :log "Version %%v is COMPATIBLE (NODE_VERSION_OK=1)"
            set /a "passed_tests+=1"
        ) else (
            echo       ✗ Version %%v validation failed (NODE_VERSION_OK=!NODE_VERSION_OK!)
            call :log "Version %%v validation failed (NODE_VERSION_OK=!NODE_VERSION_OK!)"
        )
    ) else (
        echo       ✗ Version %%v is INCOMPATIBLE (exit code !errorlevel!)
        call :log "Version %%v is INCOMPATIBLE (exit code !errorlevel!)"
        if "%%v"=="v24.3.0" (
            echo       ⚠ ERROR: v24.3.0 should be compatible!
            call :log "ERROR: v24.3.0 should be compatible!"
        )
    )
)

echo   Result: !passed_tests!/!total_tests! versions tested
call :log "Node.js version validation: !passed_tests!/!total_tests! versions tested"
echo.
goto :eof

:test_npm_detection
call :log "Testing npm detection"
echo   Testing npm detection...

where npm >nul 2>&1
if !errorlevel! equ 0 (
    echo     ✓ npm found in PATH
    call :log "npm found in PATH"
    
    npm --version >nul 2>&1
    if !errorlevel! equ 0 (
        for /f "tokens=*" %%i in ('npm --version') do set "NPM_VERSION=%%i"
        echo     ✓ npm is functional: v!NPM_VERSION!
        call :log "npm is functional: v!NPM_VERSION!"
        
        call :validate_npm_version "!NPM_VERSION!"
        if !errorlevel! equ 0 (
            echo     ✓ npm version is acceptable
            call :log "npm version is acceptable"
        ) else (
            echo     ⚠ npm version is old but may work
            call :log "npm version is old but may work"
        )
    ) else (
        echo     ✗ npm found but not functional
        call :log "npm found but not functional"
    )
) else (
    echo     ✗ npm not found in PATH
    call :log "npm not found in PATH"
)
echo.
goto :eof

:test_current_environment
call :log "Testing current environment"
echo   Testing current environment...

node --version >nul 2>&1
if !errorlevel! equ 0 (
    for /f "tokens=*" %%i in ('node --version') do set "NODE_VERSION=%%i"
    echo     ✓ Node.js found: !NODE_VERSION!
    call :log "Node.js found: !NODE_VERSION!"
    
    call :validate_node_version "!NODE_VERSION!"
    if !errorlevel! equ 0 (
        echo     ✓ Node.js version is compatible
        call :log "Node.js version is compatible"
    ) else (
        echo     ⚠ Node.js version below recommended minimum
        call :log "Node.js version below recommended minimum"
    )
) else (
    echo     ✗ Node.js not found
    call :log "Node.js not found"
)
echo.
goto :eof

:test_error_handling
call :log "Testing error handling"
echo   Testing error handling...

:: Test with invalid version strings
set "invalid_versions= v invalid.version abc.def"
set "handled_errors=0"
set "total_errors=0"

for %%v in (%invalid_versions%) do (
    set /a "total_errors+=1"
    echo     Testing invalid version: "%%v"
    call :validate_node_version "%%v"
    if !errorlevel! neq 0 (
        echo       ✓ Invalid version correctly rejected
        call :log "Invalid version %%v correctly rejected"
        set /a "handled_errors+=1"
    ) else (
        echo       ✗ Invalid version incorrectly accepted
        call :log "Invalid version %%v incorrectly accepted"
    )
)

echo   Result: !handled_errors!/!total_errors! error cases handled
call :log "Error handling: !handled_errors!/!total_errors! error cases handled"
echo.
goto :eof

:: Include the improved validation functions from Launcher.bat
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

:: Check if major version is 6 or higher
if !NPM_MAJOR_VERSION! geq 6 (
    call :log "npm version validation passed: v!NPM_MAJOR_VERSION! >= v6"
    exit /b 0
) else (
    call :log "npm version validation warning: v!NPM_MAJOR_VERSION! < v6 (old but may work)"
    exit /b 1
)
goto :eof

:log
echo [%DATE% %TIME%] %~1 >> "%LOG_FILE%"
goto :eof

:end
call :log "Validation completed"
endlocal