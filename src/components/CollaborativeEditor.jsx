import React, { Suspense, useRef, useCallback } from 'react'
import { RoomProvider } from '@liveblocks/react/suspense'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { LiveblocksYjsProvider } from '@liveblocks/yjs'
import { useRoom, useSelf, useOthers } from '@liveblocks/react/suspense'
import * as Y from 'yjs'
import '@blocknote/mantine/style.css'
import '../styles/NotionEditor.css'

// Editor 컴포넌트 (Room 내부)
function Editor({ onSave }) {
  const room = useRoom()
  const self = useSelf()
  const others = useOthers()
  const lastBlockCountRef = useRef(0)
  const saveTimeoutRef = useRef(null)

  console.log('📝 Editor render:', {
    roomId: room.id,
    selfId: self?.id,
    othersCount: others.length
  })

  // Yjs document 생성
  const doc = React.useMemo(() => new Y.Doc(), [])

  // Liveblocks Yjs Provider 생성
  const provider = React.useMemo(() => {
    console.log('🔗 Creating LiveblocksYjsProvider for room:', room.id)
    return new LiveblocksYjsProvider(room, doc)
  }, [room, doc])

  // BlockNote editor 생성
  const editor = useCreateBlockNote({
    collaboration: {
      provider,
      fragment: doc.getXmlFragment('document-store'),
      user: {
        name: self?.info?.name || 'Anonymous',
        color: self?.info?.color || '#' + Math.floor(Math.random()*16777215).toString(16),
      },
    },
  })

  console.log('✅ Editor created')

  // 저장 함수 (debounced)
  const saveContent = useCallback(() => {
    if (!editor || !onSave) return

    // 기존 타이머 취소
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // 500ms 후 저장 (짧은 debounce)
    saveTimeoutRef.current = setTimeout(() => {
      const content = editor.document
      console.log('💾 Saving to JSON backup...', content.length, 'blocks')
      onSave(content)
    }, 500)
  }, [editor, onSave])

  // 엔터 키 감지 (블럭 추가 시 저장)
  const handleEditorChange = useCallback(() => {
    if (!editor) return

    const currentBlockCount = editor.document?.length || 0

    // 블럭이 추가되었을 때 (엔터 키)
    if (currentBlockCount > lastBlockCountRef.current) {
      console.log('📝 New block added (Enter key), triggering save...')
      saveContent()
    }

    lastBlockCountRef.current = currentBlockCount
  }, [editor, saveContent])

  // 포커스를 잃을 때 저장
  const handleBlur = useCallback(() => {
    console.log('👋 Editor blur, triggering save...')
    saveContent()
  }, [saveContent])

  return (
    <div className="collaborative-editor">
      <div className="editor-toolbar">
        <div className="editor-info">
          <span className="connection-status">
            🟢 연결됨
          </span>
          <span className="users-count">
            👥 {others.length + 1}명 접속 중
          </span>
        </div>
      </div>
      <div className="editor-wrapper" onBlur={handleBlur}>
        <BlockNoteView
          editor={editor}
          theme="dark"
          onChange={handleEditorChange}
        />
      </div>
    </div>
  )
}

// Loading fallback
function EditorLoading() {
  return (
    <div className="editor-loading">
      <div className="loading-spinner">⏳</div>
      <p>에디터 로딩 중...</p>
    </div>
  )
}

// Main component
export default function CollaborativeEditor({ topicId, onSave }) {
  const roomId = `content-topic-${topicId}`

  console.log('🏠 CollaborativeEditor render, roomId:', roomId)

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
      }}
    >
      <Suspense fallback={<EditorLoading />}>
        <Editor onSave={onSave} />
      </Suspense>
    </RoomProvider>
  )
}
