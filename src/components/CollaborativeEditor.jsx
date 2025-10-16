import React, { useState, useEffect, useRef } from 'react'
import { useCreateBlockNoteWithLiveblocks } from '@liveblocks/react-blocknote'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import { RoomProvider, useRoom, useOthers, useStatus } from '../liveblocks.config'
import useAutoSave from '../hooks/useAutoSave'
import '../styles/NotionEditor.css'

function CollaborativeEditorInner({
  topicId,
  editorType = 'content',
  initialContent,
  onSave,
  onReloadNeeded
}) {
  const [saveStatus, setSaveStatus] = useState('saved')
  const [lastSaved, setLastSaved] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const lastBlockCountRef = useRef(0)

  // Liveblocks 연결 상태
  const status = useStatus()
  const others = useOthers()
  const connectedUsers = others.length + 1
  const isRoomConnected = status === 'connected'

  console.log(`🚀 Liveblocks Editor for ${editorType}`)
  console.log(`   Room: ${editorType}-topic-${topicId}`)
  console.log(`   Status: ${status}`)

  // Editor 생성 with Liveblocks
  const editor = useCreateBlockNoteWithLiveblocks({
    domAttributes: {
      editor: {
        class: 'bn-editor',
        'data-gramm': 'false',
        'data-gramm_editor': 'false',
        'data-enable-grammarly': 'false',
      }
    },
  })

  // 초기 컨텐츠 로드
  useEffect(() => {
    if (!isInitialized && editor) {
      // 서버 컨텐츠 로드 (Liveblocks가 자동으로 동기화 처리)
      if (initialContent && initialContent.length > 0) {
        console.log(`📥 Loading ${editorType} server content...`, initialContent.length, 'blocks')
        try {
          editor.replaceBlocks(editor.document, initialContent)
          console.log(`✅ ${editorType} content loaded successfully`)
        } catch (err) {
          console.error(`Error loading ${editorType} content:`, err)
        }
      } else {
        console.log(`📝 No ${editorType} server content, starting fresh`)
      }

      setIsInitialized(true)
    }
  }, [editor, isInitialized, initialContent, editorType])

  // 저장 처리
  const handleSave = async () => {
    if (!editor) {
      console.log('⚠️ Editor not ready yet')
      return
    }

    // content 타입만 서버에 저장
    if (editorType !== 'content') {
      setSaveStatus('saved')
      console.log(`ℹ️ ${editorType} section: Real-time sync via Liveblocks only (no server save)`)
      return
    }

    // 연결 확인 (다중 사용자 시)
    if (!isRoomConnected && connectedUsers > 1) {
      console.warn('⚠️ Not connected to Liveblocks room, but saving anyway to prevent data loss')
    }

    try {
      setSaveStatus('saving')
      const content = editor.document

      console.log('💾 [SAVE START] Auto-saving to server JSON...', {
        topicId,
        editorType,
        blockCount: content.length,
        roomConnected: isRoomConnected,
        connectedUsers,
        timestamp: new Date().toISOString()
      })

      await onSave(content, 'Anonymous')

      setSaveStatus('saved')
      setLastSaved(new Date())

      console.log('✅ [SAVE SUCCESS] Saved to server JSON')
      console.log('   → Liveblocks syncs to all connected users')
    } catch (error) {
      console.error('❌ [SAVE FAILED]', error)
      setSaveStatus('error')
    }
  }

  const { triggerSave, saveImmediately } = useAutoSave(handleSave, 3000)

  const handleEditorChange = () => {
    if (saveStatus !== 'saving') {
      setSaveStatus('unsaved')
    }

    // content 타입만 스마트 저장
    if (editorType === 'content' && editor) {
      const currentBlockCount = editor.document?.length || 0

      if (currentBlockCount > lastBlockCountRef.current) {
        console.log('📝 New block added, saving immediately...')
        saveImmediately()
      } else {
        triggerSave()
      }

      lastBlockCountRef.current = currentBlockCount
    } else {
      triggerSave()
    }
  }

  return (
    <section className="editor-section">
      <div className="editor-container">
        <div className="editor-toolbar">
          <div className="editor-info">
            <span className={`save-status ${saveStatus}`}>
              {saveStatus === 'saved' && '✓ 저장됨'}
              {saveStatus === 'saving' && '⏳ 저장 중...'}
              {saveStatus === 'unsaved' && '⚠ 저장 안됨'}
              {saveStatus === 'error' && '❌ 저장 실패'}
            </span>
            <span className={`connected-users ${!isRoomConnected && connectedUsers > 1 ? 'warning' : ''}`}>
              {isRoomConnected ? '🟢' : (connectedUsers > 1 ? '🔴' : '🟡')} {connectedUsers}명 접속 중
              {!isRoomConnected && connectedUsers > 1 && ' (연결 대기 중)'}
            </span>
            {status === 'connecting' && (
              <span className="connection-status">🔄 연결 중...</span>
            )}
            {status === 'reconnecting' && (
              <span className="connection-status">🔄 재연결 중...</span>
            )}
            {lastSaved && editorType === 'content' && (
              <span className="last-saved">
                마지막 저장: {lastSaved.toLocaleTimeString('ko-KR')}
              </span>
            )}
          </div>
        </div>
        {!isRoomConnected && connectedUsers > 1 && (
          <div className="connection-warning">
            ⚠️ Liveblocks 서버에 연결 중입니다. 잠시만 기다려주세요...
          </div>
        )}
        {status === 'disconnected' && (
          <div className="connection-warning">
            ❌ 연결이 끊어졌습니다. 자동으로 재연결을 시도합니다...
          </div>
        )}
        <div className="notion-editor-wrapper">
          {editor && (
            <BlockNoteView
              editor={editor}
              onChange={handleEditorChange}
              theme="dark"
            />
          )}
        </div>
      </div>
    </section>
  )
}

// RoomProvider로 감싸는 wrapper 컴포넌트
function CollaborativeEditor({ topicId, editorType = 'content', ...props }) {
  const roomId = `${editorType}-topic-${topicId}`

  return (
    <RoomProvider 
      id={roomId}
      initialPresence={{
        cursor: null,
      }}
    >
      <CollaborativeEditorInner 
        topicId={topicId}
        editorType={editorType}
        {...props}
      />
    </RoomProvider>
  )
}

export default CollaborativeEditor
