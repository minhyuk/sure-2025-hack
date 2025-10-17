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
function Editor({ onSave, initialContent }) {
  const room = useRoom()
  const self = useSelf()
  const others = useOthers()
  const hasChangesRef = useRef(false)
  const autoSaveIntervalRef = useRef(null)
  const isInitializedRef = useRef(false)

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

  // 저장 함수 (즉시 실행)
  const saveContent = useCallback(() => {
    if (!editor || !onSave) return

    try {
      const content = editor.document
      if (content && content.length > 0) {
        console.log('💾 [JSON Backup] Saving to workspace...', content.length, 'blocks')
        onSave(content)
        hasChangesRef.current = false
      }
    } catch (error) {
      console.error('❌ [JSON Backup] Failed to save:', error)
    }
  }, [editor, onSave])

  // 초기 로딩: JSON에서 Liveblocks로 복원
  React.useEffect(() => {
    if (!editor || isInitializedRef.current) return

    // Provider가 sync될 때까지 대기
    setTimeout(() => {
      try {
        // Editor의 실제 document를 체크 (빈 paragraph 1개는 비어있는 것으로 간주)
        const currentDoc = editor.document
        const isEmpty = currentDoc.length === 1 &&
                       currentDoc[0].content.length === 0 &&
                       currentDoc[0].type === 'paragraph'

        console.log('🔍 [Initial Load] Check:', {
          docLength: currentDoc.length,
          isEmpty,
          hasInitialContent: !!initialContent?.blocks,
          initialBlockCount: initialContent?.blocks?.length || 0
        })

        if (isEmpty && initialContent?.blocks && initialContent.blocks.length > 0) {
          console.log('📥 [Initial Load] Loading from JSON to Liveblocks...', initialContent.blocks.length, 'blocks')

          editor.replaceBlocks(editor.document, initialContent.blocks)
          console.log('✅ [Initial Load] Content loaded successfully')
        } else if (!isEmpty) {
          console.log('ℹ️ [Initial Load] Liveblocks already has content, skipping JSON load')
        } else {
          console.log('ℹ️ [Initial Load] No initial content to load')
        }

        isInitializedRef.current = true
      } catch (error) {
        console.error('❌ [Initial Load] Failed to load content:', error)
        isInitializedRef.current = true
      }
    }, 500) // Yjs 동기화 대기 시간 증가
  }, [editor, initialContent])

  // 변경 감지
  React.useEffect(() => {
    if (!editor) return

    const handleChange = () => {
      hasChangesRef.current = true
    }

    editor.onChange(handleChange)
  }, [editor])

  // 5분마다 자동 저장 (변경사항 있을 때만)
  React.useEffect(() => {
    autoSaveIntervalRef.current = setInterval(() => {
      if (hasChangesRef.current) {
        console.log('⏰ [Auto Save] 5-minute interval triggered')
        saveContent()
      }
    }, 5 * 60 * 1000) // 5분

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current)
      }
    }
  }, [saveContent])

  // 마지막 사용자가 나갈 때 저장
  React.useEffect(() => {
    return () => {
      // Cleanup: 내가 나갈 때 다른 사용자가 없으면 저장
      if (others.length === 0 && hasChangesRef.current) {
        console.log('👋 [Last User] Saving before exit...')
        saveContent()
      }
    }
  }, [others.length, saveContent])

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
      <div className="editor-wrapper">
        <BlockNoteView
          editor={editor}
          theme="dark"
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
export default function CollaborativeEditor({ topicId, onSave, initialContent }) {
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
        <Editor onSave={onSave} initialContent={initialContent} />
      </Suspense>
    </RoomProvider>
  )
}
