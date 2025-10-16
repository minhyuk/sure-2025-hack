import { createClient } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'

// Liveblocks 클라이언트 생성
// 프로덕션에서는 publicApiKey를 사용하거나, 서버에서 인증 토큰을 받아오세요
const client = createClient({
  // 개발 환경: public key 사용
  // 프로덕션: authEndpoint 사용 권장
  publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY || 'pk_dev_your_key_here',
  
  // 또는 서버 인증 사용:
  // authEndpoint: '/api/liveblocks-auth',
  
  // 스로틀링 설정 (옵션)
  throttle: 100,
})

// Room context 생성 (React hooks 제공)
export const {
  suspense: {
    RoomProvider,
    useRoom,
    useMyPresence,
    useUpdateMyPresence,
    useSelf,
    useOthers,
    useOthersMapped,
    useOthersConnectionIds,
    useOther,
    useBroadcastEvent,
    useEventListener,
    useErrorListener,
    useStorage,
    useObject,
    useMap,
    useList,
    useBatch,
    useHistory,
    useUndo,
    useRedo,
    useCanUndo,
    useCanRedo,
    useMutation,
    useStatus,
    useLostConnectionListener,
  },
} = createRoomContext(client)

export default client

