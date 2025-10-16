@echo off
REM Configuration
set CONTAINER_NAME=sure-hackerton
set IMAGE_NAME=ghcr.io/minhyuk/sure-2025-hack:main
set HTTP_PORT=3000
set WEBRTC_PORT=5001
set DATA_VOLUME=sure-hackerton-data
set WORKSPACE_VOLUME=sure-hackerton-workspace

echo Docker 버전 확인...
docker --version

if %ERRORLEVEL% NEQ 0 (
    echo Docker가 설치되어 있지 않습니다!
    exit /b 1
)

REM PAK가 설정되어 있으면 로그인 (private 이미지용)
REM Public 이미지는 로그인 없이도 pull 가능
if not "%PAK%"=="" (
    echo GitHub Container Registry 로그인...
    echo %PAK% | docker login ghcr.io -u minhyuk --password-stdin
    
    if %ERRORLEVEL% NEQ 0 (
        echo 로그인 실패!
        exit /b 1
    )
    
    echo 로그인 성공!
) else (
    echo PAK 없이 진행 (public 이미지 모드)
)

echo 기존 컨테이너 정리...
docker stop %CONTAINER_NAME% 2>nul
docker rm %CONTAINER_NAME% 2>nul

echo 최신 이미지 다운로드...
docker pull %IMAGE_NAME%

if %ERRORLEVEL% NEQ 0 (
    echo 이미지 다운로드 실패!
    exit /b 1
)

echo 볼륨 생성 (없으면)...
docker volume create %DATA_VOLUME% 2>nul
docker volume create %WORKSPACE_VOLUME% 2>nul

echo 새 컨테이너 실행...
docker run -d ^
    --name %CONTAINER_NAME% ^
    -p %HTTP_PORT%:3000 ^
    -p %WEBRTC_PORT%:5001 ^
    -v %DATA_VOLUME%:/app/data ^
    -v %WORKSPACE_VOLUME%:/app/workspace ^
    -e NODE_ENV=production ^
    -e PORT=3000 ^
    -e DB_PATH=/app/data/hackathon.db ^
    --restart unless-stopped ^
    %IMAGE_NAME%

if %ERRORLEVEL% NEQ 0 (
    echo 컨테이너 실행 실패!
    exit /b 1
)

echo.
echo 컨테이너 실행 완료!
echo.
echo 실행 중인 컨테이너:
docker ps -f name=%CONTAINER_NAME%

echo.
echo 애플리케이션 접속:
echo   HTTP Server:    http://localhost:%HTTP_PORT%
echo   WebRTC Server:  ws://localhost:%WEBRTC_PORT%
echo.
echo 로그 확인: docker logs -f %CONTAINER_NAME%
echo 컨테이너 중지: docker stop %CONTAINER_NAME%
