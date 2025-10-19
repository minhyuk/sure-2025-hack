# Claude Code 작업 가이드

이 문서는 Claude Code로 진행한 주요 작업들을 정리한 가이드입니다.

## 프로젝트 개요

**슈어해커톤 2025 - React 기반 실시간 협업 플랫폼**
- React 19 + Vite
- Liveblocks (실시간 협업)
- BlockNote (Notion 스타일 에디터)
- Express.js + SQLite (백엔드)

### 주요 특징
- **간편한 입장**: 닉네임만 입력하면 바로 참여 가능 (회원가입 불필요)
- **관리자 페이지**: admin/claude 계정으로 설정 페이지 접근 가능
- **실시간 응원**: 포스트잇과 흐르는 댓글로 참가자들이 서로 응원

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

### 6. 타이머 시스템 개선 및 전체화면 시계 페이지 (2025-10-17 추가)

이번 세션에서 타이머 UX를 크게 개선하고 전체화면 시계 페이지를 추가했습니다.

#### 6.1 GlobalNav에 작은 타이머 추가

**문제점:**
- MonitorPage 헤더에만 큰 타이머가 있어서 다른 페이지에서는 시간 확인 불가
- 타이머가 너무 커서 공간을 많이 차지함

**해결:**
```javascript
// GlobalNav.jsx - 타이머 로직 추가
const [settings, setSettings] = useState(null)
const [timeRemaining, setTimeRemaining] = useState(null)
const [timeUntilStart, setTimeUntilStart] = useState(null)

// Timer countdown (active 상태)
useEffect(() => {
  if (!settings?.end_time || settings.status !== 'active') {
    setTimeRemaining(null)
    return
  }
  // ... 타이머 로직
}, [settings])

// D-day countdown (preparing 상태)
useEffect(() => {
  if (!settings?.start_time || settings.status !== 'preparing') {
    setTimeUntilStart(null)
    return
  }
  // ... D-day 로직
}, [settings])
```

**UI 구현:**
```jsx
{/* Mini Timer in GlobalNav */}
{(timeRemaining || timeUntilStart) && (
  <div className="global-nav-timer">
    {timeRemaining && (
      <Link to="/clock" className="timer-mini">
        <span className="timer-mini-label">{timeRemaining.ended ? '종료' : '남은 시간'}</span>
        <span className="timer-mini-value">
          {String(timeRemaining.hours).padStart(2, '0')}:
          {String(timeRemaining.minutes).padStart(2, '0')}:
          {String(timeRemaining.seconds).padStart(2, '0')}
        </span>
      </Link>
    )}
  </div>
)}
```

**스타일:**
- 작고 깔끔한 디자인 (Courier New 폰트 사용)
- 클릭하면 전체화면 시계 페이지로 이동
- 상태별 색상: 진행중(파란색), 준비중(주황색)

#### 6.2 전체화면 시계 페이지 (ClockPage)

**기능:**
- 현재 시각 표시 (큰 디지털 시계)
- 해커톤 타이머 (active 상태)
- D-day 카운트다운 (preparing 상태)
- 해커톤 종료 메시지 (ended 상태)

**파일 구조:**
```
src/
├── pages/
│   └── ClockPage.jsx         # 전체화면 시계 페이지
└── styles/
    └── ClockPage.css          # 큰 타이머 스타일
```

**핵심 코드:**
```javascript
// ClockPage.jsx
const [currentTime, setCurrentTime] = useState(new Date())

// Current time update every second
useEffect(() => {
  const interval = setInterval(() => {
    setCurrentTime(new Date())
  }, 1000)
  return () => clearInterval(interval)
}, [])

const formatCurrentTime = () => {
  const hours = String(currentTime.getHours()).padStart(2, '0')
  const minutes = String(currentTime.getMinutes()).padStart(2, '0')
  const seconds = String(currentTime.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}
```

**디자인 특징:**
- 전체화면 레이아웃
- 6rem 크기의 큰 시계
- 5rem 크기의 타이머 숫자
- 반투명 카드 디자인
- 반응형 레이아웃 (모바일 대응)

#### 6.3 MonitorPage 헤더 타이머 제거

**변경:**
- MonitorPage에서 큰 타이머 섹션 완전히 제거
- D-day 카운트다운, 상태 배지 모두 제거
- GlobalNav의 작은 타이머로 대체

**이유:**
- 공간 절약
- 일관된 UX (모든 페이지에서 GlobalNav 타이머로 확인 가능)
- 필요시 /clock 페이지에서 큰 화면으로 확인

#### 6.4 공지사항 즉시 표시

**문제점:**
- 공지사항 배너가 `RoomProvider`의 `Suspense` 안에 있어서 Liveblocks 로딩 시 표시 지연

**해결:**
```javascript
// MonitorPage.jsx - 공지사항을 별도 컴포넌트로 분리
function AnnouncementBanner({ announcements }) {
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0)

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (announcements.length <= 1) return
    const interval = setInterval(() => {
      setCurrentAnnouncementIndex((prev) => (prev + 1) % announcements.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [announcements.length])

  // ... 렌더링
}

// RoomProvider 밖으로 이동
return (
  <div className="monitor-page">
    <AnnouncementBanner announcements={announcements} />  {/* 즉시 표시 */}
    <RoomProvider>
      <Suspense>
        <MonitorContent />  {/* Liveblocks 로딩 후 표시 */}
      </Suspense>
    </RoomProvider>
  </div>
)
```

**효과:**
- 공지사항이 페이지 로드 즉시 표시됨
- Liveblocks 연결 상태와 무관하게 작동

#### 6.5 공지사항 새로고침 주기 단축

**변경:**
```javascript
// Before: 30초마다 새로고침
const interval = setInterval(loadDashboardData, 30000)

// After: 10초마다 새로고침
const interval = setInterval(loadDashboardData, 10000)
```

**효과:**
- 관리자가 공지사항 추가 시 최대 10초 이내에 반영
- 더 빠른 실시간 업데이트

#### 6.6 GlobalNav에 "⏰ 시계" 메뉴 추가

**추가 내용:**
```jsx
<Link to="/clock" className="global-nav-link">
  ⏰ 시계
</Link>
```

**라우트 추가:**
```javascript
// App.jsx
<Route path="/clock" element={<ClockPage />} />
```

---

### 7. Flying Emojis 버그 수정 (2025-10-18 추가)

이모지가 키보드 입력 시 2개씩 발생하는 버그를 수정했습니다.

#### 7.1 문제 원인 분석

**증상:**
- 키보드로 숫자키(1-9, 0) 누르면 이모지가 2개씩 발생
- 클릭으로는 1개만 정상 발생

**원인:**
```javascript
// FlyingEmojis.jsx - 키보드 리스너 (1번)
useEffect(() => {
  const handleKeyPress = (e) => {
    // ... 이모지 발생
  }
  window.addEventListener('keypress', handleKeyPress)
}, [])

// FloatingComments.jsx - 키보드 리스너 (2번) ❌ 중복!
useEffect(() => {
  const handleKeyPress = (e) => {
    // ... 이모지 발생
  }
  window.addEventListener('keypress', handleKeyPress)
}, [])
```

**중복 이벤트 발생 과정:**
1. 숫자키 입력
2. FlyingEmojis의 리스너 → `addEmoji()` + `broadcast()` 호출
3. FloatingComments의 리스너 → `handleEmojiClick()` → `local-emoji` 이벤트
4. FlyingEmojis가 `local-emoji` 수신 → `addEmoji()` 다시 호출
5. **총 2개 생성!**

#### 7.2 해결 방법

**1단계: 브로드캐스트 자기 수신 방지**
```javascript
// FlyingEmojis.jsx
import { useSelf } from '@liveblocks/react/suspense'

const self = useSelf() // 현재 사용자 connectionId 획득

useEventListener(({ event, connectionId }) => {
  if (event.type === 'EMOJI_SENT') {
    // 자기 자신이 보낸 이벤트는 무시
    if (self && connectionId === self.connectionId) {
      return
    }
    addEmoji(event.emoji, event.left, event.duration)
  }
})
```

**2단계: FloatingComments 중복 제거**
```javascript
// FloatingComments.jsx
// ❌ 제거: handleEmojiClick 함수
// ❌ 제거: 키보드 이벤트 리스너
// ❌ 제거: 이모지 버튼 클릭 기능

// ✅ 버튼을 <div>로 변경 (클릭 불가)
<div className="emoji-quick-btn disabled">
  <span className="emoji-quick-icon">{emoji}</span>
  <span className="emoji-quick-shortcut">{index + 1}</span>
</div>
```

**3단계: CSS 비활성화 스타일**
```css
/* FloatingComments.css */
.emoji-quick-btn {
  pointer-events: none;  /* 클릭 차단 */
  cursor: default;
  opacity: 0.7;          /* 흐릿하게 표시 */
}
```

**4단계: Input 필드에서 단축키 차단**
```javascript
// FlyingEmojis.jsx - 키보드 리스너
const handleKeyPress = (e) => {
  // Input/textarea에서는 단축키 작동 안 함
  const target = e.target
  if (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable) {
    return
  }
  // ... 이모지 발생 로직
}
```

#### 7.3 결과

**수정 후:**
- ✅ 키보드(1-9, 0) → 이모지 1개만 발생
- ✅ 이모지 버튼은 단축키 안내용으로만 표시
- ✅ Input/textarea에서 숫자 입력 시 이모지 안 나감

**파일 변경:**
- `src/components/FlyingEmojis.jsx` - useSelf 추가, input 필드 체크
- `src/components/FloatingComments.jsx` - 키보드 리스너 제거, 버튼 비활성화
- `src/styles/FloatingComments.css` - 비활성화 스타일

---

### 8. 포스트잇 배치 위치 조정 (2025-10-18 추가)

포스트잇이 화면 가장자리에 너무 가깝게 배치되는 문제를 수정했습니다.

#### 8.1 문제점

**기존 배치:**
- 왼쪽 여백: 2%
- 오른쪽 최대: 83%
- 위쪽 여백: 2%
- 아래쪽 최대: 73%
- 그리드: 3행 × 6열

**문제:**
- 포스트잇이 오른쪽/아래쪽 가장자리에 너무 가깝게 배치
- 포스트잇이 잘리거나 읽기 어려움

#### 8.2 해결 방법

```javascript
// FloatingComments.jsx - findEmptySpace()
const findEmptySpace = (existingNotes) => {
  const noteWidth = 15
  const noteHeight = 15
  const padding = 2

  // 여백 증가
  const marginX = 5  // 2% → 5%
  const maxX = 70    // 83% → 70%
  const marginY = 5  // 2% → 5%
  const maxY = 55    // 73% → 55%

  // 그리드 조정 (6열 → 5열)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {  // 6 → 5
      attempts.push({
        x: marginX + col * 14 + Math.random() * 5,
        y: marginY + row * 18 + Math.random() * 6
      })
    }
  }

  // Fallback 위치도 동일하게 조정
  return {
    x: marginX + Math.random() * maxX,  // 5-75%
    y: marginY + Math.random() * maxY   // 5-60%
  }
}
```

#### 8.3 변경 사항 요약

| 항목 | 변경 전 | 변경 후 | 효과 |
|------|---------|---------|------|
| 왼쪽 여백 | 2% | 5% | 더 안쪽으로 |
| 오른쪽 최대 | 83% | 70% | 가장자리 여유 |
| 위쪽 여백 | 2% | 5% | 더 안쪽으로 |
| 아래쪽 최대 | 73% | 55% | 입력창과 겹침 방지 |
| 그리드 열 | 6열 | 5열 | 새 여백에 맞춤 |

#### 8.4 결과

**수정 후:**
- ✅ 포스트잇이 오른쪽 가장자리에서 더 안쪽에 배치
- ✅ 포스트잇이 아래쪽 입력창과 겹치지 않음
- ✅ 전체적으로 중앙에 모여서 깔끔하게 보임

---

## 관련 문서

이 프로젝트는 여러 문서로 구성되어 있으며, 각각 다른 목적으로 사용됩니다:

### 📖 CLAUDE.md (현재 문서)
**목적:** Claude Code 작업 히스토리 및 기술적 해결 과정 기록

**포함 내용:**
- Liveblocks 통합 과정
- Docker 환경 변수 처리
- JSON 백업 시스템
- 버그 수정 과정 (이모지 중복, 포스트잇 배치 등)
- 코드 예제와 디버깅 로그

**참조 시점:**
- 버그 수정 시 과거 해결 방법 참고
- 새로운 기능 추가 시 기존 패턴 확인
- Docker/환경 설정 문제 해결 시
- Liveblocks 통합 관련 이슈 발생 시

### 🎨 design.md
**목적:** 프로젝트 전체 설계 및 기능 명세

**포함 내용:**
- 시스템 아키텍처 (Frontend, Backend, DB)
- 데이터베이스 설계 (ERD)
- 기능 명세 (사용자 스토리)
- 화면 설계 (와이어프레임)
- API 설계
- Look & Feel (디자인 시스템, 컴포넌트 스타일)

**참조 시점:**
- 새로운 페이지 추가 시 전체 구조 확인
- API 엔드포인트 설계 시
- 데이터베이스 스키마 변경 시
- UI 컴포넌트 디자인 일관성 확인 시
- 게임화 요소 추가 시 (업적, 리더보드 등)

### 🎨 theme.md
**목적:** CSS 테마 및 디자인 토큰 정의

**포함 내용:**
- 컬러 팔레트 (Primary, Accent, Neutral)
- 그라데이션 정의
- 타이포그래피 (폰트, 크기)
- 스페이싱 시스템
- Border Radius 규칙
- 애니메이션 키프레임
- 버튼/카드/아이콘 스타일

**참조 시점:**
- 새로운 컴포넌트 스타일링 시
- 일관된 색상/간격 적용 필요 시
- 애니메이션 효과 추가 시
- 반응형 디자인 구현 시

### 문서 간 관계

```
┌─────────────────┐
│   theme.md      │ ← CSS 변수, 디자인 토큰
└────────┬────────┘
         │ 적용
         ▼
┌─────────────────┐
│   design.md     │ ← 전체 설계, 기능 명세
└────────┬────────┘
         │ 구현
         ▼
┌─────────────────┐
│   CLAUDE.md     │ ← 구현 과정, 버그 수정
└─────────────────┘
```

**작업 순서:**
1. **기획 단계** → `design.md` 참조 (어떤 기능을 만들 것인가?)
2. **디자인 단계** → `theme.md` 참조 (어떻게 보일 것인가?)
3. **구현/디버깅 단계** → `CLAUDE.md` 참조 (어떻게 만들었고, 어떤 문제가 있었는가?)

---

## 파일 구조

```
src/
├── components/
│   ├── CollaborativeEditor.jsx    # Liveblocks + BlockNote 통합
│   ├── GlobalNav.jsx               # 전역 네비게이션 + 작은 타이머
│   ├── FloatingComments.jsx        # 떠다니는 댓글
│   ├── FlyingEmojis.jsx            # 날아다니는 이모지
│   └── PostItWall.jsx              # 포스트잇 벽
├── pages/
│   ├── TopicPage.jsx               # 주제 상세 페이지 (onSave, initialContent 전달)
│   ├── MonitorPage.jsx             # 대시보드 메인 페이지
│   ├── ClockPage.jsx               # 전체화면 시계 페이지
│   ├── HomePage.jsx                # 소개 페이지
│   ├── LoginPage.jsx               # 로그인 페이지
│   ├── RegisterPage.jsx            # 회원가입 페이지
│   └── Admin*.jsx                  # 관리자 페이지들
├── styles/
│   ├── GlobalNav.css               # 전역 네비게이션 스타일
│   ├── MonitorPage.css             # 대시보드 스타일
│   ├── ClockPage.css               # 시계 페이지 스타일
│   └── ...
├── services/
│   └── api.js                      # API 통신 (saveContent, getWorkspace)
└── App.jsx                         # LiveblocksProvider 최상위 배치

workspace/
└── topic_*.json                    # 각 주제별 JSON 백업

server.js                           # Express API 서버
├── GET  /api/workspace/:topicId    # JSON 파일 읽기
├── POST /api/workspace/:topicId/content  # JSON 파일 쓰기
├── GET  /api/announcements         # 공지사항 목록
├── POST /api/announcements         # 공지사항 생성
└── DELETE /api/announcements/:id   # 공지사항 삭제
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
**최종 업데이트:** 2025-10-18 (Flying Emojis 버그 수정 및 포스트잇 배치 조정)

## 문서 업데이트 이력

- **2025-10-18**: Flying Emojis 2개씩 발생 버그 수정, 포스트잇 배치 위치 조정, 문서 간 연관성 추가
- **2025-10-17**: 타이머 시스템 개선, 전체화면 시계 페이지 추가, 공지사항 시스템 개선
- **2025-10-17**: 모니터 대시보드 개선 (관리자 전체 삭제, 팀 현황 토글, 포스트잇 색상 자동 배정)
- **2025-10-17**: Liveblocks 통합, Docker 환경 설정, JSON 백업 시스템 구현
