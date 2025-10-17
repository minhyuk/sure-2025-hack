# Claude Code 작업 가이드

이 문서는 Claude Code로 진행한 주요 작업들을 정리한 가이드입니다.

## 프로젝트 개요

**슈어해커톤 2025 - React 기반 실시간 협업 플랫폼**
- React 19 + Vite
- Liveblocks (실시간 협업)
- BlockNote (Notion 스타일 에디터)
- Express.js + SQLite (백엔드)

---

## 주요 작업 히스토리

### 1. Liveblocks 통합 및 실시간 협업 구현

**문제점:**
- 초기에 `LiveblocksProvider` export 오류 발생
- 여러 버전의 Liveblocks 패키지 충돌 (2.24.4 vs 3.8.1)
- Loading spinner가 멈추지 않음

**해결 방법:**
```bash
# 모든 Liveblocks 패키지를 3.8.1로 통일
npm install @liveblocks/client@3.8.1 @liveblocks/react@3.8.1 @liveblocks/yjs@3.8.1
```

**아키텍처:**
- `App.jsx`: 최상위에 `<LiveblocksProvider>` 배치
- `CollaborativeEditor.jsx`: Room 기반 구조
  - `<RoomProvider>` - room ID: `content-topic-{id}`
  - `<Suspense>` - 로딩 상태 처리
  - `<Editor>` - 실제 에디터 컴포넌트

**핵심 코드:**
```jsx
// App.jsx
<LiveblocksProvider publicApiKey={import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY}>
  <Routes>...</Routes>
</LiveblocksProvider>

// CollaborativeEditor.jsx
<RoomProvider id={`content-topic-${topicId}`}>
  <Suspense fallback={<EditorLoading />}>
    <Editor />
  </Suspense>
</RoomProvider>
```

---

### 2. Docker 빌드 시 환경 변수 처리

**문제점:**
- Docker 컨테이너에서 "publicApiKey cannot be empty" 에러
- .env 파일이 Docker 빌드 시 읽히지 않음
- Vite는 빌드 타임에 환경 변수를 번들에 포함시킴

**해결 방법:**

**Dockerfile 수정:**
```dockerfile
FROM node:20-alpine AS builder
ARG VITE_LIVEBLOCKS_PUBLIC_KEY
ENV VITE_LIVEBLOCKS_PUBLIC_KEY=$VITE_LIVEBLOCKS_PUBLIC_KEY
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```

**GitHub Actions 설정:**
```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    build-args: |
      VITE_LIVEBLOCKS_PUBLIC_KEY=${{ secrets.VITE_LIVEBLOCKS_PUBLIC_KEY }}
```

**로컬 빌드 스크립트 (build-docker.bat):**
```batch
@echo off
REM Read .env file and extract VITE_LIVEBLOCKS_PUBLIC_KEY
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="VITE_LIVEBLOCKS_PUBLIC_KEY" set LIVEBLOCKS_KEY=%%b
)

docker build --build-arg VITE_LIVEBLOCKS_PUBLIC_KEY=%LIVEBLOCKS_KEY% -t sure-hackerton:local .
```

**중요 포인트:**
- Vite 환경 변수는 **빌드 타임**에 결정됨 (런타임 아님)
- Docker ARG로 빌드 시점에 전달 필요
- GitHub Secrets에 `VITE_LIVEBLOCKS_PUBLIC_KEY` 등록 필수

---

### 3. 스마트 JSON 백업 시스템 구현

**요구사항:**
- Liveblocks는 메모리 기반이므로 영구 저장소 필요
- 매번 저장하면 I/O 과부하
- 최초 입장 시 기존 데이터 복원 필요

**설계:**

#### 3.1 양방향 동기화

**JSON → Liveblocks (초기 로딩):**
```javascript
React.useEffect(() => {
  if (!editor || isInitializedRef.current) return

  setTimeout(() => {
    const currentDoc = editor.document
    // 빈 paragraph 1개만 있으면 비어있는 것으로 간주
    const isEmpty = currentDoc.length === 1 &&
                   currentDoc[0].content.length === 0 &&
                   currentDoc[0].type === 'paragraph'

    if (isEmpty && initialContent?.blocks?.length > 0) {
      console.log('📥 [Initial Load] Loading from JSON to Liveblocks...')
      editor.replaceBlocks(editor.document, initialContent.blocks)
    }

    isInitializedRef.current = true
  }, 500) // Yjs 동기화 대기
}, [editor, initialContent])
```

**Liveblocks → JSON (자동 저장):**
```javascript
// 5분마다 자동 저장 (변경사항 있을 때만)
React.useEffect(() => {
  const intervalId = setInterval(() => {
    if (hasChangesRef.current) {
      console.log('⏰ [Auto Save] 5-minute interval triggered')
      saveContent()
    }
  }, 5 * 60 * 1000)

  return () => clearInterval(intervalId)
}, [saveContent])

// 마지막 사용자가 나갈 때 저장
React.useEffect(() => {
  return () => {
    if (others.length === 0 && hasChangesRef.current) {
      console.log('👋 [Last User] Saving before exit...')
      saveContent()
    }
  }
}, [others.length, saveContent])
```

#### 3.2 변경 감지

```javascript
const hasChangesRef = useRef(false)

// 변경 감지
React.useEffect(() => {
  if (!editor) return

  const handleChange = () => {
    hasChangesRef.current = true
  }

  editor.onChange(handleChange)
}, [editor])

// 저장 함수
const saveContent = useCallback(() => {
  if (!editor || !onSave) return

  try {
    const content = editor.document
    if (content && content.length > 0) {
      console.log('💾 [JSON Backup] Saving to workspace...')
      onSave(content)
      hasChangesRef.current = false // 저장 후 플래그 리셋
    }
  } catch (error) {
    console.error('❌ [JSON Backup] Failed to save:', error)
  }
}, [editor, onSave])
```

#### 3.3 저장 트리거 정리

**❌ 제거한 트리거:**
- Enter 키 (새 블럭 추가 시)
- Blur 이벤트 (포커스 잃을 때)

**이유:** 너무 빈번한 I/O로 성능 저하

**✅ 추가한 트리거:**
- 5분 자동 저장 (변경사항 있을 때만)
- 마지막 사용자 퇴장 시

**장점:**
- 실시간 협업: Liveblocks가 모든 변경사항 즉시 동기화
- 영구 저장: JSON 파일에 주기적 백업
- 최소 I/O: 변경 감지로 불필요한 저장 방지

---

### 4. Yjs/ProseMirror 동기화 에러 수정

**문제:**
```
RangeError: Position 43 out of range
at _ResolvedPos.resolve
at ProsemirrorBinding.mux
```

**원인:**
- onChange/onBlur 핸들러가 Yjs 동기화 중에 호출됨
- `editor.document` 읽기 시점에 문서 상태가 불일치

**해결:**
```javascript
const saveContent = useCallback(() => {
  if (!editor || !onSave) return

  try {
    const content = editor.document
    if (content && content.length > 0) {
      onSave(content)
    }
  } catch (error) {
    console.error('❌ Failed to save:', error)
  }
}, [editor, onSave])
```

**핵심:**
- requestAnimationFrame 제거 (불필요)
- try-catch로 동기화 중 에러 처리
- 저장 타이밍을 5분/퇴장 시로 변경하여 충돌 최소화

---

## 파일 구조

```
src/
├── components/
│   └── CollaborativeEditor.jsx    # Liveblocks + BlockNote 통합
├── pages/
│   └── TopicPage.jsx               # 주제 상세 페이지 (onSave, initialContent 전달)
├── services/
│   └── api.js                      # API 통신 (saveContent, getWorkspace)
└── App.jsx                         # LiveblocksProvider 최상위 배치

workspace/
└── topic_*.json                    # 각 주제별 JSON 백업

server.js                           # Express API 서버
├── GET  /api/workspace/:topicId    # JSON 파일 읽기
└── POST /api/workspace/:topicId/content  # JSON 파일 쓰기
```

---

## 디버깅 로그 가이드

**초기 로딩:**
```
🔍 [Initial Load] Check: {docLength: 1, isEmpty: true, ...}
📥 [Initial Load] Loading from JSON to Liveblocks... X blocks
✅ [Initial Load] Content loaded successfully
```

**자동 저장:**
```
⏰ [Auto Save] 5-minute interval triggered
💾 [JSON Backup] Saving to workspace... X blocks
✅ [JSON Backup] Saved successfully
```

**마지막 사용자 저장:**
```
👋 [Last User] Saving before exit...
💾 [JSON Backup] Saving to workspace... X blocks
```

---

## 다음 작업 시 체크리스트

### Liveblocks 통합할 때
- [ ] 모든 @liveblocks/* 패키지 버전 통일
- [ ] App.jsx에 LiveblocksProvider 배치
- [ ] RoomProvider + Suspense 구조 사용
- [ ] Room ID 패턴 명확히 정의 (예: `content-topic-{id}`)

### Docker 배포할 때
- [ ] .env 파일에 VITE_LIVEBLOCKS_PUBLIC_KEY 설정
- [ ] Dockerfile에 ARG + ENV 추가
- [ ] GitHub Secrets에 환경 변수 등록
- [ ] build-docker.bat로 로컬 테스트

### JSON 백업 시스템
- [ ] initialContent prop 전달
- [ ] onSave callback 구현
- [ ] 변경 감지 로직 (hasChangesRef)
- [ ] 초기 로딩 체크 (isEmpty 판단)
- [ ] 저장 트리거 설정 (5분 + 마지막 사용자)

---

## 참고 링크

- [Liveblocks React Docs](https://liveblocks.io/docs/api-reference/liveblocks-react)
- [BlockNote React](https://www.blocknotejs.org/docs/react)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Yjs Documentation](https://docs.yjs.dev/)

---

**작성일:** 2025-10-17
**작성자:** Claude Code (feat. Peter)
