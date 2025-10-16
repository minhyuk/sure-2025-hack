#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="sure-hackerton"
IMAGE_NAME="ghcr.io/minhyuk/sure-2025-hack:main"
HTTP_PORT=3000
WEBRTC_PORT=5001
DATA_VOLUME="sure-hackerton-data"
WORKSPACE_VOLUME="sure-hackerton-workspace"

echo -e "${YELLOW}Docker 버전 확인...${NC}"
docker --version

if [ $? -ne 0 ]; then
    echo -e "${RED}Docker가 설치되어 있지 않습니다!${NC}"
    exit 1
fi

# PAK가 설정되어 있으면 로그인 (private 이미지용)
# Public 이미지는 로그인 없이도 pull 가능
if [ -n "$PAK" ]; then
    echo -e "${YELLOW}GitHub Container Registry 로그인...${NC}"
    echo "$PAK" | docker login ghcr.io -u minhyuk --password-stdin
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}로그인 실패!${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}로그인 성공!${NC}"
else
    echo -e "${YELLOW}PAK 없이 진행 (public 이미지 모드)${NC}"
fi

echo -e "${YELLOW}기존 컨테이너 정리...${NC}"
docker stop $CONTAINER_NAME 2>/dev/null
docker rm $CONTAINER_NAME 2>/dev/null

echo -e "${YELLOW}최신 이미지 다운로드...${NC}"
docker pull $IMAGE_NAME

if [ $? -ne 0 ]; then
    echo -e "${RED}이미지 다운로드 실패!${NC}"
    exit 1
fi

echo -e "${YELLOW}볼륨 생성 (없으면)...${NC}"
docker volume create $DATA_VOLUME 2>/dev/null
docker volume create $WORKSPACE_VOLUME 2>/dev/null

echo -e "${YELLOW}새 컨테이너 실행...${NC}"
docker run -d \
    --name $CONTAINER_NAME \
    -p $HTTP_PORT:3000 \
    -p $WEBRTC_PORT:5001 \
    -v $DATA_VOLUME:/app/data \
    -v $WORKSPACE_VOLUME:/app/workspace \
    -e NODE_ENV=production \
    -e PORT=3000 \
    -e DB_PATH=/app/data/hackathon.db \
    --restart unless-stopped \
    $IMAGE_NAME

if [ $? -ne 0 ]; then
    echo -e "${RED}컨테이너 실행 실패!${NC}"
    exit 1
fi

echo -e "${GREEN}컨테이너 실행 완료!${NC}"
echo ""
echo -e "${YELLOW}실행 중인 컨테이너:${NC}"
docker ps -f name=$CONTAINER_NAME

echo ""
echo -e "${GREEN}애플리케이션 접속:${NC}"
echo -e "  HTTP Server:    ${GREEN}http://localhost:$HTTP_PORT${NC}"
echo -e "  WebRTC Server:  ${GREEN}ws://localhost:$WEBRTC_PORT${NC}"
echo ""
echo -e "${YELLOW}로그 확인:${NC} docker logs -f $CONTAINER_NAME"
echo -e "${YELLOW}컨테이너 중지:${NC} docker stop $CONTAINER_NAME"

