@echo off
REM Local Docker Build Script
REM This script builds the Docker image locally with your Liveblocks API key

echo Loading environment variables from .env file...
if not exist .env (
    echo ERROR: .env file not found!
    echo Please create .env file with VITE_LIVEBLOCKS_PUBLIC_KEY
    exit /b 1
)

REM Read VITE_LIVEBLOCKS_PUBLIC_KEY from .env
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
    if "%%a"=="VITE_LIVEBLOCKS_PUBLIC_KEY" set VITE_LIVEBLOCKS_PUBLIC_KEY=%%b
)

if "%VITE_LIVEBLOCKS_PUBLIC_KEY%"=="" (
    echo ERROR: VITE_LIVEBLOCKS_PUBLIC_KEY not found in .env file!
    exit /b 1
)

echo Liveblocks API Key loaded: %VITE_LIVEBLOCKS_PUBLIC_KEY:~0,15%...
echo.

set IMAGE_NAME=sure-hackerton:local
set CONTAINER_NAME=sure-hackerton

echo Building Docker image...
docker build ^
    --build-arg VITE_LIVEBLOCKS_PUBLIC_KEY=%VITE_LIVEBLOCKS_PUBLIC_KEY% ^
    -t %IMAGE_NAME% ^
    .

if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    exit /b 1
)

echo.
echo Build successful!
echo.
echo To run the container:
echo   docker stop %CONTAINER_NAME% 2^>nul
echo   docker rm %CONTAINER_NAME% 2^>nul
echo   docker run -d --name %CONTAINER_NAME% -p 3000:3000 -v sure-hackerton-data:/app/data -v sure-hackerton-workspace:/app/workspace %IMAGE_NAME%
echo.
echo Or use deploy-local.bat to run the local image
