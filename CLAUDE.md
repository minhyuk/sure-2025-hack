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

### 5. 모니터 대시보드 개선 (2025-10-17 추가)

이번 세션에서 대시보드에 여러 UX/UI 개선 사항을 적용했습니다.

#### 5.1 관리자 전체 삭제 기능

**문제:**
- LiveMap에는 `clear()` 메서드가 없음

**해결:**
```javascript
// Mutation to clear all sticky notes (admin only)
const clearAllStickyNotes = useMutation(({ storage }) => {
  const notes = storage.get('stickyNotes')
  // LiveMap doesn't have clear(), so delete all entries one by one
  const allIds = Array.from(notes.keys())
  allIds.forEach(id => notes.delete(id))
}, [])
```

**UI:**
- 관리자 전용 "전체삭제" 버튼 추가
- 확인 다이얼로그로 실수 방지
- 빨간색 테마로 경고성 강조

#### 5.2 네비게이션 버튼 크기 축소

**변경 전:**
```css
.nav-button {
  padding: 12px 24px;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  border-radius: 12px;
}
```

**변경 후:**
```css
.nav-button {
  padding: 8px 16px;          /* 축소 */
  font-size: 0.75rem;          /* 축소 */
  font-weight: 600;            /* design.md 기준 */
  text-transform: none;        /* 대문자 제거 */
  border-radius: 8px;          /* design.md 기준 */
}
```

#### 5.3 팀 진행 현황 토글 기능

**구현:**
```javascript
const [showTeamsPanel, setShowTeamsPanel] = useState(true)

const toggleTeamsPanel = () => {
  setShowTeamsPanel(!showTeamsPanel)
}
```

**CSS:**
```css
.monitor-layout.full-width .postit-section-main {
  flex: 1;
  border-right: none;
}
```

**기능:**
- "👥 팀현황 숨김/보기" 버튼으로 토글
- 숨기면 포스트잇 월이 전체 화면 사용
- 부드러운 전환 애니메이션

#### 5.4 포스트잇 색상 자동 배정

**기존 방식:**
- 사용자가 8가지 색상 중 선택
- 같은 사람이 쓴 글인지 구분 어려움

**개선 방식:**
```javascript
// Generate consistent color based on author name
const getColorForAuthor = (name) => {
  const colors = [
    '#FFE66D', '#FF6B6B', '#4ECDC4', '#95E1D3',
    '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA'
  ]

  // Simple hash function to get consistent index
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]
}
```

**장점:**
- 같은 이름 = 같은 색상 (일관성)
- 자동 배정으로 사용자 편의성 향상
- 여러 사람의 포스트잇을 색상으로 쉽게 구분

#### 5.5 소개 페이지 링크 추가

**기능:**
- 모니터 페이지에서 `/intro` 이동 버튼 추가
- 해커톤 소개 페이지 접근성 향상

**버튼 구조:**
```
[📖 소개] [👥 팀현황 토글] [📝 내 팀 페이지] [🚪 로그아웃]
```

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

## 게임화 요소 계획

해커톤을 더 재미있고 몰입도 높게 만들기 위한 게임 요소들을 설계했습니다.

### 핵심 아이디어

1. **팀별 업적 시스템** - 특정 조건 달성 시 배지 획득
   - 🚀 빠른 출발: 1시간 내 3단계 돌파
   - 🏃 마라토너: 5단계 연속 완료
   - ✨ 완벽주의자: 모든 산출물 완벽 제출
   - 🎉 응원왕: 다른 팀 포스트잇 10개 이상
   - ⭐ 인기팀: 응원 메시지 50개 이상 받기

2. **실시간 리더보드** - 포인트 기반 순위 시스템
   - 진행 단계 점수 (10단계 × 50점 = 500점)
   - 업적 점수 (최대 500점)
   - 응원 받은 횟수 (최대 100점)
   - 시간 보너스 (빠른 완료 시 최대 200점)

3. **마일스톤 배지**
   - 🏅 Bronze: 3단계 완료
   - 🥈 Silver: 6단계 완료
   - 🥇 Gold: 9단계 완료
   - 💎 Diamond: 10단계 + 모든 산출물

4. **응원 반응 카운터**
   - 팀별로 👍 🔥 ⭐ 💡 카운터
   - 클릭 시 +1 애니메이션
   - 응원 포인트로 환산

5. **팀 레벨 시스템**
   - Lv.1 신입 (0 pts)
   - Lv.2 초보 (200 pts)
   - Lv.3 중수 (500 pts)
   - Lv.4 고수 (800 pts)
   - Lv.5 전설 (1200 pts)

### 구현 우선순위

1. **1단계**: 응원 반응 카운터 (가장 간단, 즉시 효과)
2. **2단계**: 포인트 시스템 + 리더보드
3. **3단계**: 업적 시스템
4. **4단계**: 마일스톤 배지 + 팀 레벨

### DB 스키마 추가 필요

```sql
-- 업적 정의
CREATE TABLE achievements (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  condition TEXT, -- JSON
  points INTEGER DEFAULT 0
);

-- 팀별 획득 업적
CREATE TABLE team_achievements (
  id INTEGER PRIMARY KEY,
  team_id INTEGER,
  achievement_id INTEGER,
  unlocked_at DATETIME,
  unlocked_by INTEGER,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (achievement_id) REFERENCES achievements(id),
  FOREIGN KEY (unlocked_by) REFERENCES users(id)
);

-- 팀별 응원 카운터
CREATE TABLE team_cheers (
  id INTEGER PRIMARY KEY,
  team_id INTEGER,
  cheer_type TEXT, -- thumbs_up, fire, star, idea
  count INTEGER DEFAULT 0,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);
```

---

**작성일:** 2025-10-17
**작성자:** Claude Code (feat. Peter)
**최종 업데이트:** 2025-10-17 (게임화 요소 추가)
