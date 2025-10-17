# Sure Hackerton 2025 - 설계 문서

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [시스템 아키텍처](#시스템-아키텍처)
3. [데이터베이스 설계](#데이터베이스-설계)
4. [기능 명세](#기능-명세)
5. [화면 설계](#화면-설계)
6. [API 설계](#api-설계)
7. [Look & Feel](#look--feel)
8. [기술 스택](#기술-스택)

---

## 프로젝트 개요

### 🎯 목적
해커톤 참가 팀들이 실시간으로 협업하고, 진행 상황을 공유하며, 서로 응원할 수 있는 인터랙티브 플랫폼

### 🎮 핵심 가치
- **실시간 협업**: 팀별 독립된 작업 공간에서 실시간 협업
- **투명한 진행 상황**: 모든 팀의 진행률을 공개 대시보드에 표시
- **상호 응원**: YouTube 스타일 댓글과 포스트잇으로 서로 응원
- **단계적 진행**: 9단계 마일스톤 시스템으로 명확한 진행 관리

### 👥 사용자 그룹
1. **참가자 (Participant)**: 팀원, 작업 공간 사용
2. **멘토 (Mentor)**: 피드백 제공, 모든 팀 열람 가능
3. **관리자 (Admin)**: 전체 설정, 팀 관리, 해커톤 운영
4. **비로그인 게스트**: 대시보드 열람만 가능

---

## 시스템 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────┐
│                   Frontend (React)              │
│  - React Router (페이지 라우팅)                 │
│  - Liveblocks (실시간 협업)                     │
│  - BlockNote (에디터)                           │
└─────────────────┬───────────────────────────────┘
                  │ REST API
┌─────────────────▼───────────────────────────────┐
│              Backend (Express.js)               │
│  - JWT 인증                                     │
│  - File Upload (Multer)                         │
│  - WebSocket (활동 피드용, 선택)                │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│                 Database (SQLite)               │
│  - users, teams, topics                         │
│  - submissions, achievements                    │
│  - hackathon_settings                           │
└─────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              File System (JSON + 파일)          │
│  - workspace/topic_X_team_Y.json                │
│  - uploads/submissions/*                        │
└─────────────────────────────────────────────────┘
```

### URL 구조

```
공개:
  /                          → 홈페이지 (주제 목록)
  /monitor                   → 전체 화면 대시보드 (비로그인 가능)
  /clock                     → 전체화면 시계 페이지
  /login                     → 로그인
  /register                  → 회원가입

참가자:
  /topic/:topicId            → 주제 상세 + 내 팀 정보
  /topic/:topicId/team/:teamId → 팀 작업 공간 (에디터)
  /my-team                   → 내 팀 대시보드

멘토:
  /teams                     → 전체 팀 목록
  /team/:teamId/review       → 팀 작업 열람 + 피드백

관리자:
  /admin                     → 관리자 대시보드
  /admin/settings            → 해커톤 설정 (타이머, 단계)
  /admin/teams               → 팀 관리
  /admin/topics              → 주제 관리
  /admin/submissions         → 산출물 심사
```

---

## 데이터베이스 설계

### ERD

```
users (사용자)
├─ id (PK)
├─ username (UNIQUE)
├─ email (UNIQUE)
├─ password_hash
├─ display_name
├─ avatar_url
├─ role (participant/mentor/admin)
└─ created_at

teams (팀)
├─ id (PK)
├─ name
├─ topic_id (FK → topics)
├─ color (HEX)
├─ current_stage (1-10)
├─ progress_percentage (계산값)
├─ status (active/completed)
└─ created_at

team_members (팀원)
├─ team_id (PK, FK → teams)
├─ user_id (PK, FK → users)
├─ role (leader/member)
└─ joined_at

topics (주제)
├─ id (PK)
├─ title
├─ description
├─ requirements (JSON 또는 TEXT)
└─ created_at

team_stages (팀 진행 단계)
├─ id (PK)
├─ team_id (FK → teams)
├─ stage_number (1-10)
├─ stage_name
├─ description
├─ file_path (산출물)
├─ file_url (외부 URL)
├─ completed_by (FK → users)
└─ completed_at

submissions (최종 산출물)
├─ id (PK)
├─ team_id (FK → teams)
├─ topic_id (FK → topics)
├─ title
├─ description
├─ file_path
├─ file_type
├─ file_url
├─ submitted_by (FK → users)
├─ submitted_at
├─ status (submitted/reviewed/approved)
└─ reviewer_feedback

hackathon_settings (해커톤 설정)
├─ id (PK)
├─ key (UNIQUE)
├─ value
├─ description
└─ updated_at

활동 피드:
cheers (응원 메시지)
├─ id (PK)
├─ team_id (FK → teams) [선택]
├─ author_name
├─ message
├─ type (comment/emoji/postit)
├─ style (color, position for postit)
└─ created_at

sticky_notes (포스트잇)
├─ id (PK)
├─ author_name
├─ content
├─ color
├─ position_x
├─ position_y
└─ created_at
```

### 핵심 테이블 설명

#### `teams.current_stage`
```
1  = 아이디어 스케치
2  = 구현 시작
3  = 개발중 - 1단계
4  = 개발중 - 2단계
5  = 개발중 - 3단계
6  = 개발중 - 4단계
7  = 개발중 - 5단계
8  = 테스트
9  = 자료 정리
10 = 완료

progress_percentage = (current_stage / 10) * 100
```

#### `hackathon_settings` 기본값
```
is_active         = 'false'
start_time        = '2025-10-17T09:00:00Z'
end_time          = '2025-10-17T18:00:00Z'
current_phase     = 'kickoff' | 'development' | 'presentation' | 'judging'
phase_end_time    = '2025-10-17T12:00:00Z'
monitor_enabled   = 'true'
```

---

## 기능 명세

### 1. 인증 시스템

#### 회원가입
```
입력:
- username (3-20자, 영문/숫자)
- email (이메일 형식 검증)
- password (최소 4자, 해시 저장)
- display_name (표시 이름)
- team_name (자유 입력)
- topic_id (드롭다운 선택)

처리:
1. 입력 검증
2. username, email 중복 체크
3. 비밀번호 해시 (bcrypt)
4. 같은 topic_id + team_name 조합이 있으면 기존 팀에 합류
5. 없으면 새 팀 생성 (색상 랜덤 할당)
6. team_members에 추가
7. JWT 토큰 발급

출력:
- JWT 토큰
- 사용자 정보 (id, username, role, team_id, team_name)
```

#### 로그인
```
입력:
- username (또는 email)
- password

처리:
1. 사용자 존재 여부 확인
2. 비밀번호 검증 (bcrypt.compare)
3. JWT 토큰 발급 (유효기간 24시간)

출력:
- JWT 토큰
- 사용자 정보
```

### 2. 팀 작업 공간

#### 에디터 (Liveblocks + BlockNote)
```
기능:
- 실시간 협업 에디터
- 팀원 커서 표시
- 자동 저장 (5분마다)
- 마지막 사용자 퇴장 시 저장

Liveblocks Room ID:
  topic-{topicId}-team-{teamId}

Workspace 파일:
  workspace/topic_{topicId}_team_{teamId}.json
```

#### 진행 단계 표시
```
┌─────────────────────────────────────────┐
│ 🎯 진행 단계                             │
│ ● ● ● ○ ○ ○ ○ ○ ○ ○                    │
│ 1  2  3  4  5  6  7  8  9  10           │
│                                          │
│ 현재: 개발중 - 1단계 (3/10) - 30% ✓     │
│ 다음: 개발중 - 2단계 →                   │
│                                          │
│ [다음 단계로 진행하기]                   │
└─────────────────────────────────────────┘

버튼 클릭 → 모달 오픈:
┌─────────────────────────────────────────┐
│ ⬆️ 다음 단계로 진행                      │
│                                          │
│ 📝 현재 상황 설명 (필수, 최소 10자):     │
│ ┌─────────────────────────────────────┐ │
│ │ [텍스트 에리어]                      │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ 📎 산출물 첨부 (선택):                   │
│ [파일 선택] 또는 [URL 입력]              │
│                                          │
│ [취소] [진행하기]                        │
└─────────────────────────────────────────┘

검증:
- 설명이 10자 이상인지 확인
- 파일 또는 URL 중 하나 필수 (3단계부터)

처리:
1. team_stages에 레코드 삽입
2. teams.current_stage 증가
3. progress_percentage 재계산
4. 활동 피드에 알림 추가
```

### 3. 모니터 대시보드 (/monitor)

#### Layout 구성

```
Header (고정)
├─ 해커톤 로고 + 타이틀
├─ 남은 시간 (실시간 카운트다운)
└─ 현재 단계 (킥오프/개발/발표/심사)

Main Content (3칼럼)
├─ 좌측: 주제별 팀 진행 현황 (60%)
│   ├─ 주제 제목
│   ├─ 팀 리스트
│   │   ├─ 팀 이름
│   │   ├─ 진행바 (10단계 기반)
│   │   └─ 현재 단계 텍스트
│   └─ 반복...
│
├─ 우측: 실시간 응원 피드 (40%)
│   ├─ YouTube 스타일 흐르는 댓글
│   │   └─ 오른쪽에서 왼쪽으로 흐름
│   │
│   └─ 포스트잇 월
│       └─ 드래그 가능, 실시간 동기화
│
└─ 하단: 응원 입력창 (고정)
    ├─ 텍스트 입력
    ├─ 이모지 버튼 (💬 🔥 ⭐ 💡)
    └─ 전송 버튼
```

#### 주제별 팀 진행 현황

```html
<div class="topic-section">
  <h3>📌 Topic 01: AI 챗봇 개발</h3>

  <div class="team-progress">
    <div class="team-name">Team Alpha</div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: 70%; background: #3B82F6;">
        70%
      </div>
    </div>
    <div class="current-stage">개발중 - 3단계 (7/10)</div>
  </div>

  <div class="team-progress">
    <div class="team-name">Team Beta</div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: 40%; background: #10B981;">
        40%
      </div>
    </div>
    <div class="current-stage">구현 시작 (4/10)</div>
  </div>
</div>
```

#### YouTube 스타일 흐르는 댓글

```javascript
// 구현 방식
setInterval(() => {
  fetch('/api/cheers/recent')
    .then(res => res.json())
    .then(cheers => {
      cheers.forEach(cheer => {
        createFloatingComment(cheer)
      })
    })
}, 3000) // 3초마다 새 댓글 가져오기

function createFloatingComment(cheer) {
  const comment = document.createElement('div')
  comment.className = 'floating-comment'
  comment.textContent = cheer.message
  comment.style.right = '-300px'
  comment.style.top = Math.random() * 80 + '%'

  container.appendChild(comment)

  // CSS 애니메이션으로 오른쪽에서 왼쪽으로 이동
  setTimeout(() => {
    comment.style.right = '100vw'
  }, 100)

  // 10초 후 제거
  setTimeout(() => {
    comment.remove()
  }, 10000)
}
```

```css
.floating-comment {
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  white-space: nowrap;
  transition: right 10s linear;
  pointer-events: none;
  z-index: 100;
}
```

#### 포스트잇 월 (Liveblocks Storage)

```javascript
// Liveblocks Room: monitor-sticky-notes

// Storage 구조
{
  notes: LiveList<{
    id: string
    author: string
    content: string
    color: string
    x: number
    y: number
    createdAt: string
  }>
}

// 컴포넌트
<RoomProvider id="monitor-sticky-notes">
  <StickyNotesBoard />
</RoomProvider>

// 포스트잇 추가
const addStickyNote = () => {
  const notes = storage.get('notes')
  notes.push({
    id: generateId(),
    author: currentUser || 'Anonymous',
    content: inputValue,
    color: selectedColor,
    x: Math.random() * 80,
    y: Math.random() * 80,
    createdAt: new Date().toISOString()
  })
}
```

### 4. 관리자 페이지

#### 해커톤 설정 (/admin/settings)

```
┌─────────────────────────────────────────┐
│ ⚙️ 해커톤 설정                           │
├─────────────────────────────────────────┤
│                                          │
│ 🎬 해커톤 상태                           │
│ ○ 준비 중   ● 진행 중   ○ 종료         │
│                                          │
│ ⏰ 시작 시간                             │
│ [2025-10-17] [09:00]                    │
│                                          │
│ ⏰ 종료 시간                             │
│ [2025-10-17] [18:00]                    │
│                                          │
│ 📍 현재 단계                             │
│ [드롭다운: 킥오프/개발/발표/심사]        │
│                                          │
│ 🖥️ 대시보드 공개                        │
│ ☑️ 모니터 화면 활성화                   │
│                                          │
│ [저장하기]                               │
└─────────────────────────────────────────┘
```

#### 팀 관리 (/admin/teams)

```
┌─────────────────────────────────────────────────────┐
│ 👥 팀 관리                      [새 팀 추가]        │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 🔍 [검색: 팀 이름]  [필터: 전체 주제 ▼]            │
│                                                      │
│ ┌────────────────────────────────────────────────┐ │
│ │ Team Alpha               Topic 01: AI 챗봇     │ │
│ │ 진행률: 70%  |  팀원: 5명  |  단계: 7/10       │ │
│ │ [보기] [편집] [삭제]                           │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
│ ┌────────────────────────────────────────────────┐ │
│ │ Team Beta                Topic 01: AI 챗봇     │ │
│ │ 진행률: 40%  |  팀원: 4명  |  단계: 4/10       │ │
│ │ [보기] [편집] [삭제]                           │ │
│ └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

#### 주제 관리 (/admin/topics)

```
┌─────────────────────────────────────────┐
│ 📝 주제 관리              [새 주제 추가] │
├─────────────────────────────────────────┤
│                                          │
│ Topic 01: AI 챗봇 개발        [편집]    │
│ ┌─────────────────────────────────────┐ │
│ │ 설명:                                │ │
│ │ 자연어 처리를 활용한 대화형 AI...   │ │
│ │                                      │ │
│ │ 요구사항:                            │ │
│ │ - 멀티턴 대화 지원                   │ │
│ │ - 감정 분석 기능                     │ │
│ │ - REST API 제공                      │ │
│ └─────────────────────────────────────┘ │
│ 참여 팀: 3개  |  [삭제]                 │
│                                          │
│ ───────────────────────────────────────  │
│                                          │
│ Topic 02: 블록체인 투표 시스템  [편집]  │
│ ...                                      │
└─────────────────────────────────────────┘
```

### 5. 추가 기능

#### 응원 카운터 (간단 버전)

```
각 팀 옆에 간단한 버튼:
[👍 45] [🔥 32] [⭐ 28] [💡 15]

클릭 시:
1. API 호출 (POST /api/teams/:id/cheer)
2. 카운터 증가
3. 애니메이션 효과 (+1 텍스트 위로 날아감)
4. 활동 피드에 추가

DB 저장 (선택):
team_cheers 테이블
├─ team_id
├─ cheer_type (thumbs_up, fire, star, idea)
└─ count
```

---

## 화면 설계

### 홈페이지 (/)

```
┌───────────────────────────────────────────────────┐
│  SURE HACKERTON 2025                    [로그인]  │
│  AI VIBE CODING CHALLENGE                         │
│                                                    │
│  ⏱️ 해커톤 진행 중! 남은 시간: 3:42:15            │
│  [전체 대시보드 보기 →]                           │
├───────────────────────────────────────────────────┤
│                                                    │
│  📋 해커톤 주제                                    │
│                                                    │
│  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ 01                   │  │ 02               │  │
│  │ AI 챗봇 개발         │  │ 블록체인 투표    │  │
│  │                      │  │                  │  │
│  │ 자연어 처리를 활용..│  │ 탈중앙화 투표... │  │
│  │                      │  │                  │  │
│  │ 참여 팀: 3개         │  │ 참여 팀: 2개     │  │
│  │ [자세히 보기 →]     │  │ [자세히 보기 →] │  │
│  └──────────────────────┘  └──────────────────┘  │
│                                                    │
│  ┌──────────────────────┐                        │
│  │ 03                   │                        │
│  │ IoT 스마트홈         │                        │
│  │ ...                  │                        │
│  └──────────────────────┘                        │
└───────────────────────────────────────────────────┘
```

### 주제 페이지 (/topic/:id)

```
┌─────────────────────────────────────────────────┐
│ ← 돌아가기            Topic 01: AI 챗봇 개발    │
│                                    [관리자 편집] │
├─────────────────────────────────────────────────┤
│                                                  │
│ 📋 프로젝트 설명                                 │
│ 자연어 처리 기술을 활용하여 사용자와 자연스러운 │
│ 대화가 가능한 AI 챗봇을 개발하는 주제입니다.    │
│                                                  │
│ 📌 요구사항                                      │
│ • 멀티턴 대화 지원                               │
│ • 감정 분석 기능 구현                            │
│ • REST API 제공                                  │
│ • 웹 인터페이스 구현                             │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│ 👥 우리 팀: Team Alpha                           │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🎯 진행률: 70% (7/10 단계)                  │ │
│ │ 현재 단계: 개발중 - 3단계                    │ │
│ │                                              │ │
│ │ [팀 작업 공간으로 이동 →]                   │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ 👤 팀원 (5명)                                    │
│ Peter, Sarah, John, Emily, Mike                 │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 팀 작업 공간 (/topic/:id/team/:teamId)

```
┌─────────────────────────────────────────────────────┐
│ ← Topic 01        Team Alpha          LIVE 🟢       │
│                                    [팀 설정] [나가기]│
├─────────────────────────────────────────────────────┤
│ 🎯 진행 단계                                         │
│ ● ● ● ● ● ● ● ○ ○ ○                                │
│ 1  2  3  4  5  6  7  8  9  10                       │
│                                                      │
│ 현재: 개발중 - 3단계 (7/10) - 70% ✓                 │
│ 다음: 개발중 - 4단계 →                               │
│                                                      │
│ [다음 단계로 진행하기]     최근 업데이트: 5분 전     │
├─────────────────────────────────────────────────────┤
│                                                      │
│ ┌──── BlockNote 에디터 ────────────────────────────┐│
│ │                                                   ││
│ │ # 프로젝트 계획                                   ││
│ │                                                   ││
│ │ ## 기술 스택                                      ││
│ │ - Frontend: React                                ││
│ │ - Backend: FastAPI                               ││
│ │ - NLP: OpenAI GPT-4                              ││
│ │                                                   ││
│ │ ## 진행 상황                                      ││
│ │ ✅ 기본 UI 완성                                  ││
│ │ ✅ API 서버 구축                                 ││
│ │ 🔄 GPT-4 통합 중...                              ││
│ │                                                   ││
│ │ [Sarah가 타이핑 중...]                           ││
│ │                                                   ││
│ └───────────────────────────────────────────────────┘│
│                                                      │
│ 👥 현재 작업 중: Peter, Sarah (2명 접속)            │
└─────────────────────────────────────────────────────┘

[다음 단계로 진행하기] 클릭 시 모달:
┌─────────────────────────────────────────┐
│ ⬆️ 개발중 - 4단계로 진행                 │
├─────────────────────────────────────────┤
│                                          │
│ 📝 현재 상황 설명 (필수):                │
│ ┌─────────────────────────────────────┐ │
│ │ GPT-4 API 통합 완료했습니다.        │ │
│ │ 기본 대화 기능 테스트 성공.         │ │
│ │ 다음은 감정 분석 모듈 구현 예정.    │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ 📎 산출물 첨부:                          │
│ [파일 선택: chatbot_v1.zip]              │
│ 또는                                     │
│ [URL: https://github.com/team/repo]     │
│                                          │
│          [취소]        [진행하기]        │
└─────────────────────────────────────────┘
```

### 모니터 대시보드 (/monitor)

```
┌─────────────────────────────────────────────────────────────────┐
│  🔥 SURE HACKERTON 2025 LIVE                                   │
│  ⏱️ 남은 시간: 3:42:15          📍 현재 단계: 개발 중         │
│  [F11로 전체화면]                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────┐  ┌────────────────────────────┐  │
│  │ 📊 팀별 진행 현황        │  │ 💬 실시간 응원              │  │
│  │                          │  │                             │  │
│  │ Topic 01: AI 챗봇       │  │ [흐르는 댓글들]            │  │
│  │ ────────────────────    │  │ 🔥 Team A 화이팅! ─────→  │  │
│  │ 🟦 Team Alpha           │  │ ⭐ 멋지다!! ──────────→   │  │
│  │ ▓▓▓▓▓▓▓░░░ 70%         │  │ 💡 좋은 아이디어! ────→  │  │
│  │ 현재: 개발중-3단계      │  │                             │  │
│  │                          │  │ ─────────────────────      │  │
│  │ 🟩 Team Beta            │  │                             │  │
│  │ ▓▓▓▓░░░░░░ 40%         │  │ 📌 응원의 벽 (포스트잇)    │  │
│  │ 현재: 구현 시작         │  │                             │  │
│  │                          │  │ [노랑]  [파랑]  [핑크]    │  │
│  │ Topic 02: 블록체인      │  │ 화이팅!  굿!    멋져요!   │  │
│  │ ────────────────────    │  │                             │  │
│  │ 🟨 Team Gamma           │  │ [초록]         [보라]     │  │
│  │ ▓▓▓▓▓▓▓▓░░ 80%         │  │ 응원해요!      최고!      │  │
│  │ 현재: 테스트            │  │                             │  │
│  │                          │  │ [+ 포스트잇 추가]          │  │
│  └─────────────────────────┘  └────────────────────────────┘  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 💬 응원 메시지: [입력...]  [💬] [🔥] [⭐] [💡]  [전송]       │
└─────────────────────────────────────────────────────────────────┘
```

---

## API 설계

### 인증

```
POST /api/auth/register
Body: {
  username: string
  email: string
  password: string
  display_name: string
  team_name: string
  topic_id: number
}
Response: {
  token: string
  user: { id, username, role, team_id, team_name }
}

POST /api/auth/login
Body: { username, password }
Response: { token, user }

GET /api/auth/me
Headers: { Authorization: Bearer <token> }
Response: { user }
```

### 팀

```
GET /api/teams
Response: [{ id, name, topic_id, current_stage, progress_percentage, ... }]

GET /api/teams/:id
Response: { team, members: [users], stages: [team_stages] }

POST /api/teams/:id/advance-stage
Headers: { Authorization }
Body: {
  description: string
  file?: File
  file_url?: string
}
Response: { success: true, new_stage: number }

PATCH /api/teams/:id
Headers: { Authorization }
Body: { name?, color?, ... }
Response: { team }
```

### 주제

```
GET /api/topics
Response: [{ id, title, description, requirements, team_count }]

GET /api/topics/:id
Response: { topic, requirements, teams: [{ id, name, progress }] }

PUT /api/topics/:id (admin only)
Body: { title?, description?, requirements? }
Response: { topic }
```

### 워크스페이스

```
GET /api/workspace/:topicId/:teamId
Response: {
  content: { blocks: [...] },
  lastUpdated: string
}

POST /api/workspace/:topicId/:teamId/content
Body: {
  content: [...blocks],
  updated_by: string
}
Response: { success: true }
```

### 응원 시스템

```
GET /api/cheers/recent?limit=20
Response: [{ id, message, type, created_at, team_id? }]

POST /api/cheers
Body: {
  message: string
  type: 'comment' | 'emoji'
  team_id?: number
}
Response: { cheer }

POST /api/teams/:id/cheer
Body: { type: 'thumbs_up' | 'fire' | 'star' | 'idea' }
Response: { count }
```

### 포스트잇 (Liveblocks Storage로 대체 가능)

```
GET /api/sticky-notes
Response: [{ id, author_name, content, color, x, y, created_at }]

POST /api/sticky-notes
Body: {
  author_name: string
  content: string
  color: string
  x: number
  y: number
}
Response: { note }

PUT /api/sticky-notes/:id
Body: { x, y }
Response: { note }

DELETE /api/sticky-notes/:id
Response: { success: true }
```

### 관리자

```
GET /api/admin/settings (admin only)
Response: [{ key, value, description }]

PUT /api/admin/settings (admin only)
Body: { key, value }
Response: { setting }

GET /api/admin/teams (admin only)
Response: [{ team, members, stages }]

DELETE /api/admin/teams/:id (admin only)
Response: { success: true }
```

---

## Look & Feel

### 디자인 시스템

#### 컬러 팔레트

```css
/* Primary Colors */
--primary-blue: #3B82F6;
--primary-purple: #8B5CF6;
--primary-green: #10B981;
--primary-yellow: #F59E0B;
--primary-red: #EF4444;

/* Background */
--bg-dark: #0F172A;
--bg-dark-secondary: #1E293B;
--bg-dark-tertiary: #334155;

/* Text */
--text-primary: #F1F5F9;
--text-secondary: #94A3B8;
--text-muted: #64748B;

/* Accent */
--accent-neon-blue: #00D9FF;
--accent-neon-pink: #FF006E;
--accent-neon-green: #39FF14;

/* Team Colors (랜덤 할당) */
--team-colors: [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6'
];
```

#### 타이포그래피

```css
/* Font Family */
font-family: 'Inter', 'Pretendard', -apple-system, sans-serif;
monospace: 'JetBrains Mono', 'Fira Code', monospace;

/* Font Sizes */
--text-xs: 0.75rem;   /* 12px */
--text-sm: 0.875rem;  /* 14px */
--text-base: 1rem;    /* 16px */
--text-lg: 1.125rem;  /* 18px */
--text-xl: 1.25rem;   /* 20px */
--text-2xl: 1.5rem;   /* 24px */
--text-3xl: 1.875rem; /* 30px */
--text-4xl: 2.25rem;  /* 36px */

/* Heading */
h1: 2.25rem (36px), bold, line-height 1.2
h2: 1.875rem (30px), bold, line-height 1.3
h3: 1.5rem (24px), semibold, line-height 1.4
```

#### 스페이싱

```css
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
--spacing-12: 3rem;    /* 48px */
```

#### 컴포넌트 스타일

**버튼**
```css
.btn-primary {
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}
```

**카드**
```css
.card {
  background: var(--bg-dark-secondary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.card:hover {
  border-color: rgba(59, 130, 246, 0.5);
}
```

**진행바**
```css
.progress-bar {
  width: 100%;
  height: 24px;
  background: var(--bg-dark-tertiary);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3B82F6, #8B5CF6);
  transition: width 0.5s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 12px;
  font-weight: 600;
  font-size: 14px;
}
```

**흐르는 댓글**
```css
.floating-comment {
  position: absolute;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 10px 20px;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: right 10s linear;
  pointer-events: none;
  z-index: 1000;
}

.floating-comment::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 24px;
  padding: 1px;
  background: linear-gradient(135deg, #00D9FF, #FF006E);
  -webkit-mask: linear-gradient(#fff 0 0) content-box,
                linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.3;
}
```

**포스트잇**
```css
.sticky-note {
  width: 150px;
  min-height: 100px;
  padding: 16px;
  background: var(--color);
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  cursor: move;
  user-select: none;
  font-size: 14px;
  line-height: 1.4;
  position: absolute;
  transform: rotate(-2deg);
  transition: transform 0.2s, box-shadow 0.2s;
}

.sticky-note:hover {
  transform: rotate(0deg) scale(1.05);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.sticky-note-colors {
  --yellow: #FEF3C7;
  --blue: #DBEAFE;
  --pink: #FCE7F3;
  --green: #D1FAE5;
  --purple: #EDE9FE;
}
```

### 애니메이션

```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Pulse Dot (LIVE 표시) */
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.pulse-dot {
  animation: pulse 2s infinite;
}

/* Progress Fill */
@keyframes progressFill {
  from { width: 0; }
  to { width: var(--target-width); }
}

/* Floating Up (+1 효과) */
@keyframes floatUp {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-50px);
  }
}

/* Glitch Effect (타이틀용) */
@keyframes glitch {
  0%, 100% { transform: translate(0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(-2px, -2px); }
  60% { transform: translate(2px, 2px); }
  80% { transform: translate(2px, -2px); }
}
```

### 반응형 디자인

```css
/* Breakpoints */
--mobile: 640px;
--tablet: 768px;
--laptop: 1024px;
--desktop: 1280px;

/* Mobile First */
.container {
  padding: 16px;
}

@media (min-width: 768px) {
  .container {
    padding: 24px;
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 32px;
    max-width: 1280px;
    margin: 0 auto;
  }
}

/* Monitor Dashboard - 큰 화면 최적화 */
@media (min-width: 1920px) {
  .monitor-dashboard {
    font-size: 1.2rem;
  }

  .progress-bar {
    height: 32px;
  }

  .floating-comment {
    font-size: 20px;
  }
}
```

---

## 기술 스택

### Frontend
- **React 19** - UI 라이브러리
- **React Router** - 페이지 라우팅
- **Liveblocks** - 실시간 협업 (에디터, 포스트잇)
- **BlockNote** - Notion 스타일 에디터
- **Axios** - HTTP 클라이언트

### Backend
- **Node.js + Express** - API 서버
- **SQLite** - 데이터베이스
- **bcrypt** - 비밀번호 해싱
- **jsonwebtoken** - JWT 인증
- **multer** - 파일 업로드

### DevOps
- **Vite** - 빌드 도구
- **Docker** - 컨테이너화
- **GitHub Actions** - CI/CD (옵션)

### 실시간 동기화
- **Liveblocks Presence** - 커서, 상태 공유
- **Liveblocks Storage** - 포스트잇 동기화
- **Polling** - 타이머, 진행률 (WebSocket 대신 간단한 폴링)

---

## 구현 우선순위

### Phase 1: 기본 인프라 ✅ 완료
- [x] DB 스키마 확장
- [x] 인증 시스템 (회원가입/로그인/JWT)
- [x] 팀 자동 생성/배정 로직
- [x] 기본 API 엔드포인트

### Phase 2: 팀 작업 공간 🔄 진행중
- [x] 라우팅 구조 (Protected Routes)
- [x] 팀별 workspace JSON
- [x] Liveblocks room ID (content-topic-{id})
- [x] 실시간 협업 에디터 (BlockNote + Liveblocks)
- [x] 자동 저장 시스템 (5분마다, 마지막 사용자 퇴장 시)
- [ ] 진행 단계 UI + 로직 (모달, 산출물 제출)

### Phase 3: 모니터 대시보드 ✅ 완료
- [x] 대시보드 레이아웃 (포스트잇 월 + 팀 진행 현황)
- [x] 팀 진행률 표시
- [x] 타이머 시스템 개선
  - [x] GlobalNav에 작은 타이머 추가 (모든 페이지에서 확인 가능)
  - [x] 전체화면 시계 페이지 (/clock)
  - [x] MonitorPage 헤더 타이머 제거 (공간 절약)
  - [x] 상태별 타이머 (진행중/준비중/종료)
- [x] 공지사항 시스템
  - [x] 공지사항 배너 (우선순위별 색상)
  - [x] 자동 슬라이드 (5초마다)
  - [x] 즉시 표시 (Liveblocks Suspense와 분리)
  - [x] 10초마다 자동 새로고침
- [x] YouTube 스타일 흐르는 댓글
- [x] Flying Emojis (실시간 동기화)
- [x] 포스트잇 월 (Liveblocks Storage)
  - [x] 작성자별 색상 자동 배정 (해시 기반)
  - [x] 스마트 배치 (빈 공간 자동 찾기)
  - [x] 100개 제한 (오래된 것 자동 삭제)
  - [x] 관리자 전체 삭제 기능
- [x] 팀 진행 현황 토글 기능
- [x] 소개 페이지 링크

### Phase 4: 관리자 페이지 ⏳ 대기중
- [ ] 해커톤 설정 UI (/admin/settings)
- [ ] 팀 관리 CRUD (/admin/teams)
- [ ] 주제 관리 (/admin/topics)

### Phase 5: 마무리 & 폴리싱 🔄 진행중
- [x] 애니메이션 추가 (일부)
- [ ] 스타일 통일
- [ ] 모바일 반응형
- [ ] 에러 핸들링 강화

### Phase 6: 게임화 요소 💡 계획중
- [ ] 팀별 업적 시스템 (Achievements)
- [ ] 실시간 리더보드
- [ ] 마일스톤 배지
- [ ] 활동 포인트 시스템
- [ ] 응원 반응 카운터 (👍 🔥 ⭐ 💡)

---

## 게임화 요소 (Gamification)

해커톤을 더 재미있고 몰입도 높게 만들기 위한 게임 요소들:

### 1. 팀별 업적 시스템 (Achievements)

**DB 스키마:**
```sql
achievements (업적 정의)
├─ id (PK)
├─ name (예: "빠른 출발", "마라토너", "완벽주의자")
├─ description
├─ icon (emoji)
├─ condition (JSON: {type: 'stage_complete', value: 3})
└─ points (업적 포인트)

team_achievements (팀별 획득 업적)
├─ id (PK)
├─ team_id (FK)
├─ achievement_id (FK)
├─ unlocked_at
└─ unlocked_by (FK → users)
```

**업적 예시:**
```javascript
const achievements = [
  {
    name: "🚀 빠른 출발",
    description: "해커톤 시작 1시간 내 3단계 돌파",
    condition: { type: 'stage_time', stage: 3, hours: 1 },
    points: 50
  },
  {
    name: "🏃 마라토너",
    description: "중간 휴식 없이 5단계 연속 완료",
    condition: { type: 'consecutive_stages', count: 5 },
    points: 100
  },
  {
    name: "✨ 완벽주의자",
    description: "모든 단계 산출물 완벽 제출",
    condition: { type: 'all_submissions', quality: 'perfect' },
    points: 150
  },
  {
    name: "🎉 응원왕",
    description: "다른 팀 포스트잇 10개 이상 작성",
    condition: { type: 'cheers_given', count: 10 },
    points: 30
  },
  {
    name: "⭐ 인기팀",
    description: "응원 메시지 50개 이상 받기",
    condition: { type: 'cheers_received', count: 50 },
    points: 80
  }
]
```

**UI 표시:**
```jsx
// 팀 페이지 상단
<div className="achievements-bar">
  {teamAchievements.map(achievement => (
    <div key={achievement.id} className="achievement-badge unlocked">
      <span className="icon">{achievement.icon}</span>
      <span className="name">{achievement.name}</span>
    </div>
  ))}
  {lockedAchievements.map(achievement => (
    <div key={achievement.id} className="achievement-badge locked">
      <span className="icon">🔒</span>
    </div>
  ))}
</div>
```

### 2. 실시간 리더보드

**표시 방식:**
```
┌─────────────────────────────────────┐
│ 🏆 실시간 순위                       │
├─────────────────────────────────────┤
│ 🥇 Team Alpha        820 pts  (90%) │
│ 🥈 Team Beta         780 pts  (80%) │
│ 🥉 Team Gamma        750 pts  (80%) │
│ 4️⃣  Team Delta        680 pts  (70%) │
│ 5️⃣  Team Echo         620 pts  (60%) │
└─────────────────────────────────────┘
```

**포인트 계산:**
```javascript
const calculateTeamScore = (team) => {
  let score = 0

  // 1. 진행 단계 점수 (10단계 * 50점 = 500점)
  score += team.current_stage * 50

  // 2. 업적 점수 (최대 500점)
  score += team.achievements.reduce((sum, a) => sum + a.points, 0)

  // 3. 응원 받은 횟수 (1개당 1점, 최대 100점)
  score += Math.min(team.cheers_received, 100)

  // 4. 시간 보너스 (빨리 완료할수록 보너스)
  if (team.current_stage === 10) {
    const timeSpent = team.completed_at - hackathon.start_time
    const maxTime = hackathon.end_time - hackathon.start_time
    const timeBonus = Math.floor((1 - timeSpent / maxTime) * 200)
    score += timeBonus
  }

  return score
}
```

### 3. 마일스톤 배지

**시각적 표현:**
```css
.milestone-badge {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.5);
  animation: pulse 2s infinite;
}

.milestone-badge::before {
  content: '🏅';
  font-size: 2rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

**마일스톤 조건:**
- 🏅 **Bronze**: 3단계 완료
- 🥈 **Silver**: 6단계 완료
- 🥇 **Gold**: 9단계 완료
- 💎 **Diamond**: 10단계 완료 + 모든 산출물 제출

### 4. 활동 포인트 시스템

**포인트 부여:**
```javascript
const activityPoints = {
  // 팀 활동
  stage_complete: 50,
  submission_upload: 20,
  early_completion: 30,

  // 응원 활동
  cheer_given: 2,
  cheer_received: 1,
  emoji_sent: 1,

  // 협업 활동
  editor_active_hour: 5,
  team_member_online: 3,
}
```

**실시간 포인트 알림:**
```jsx
// 포인트 획득 시 애니메이션
<div className="point-gain-animation">
  +50 pts 🎉
</div>
```

### 5. 응원 반응 카운터

**UI 개선:**
```jsx
<div className="team-card">
  <h3>{team.name}</h3>
  <div className="cheer-reactions">
    <button onClick={() => sendCheer(team.id, 'thumbs_up')}>
      👍 {team.cheers.thumbs_up || 0}
    </button>
    <button onClick={() => sendCheer(team.id, 'fire')}>
      🔥 {team.cheers.fire || 0}
    </button>
    <button onClick={() => sendCheer(team.id, 'star')}>
      ⭐ {team.cheers.star || 0}
    </button>
    <button onClick={() => sendCheer(team.id, 'idea')}>
      💡 {team.cheers.idea || 0}
    </button>
  </div>
</div>
```

**애니메이션 효과:**
```javascript
const sendCheer = (teamId, type) => {
  // API 호출
  api.sendCheer(teamId, type)

  // 애니메이션 효과 (+1 떠오르기)
  const animation = document.createElement('div')
  animation.className = 'float-up-animation'
  animation.textContent = '+1'
  button.appendChild(animation)

  setTimeout(() => animation.remove(), 1000)
}
```

### 6. 일일 도전 과제 (Daily Challenges)

**예시:**
```javascript
const dailyChallenges = [
  {
    title: "⚡ 스피드러너",
    description: "1시간 내 2단계 완료",
    reward: 100,
    timeLimit: "1 hour"
  },
  {
    title: "🤝 협업왕",
    description: "팀원 3명 이상 동시 접속 1시간 유지",
    reward: 80,
    timeLimit: "1 hour"
  },
  {
    title: "📝 문서화 챔피언",
    description: "에디터에 1000자 이상 작성",
    reward: 60,
    timeLimit: "today"
  }
]
```

### 7. 팀 레벨 시스템

**레벨 업 조건:**
```javascript
const teamLevels = {
  1: { minPoints: 0, title: "신입", color: "#94A3B8" },
  2: { minPoints: 200, title: "초보", color: "#10B981" },
  3: { minPoints: 500, title: "중수", color: "#3B82F6" },
  4: { minPoints: 800, title: "고수", color: "#8B5CF6" },
  5: { minPoints: 1200, title: "전설", color: "#F59E0B" }
}

const getCurrentLevel = (points) => {
  return Object.values(teamLevels)
    .reverse()
    .find(level => points >= level.minPoints)
}
```

**UI 표시:**
```jsx
<div className="team-level-badge" style={{ background: level.color }}>
  <span className="level">Lv.{level.id}</span>
  <span className="title">{level.title}</span>
</div>
```

### 구현 우선순위

1. **1단계**: 응원 반응 카운터 (가장 간단, 즉시 효과)
2. **2단계**: 포인트 시스템 + 리더보드
3. **3단계**: 업적 시스템
4. **4단계**: 마일스톤 배지 + 팀 레벨

---

## 다음 단계

이 설계 문서를 기반으로:
1. 게임화 요소 DB 스키마 작성
2. 포인트 계산 로직 구현
3. 실시간 리더보드 UI
4. 업적 시스템 구현

질문이나 수정 사항이 있으면 말씀해주세요!
