@echo off
REM ========================================
REM Sure Hackathon Deployment Script
REM Windows Environment
REM ========================================

echo.
echo ========================================
echo   Sure Hackathon Deployment
echo ========================================
echo.

REM Configuration
set IMAGE_NAME=sure-hackathon
set CONTAINER_NAME=sure-hackathon-app
set HOST_PORT=3000
set SIGNALING_PORT=5001

REM Get current directory
set CURRENT_DIR=%CD%
set DATA_PATH=%CURRENT_DIR%\data
set WORKSPACE_PATH=%CURRENT_DIR%\workspace

echo [1/7] Stopping old container...
docker stop %CONTAINER_NAME% 2>nul
docker rm %CONTAINER_NAME% 2>nul

echo [2/7] Removing old image...
docker rmi %IMAGE_NAME%:latest 2>nul

echo [3/7] Building Docker image...
docker build -t %IMAGE_NAME%:latest .
if errorlevel 1 (
    echo ERROR: Docker build failed!
    pause
    exit /b 1
)

echo [4/7] Creating data directories...
if not exist "%DATA_PATH%" mkdir "%DATA_PATH%"
if not exist "%WORKSPACE_PATH%" mkdir "%WORKSPACE_PATH%"

echo [5/7] Starting container...
docker run -d ^
  --name %CONTAINER_NAME% ^
  --restart unless-stopped ^
  -p %HOST_PORT%:3000 ^
  -p %SIGNALING_PORT%:5001 ^
  -v "%DATA_PATH%":/app/data ^
  -v "%WORKSPACE_PATH%":/app/workspace ^
  %IMAGE_NAME%:latest

if errorlevel 1 (
    echo ERROR: Failed to start container!
    pause
    exit /b 1
)

echo [6/7] Waiting for container to be ready...
timeout /t 5 /nobreak >nul

echo [7/7] Checking container status...
docker ps | findstr %CONTAINER_NAME%

echo.
echo ========================================
echo   Deployment Complete! 🎉
echo ========================================
echo.
echo   Application URL: http://localhost:%HOST_PORT%
echo   WebRTC Signaling: ws://localhost:%SIGNALING_PORT%
echo.
echo   Useful commands:
echo   - View logs:    docker logs -f %CONTAINER_NAME%
echo   - Stop:         docker stop %CONTAINER_NAME%
echo   - Restart:      docker restart %CONTAINER_NAME%
echo   - Remove:       docker rm -f %CONTAINER_NAME%
echo.
pause
