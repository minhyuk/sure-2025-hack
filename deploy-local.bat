@echo off
REM Deploy locally built Docker image

set CONTAINER_NAME=sure-hackerton
set IMAGE_NAME=sure-hackerton:local
set HTTP_PORT=3000
set DATA_VOLUME=sure-hackerton-data
set WORKSPACE_VOLUME=sure-hackerton-workspace

echo Stopping existing container...
docker stop %CONTAINER_NAME% 2>nul
docker rm %CONTAINER_NAME% 2>nul

echo Creating volumes if needed...
docker volume create %DATA_VOLUME% 2>nul
docker volume create %WORKSPACE_VOLUME% 2>nul

echo Starting container from local image...
docker run -d ^
    --name %CONTAINER_NAME% ^
    -p %HTTP_PORT%:3000 ^
    -v %DATA_VOLUME%:/app/data ^
    -v %WORKSPACE_VOLUME%:/app/workspace ^
    -e NODE_ENV=production ^
    -e PORT=3000 ^
    -e DB_PATH=/app/data/hackathon.db ^
    --restart unless-stopped ^
    %IMAGE_NAME%

if %ERRORLEVEL% NEQ 0 (
    echo Failed to start container!
    echo Make sure you've built the image first using build-docker.bat
    exit /b 1
)

echo.
echo Container started successfully!
echo.
echo Application URL: http://localhost:%HTTP_PORT%
echo.
echo Logs: docker logs -f %CONTAINER_NAME%
echo Stop: docker stop %CONTAINER_NAME%
