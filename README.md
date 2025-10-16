# 🚀 AI 바이브코딩 슈어해커톤 2025 - React Edition

## 프로젝트 소개

슈어해커톤 플랫폼은 AI 바이브코딩 해커톤을 위한 **React 기반 실시간 협업 플랫폼**입니다. 참가자들이 12가지 주제를 탐색하고, Notion 스타일의 에디터로 정보를 공유하며, 피드백과 아이디어를 실시간으로 나눌 수 있는 모던 웹 애플리케이션입니다.

### 주요 기능

- ⚛️ **React 기반 SPA**: 빠르고 반응형 사용자 인터페이스
- 📝 **Notion 스타일 에디터**: BlockNote React 컴포넌트를 사용한 직관적인 콘텐츠 편집
- 💾 **자동저장 시스템**: 편집 후 2초 뒤 자동으로 저장 (debouncing)
- 📂 **Workspace JSON 구조**: 모든 데이터가 workspace 폴더에 JSON 형태로 저장
- 💬 **실시간 피드백 시스템**: 각 주제에 대한 의견 공유
- 💡 **아이디어 제안 및 투표**: 개선 아이디어를 제안하고 투표로 우선순위 결정
- ⌨️ **키보드 단축키**: Alt+N (네비게이터), Alt+[ (이전), Alt+] (다음)
- 🎨 **모던 사이버펑크 디자인**: 네온 효과와 글리치 애니메이션
- 📱 **반응형 디자인**: 모바일, 태블릿, 데스크톱 완벽 지원

## 기술 스택

### Frontend
- **React 19**: 최신 React
- **React Router DOM**: SPA 라우팅
- **BlockNote React**: Notion 스타일 에디터
- **Vite**: 빠른 빌드 도구

### Backend
- **Express.js**: REST API 서버
- **SQLite3**: 주제 데이터베이스
- **File System**: JSON 기반 Workspace 저장

## 설치 및 실행

### 🐳 Docker로 실행 (권장)

#### 1. Docker 이미지 빌드
```bash
docker build -t sure-hackathon .
```

#### 2. Docker 컨테이너 실행
```bash
docker run -d \
  --name sure-hackathon-app \
  -p 3000:3000 \
  -p 5001:5001 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/workspace:/app/workspace \
  sure-hackathon
```

#### 3. 브라우저에서 접속
```
http://localhost:3000
```

#### 컨테이너 관리
```bash
# 컨테이너 중지
docker stop sure-hackathon-app

# 컨테이너 시작
docker start sure-hackathon-app

# 로그 확인
docker logs -f sure-hackathon-app

# 컨테이너 삭제
docker rm -f sure-hackathon-app
```

### 💻 로컬 개발 환경

#### 1. 의존성 설치
```bash
npm install
```

#### 2. 개발 서버 실행
```bash
node server.js
```

#### 3. 브라우저에서 접속
```
http://localhost:3000
```

## 프로덕션 빌드

```bash
npm run build
npm start
```

## 프로젝트 구조

```
Publish/
├── src/
│   ├── components/              # React 컴포넌트
│   │   ├── NotionEditor.jsx    # Notion 스타일 에디터
│   │   ├── FeedbackSection.jsx # 피드백 섹션
│   │   ├── IdeasSection.jsx    # 아이디어 섹션
│   │   └── PageNavigator.jsx   # 페이지 네비게이터
│   ├── pages/                   # 페이지 컴포넌트
│   │   ├── HomePage.jsx        # 메인 페이지
│   │   └── TopicPage.jsx       # 주제 상세 페이지
│   ├── services/
│   │   └── api.js              # API 서비스
│   ├── hooks/
│   │   └── useAutoSave.js      # 자동저장 훅
│   ├── styles/                  # CSS 모듈
│   │   ├── index.css
│   │   ├── HomePage.css
│   │   ├── TopicPage.css
│   │   ├── NotionEditor.css
│   │   ├── CommentSection.css
│   │   └── PageNavigator.css
│   ├── App.jsx                  # 메인 앱 컴포넌트
│   └── main.jsx                 # React 진입점
├── workspace/                   # JSON 데이터 저장소
│   └── topic_*.json            # 각 주제별 workspace 파일
├── server.js                    # Express API 서버
├── vite.config.js              # Vite 설정
├── package.json
└── index.html                   # HTML 진입점
```

## API 엔드포인트

### 주제 관리
- **GET /api/topics** - 모든 주제 목록 조회
- **GET /api/topics/:id** - 특정 주제 정보

### Workspace API (JSON 파일 기반) 🆕
- **GET /api/workspace/:topicId** - 주제의 workspace 데이터 조회
- **POST /api/workspace/:topicId/content** - 콘텐츠 저장
- **POST /api/workspace/:topicId/feedback** - 피드백 추가
- **POST /api/workspace/:topicId/ideas** - 아이디어 추가
- **POST /api/workspace/:topicId/ideas/:ideaId/vote** - 아이디어 투표

### Workspace JSON 구조
```json
{
  "topicId": 1,
  "content": {
    "blocks": [...],
    "updated_by": "작성자",
    "updated_at": "2025-10-15T10:30:00.000Z"
  },
  "feedback": [
    {
      "id": 1234567890,
      "author_name": "홍길동",
      "content": "피드백 내용",
      "created_at": "2025-10-15T10:30:00.000Z"
    }
  ],
  "ideas": [
    {
      "id": 1234567890,
      "author_name": "김철수",
      "idea": "아이디어 내용",
      "votes": 5,
      "created_at": "2025-10-15T10:30:00.000Z"
    }
  ],
  "lastUpdated": "2025-10-15T10:30:00.000Z"
}
```

## 키보드 단축키 ⌨️

- **Alt + N** - 네비게이터 열기/닫기
- **Alt + [** - 이전 주제로 이동
- **Alt + ]** - 다음 주제로 이동
- **ESC** - 네비게이터 닫기

## 특징

### 1. Notion 스타일 에디터
- BlockNote React 라이브러리를 사용한 풍부한 텍스트 편집
- 헤딩, 리스트, 코드 블록 등 다양한 블록 타입 지원
- 실시간 편집 상태 표시

### 2. 자동저장 시스템
- Debouncing을 활용한 효율적인 저장
- 편집 후 2초 뒤 자동 저장
- 저장 상태 실시간 표시 (저장됨, 저장 중, 저장 안됨, 저장 실패)

### 3. Workspace JSON 구조
- 파일 시스템 기반 데이터 저장
- 버전 관리 용이
- 백업 및 복원 간편
- 각 주제별 독립적인 JSON 파일

### 4. 데이터베이스 (SQLite)
**topics** - 주제 정보 저장
- id, title, description, created_at

## 디자인 특징

- **네온 글로우 효과**: 주요 텍스트와 버튼에 적용
- **글리치 애니메이션**: 메인 타이틀에 사이버펑크 느낌
- **그리드 배경**: 움직이는 그리드 패턴
- **스캔라인 효과**: CRT 모니터 느낌의 스캔라인
- **컬러 팔레트**:
  - Primary: #00ff41 (네온 그린)
  - Secondary: #ff00ff (마젠타)
  - Accent: #00d9ff (시안)

## 라이센스

MIT

---

**Powered by AI • 2025 Sure Hackerton**
