@echo off
REM Demo script to test different scenarios for Launcher.bat
REM This script simulates various installation scenarios

echo.
echo ========================================================
echo       Launcher.bat Testing Scenarios Demo
echo ========================================================
echo.

echo This script demonstrates how to test various scenarios:
echo.

echo 1. Fresh Installation Test:
echo    - Delete node_modules directory
echo    - Run Launcher.bat
echo    - Verify all components are installed
echo.

echo 2. Update Test:
echo    - Modify package.json timestamp
echo    - Run Launcher.bat
echo    - Verify dependencies are updated
echo.

echo 3. Service Recovery Test:
echo    - Stop PM2 service: pm2 stop inventory-pro
echo    - Run Launcher.bat
echo    - Verify service is restarted
echo.

echo 4. Node.js Installation Test:
echo    - Temporarily rename Node.js directory
echo    - Place node-installer.msi in project root
echo    - Run Launcher.bat
echo    - Verify Node.js is installed
echo.

echo 5. Error Handling Test:
echo    - Remove write permissions from directory
echo    - Run Launcher.bat
echo    - Verify error messages and logging
echo.

echo Testing Commands:
echo.
echo   Test fresh install:
echo   rmdir /s /q node_modules ^& Launcher.bat
echo.
echo   Test service status:
echo   pm2 status
echo.
echo   Test application response:
echo   curl http://localhost:5000
echo.
echo   View logs:
echo   pm2 logs inventory-pro
echo.
echo   Check launcher log:
echo   type launcher.log
echo.

echo ========================================================
echo          Manual Testing Checklist
echo ========================================================
echo.
echo [ ] Fresh Windows system test
echo [ ] Node.js automatic installation
echo [ ] Node modules installation
echo [ ] PM2 service configuration
echo [ ] Application build success
echo [ ] Service startup success
echo [ ] Browser launch success
echo [ ] Service persistence after reboot
echo [ ] Error handling and recovery
echo [ ] Log file creation and content
echo.

pause