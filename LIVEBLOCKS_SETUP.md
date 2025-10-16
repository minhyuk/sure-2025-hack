# Liveblocks 설정 가이드

## 1. Liveblocks 계정 생성 및 API 키 발급

1. [Liveblocks](https://liveblocks.io) 회원가입
2. Dashboard에서 새 프로젝트 생성
3. API Keys 페이지에서 Public Key 복사

## 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```bash
VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_your_actual_key_here
```

## 3. 패키지 설치

```bash
npm install
```

또는 수동으로:

```bash
npm install @liveblocks/client @liveblocks/react @liveblocks/yjs
```

## 4. 서버 실행

```bash
npm run dev
```

## Liveblocks vs WebRTC 비교

### Liveblocks 장점:
- ✅ 관리형 서비스 (별도 시그널링 서버 불필요)
- ✅ 안정적인 연결 (WebRTC NAT 문제 없음)
- ✅ 자동 재연결 및 충돌 해결
- ✅ 간편한 설정
- ✅ 무료 플랜 제공 (월 1,000 MAU)
- ✅ 내장 presence 기능 (커서, 상태 공유)

### 참고 링크:
- [Liveblocks 문서](https://liveblocks.io/docs)
- [Yjs + Liveblocks 가이드](https://liveblocks.io/docs/guides/how-to-use-liveblocks-with-yjs-and-blocknote)

