import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb'
import useAutoSave from '../hooks/useAutoSave'
import '../styles/NotionEditor.css'
import '../utils/clearIndexedDB'

function CollaborativeEditor({
  topicId,
  editorType = 'content', // 'content', 'feedback', 'ideas'
  initialContent,
  onSave,
  onReloadNeeded
}) {
  const [saveStatus, setSaveStatus] = useState('saved')
  const [lastSaved, setLastSaved] = useState(null)
  const [connectedUsers, setConnectedUsers] = useState(1)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isRoomConnected, setIsRoomConnected] = useState(false)
  const lastBlockCountRef = useRef(0)
  const errorRecoveryAttemptedRef = useRef(false)
  const indexeddbProviderRef = useRef(null)

  const doc = useMemo(() => new Y.Doc(), [])
  const [serverContentLoaded, setServerContentLoaded] = useState(false)
  const [yjsInitialized, setYjsInitialized] = useState(false)

  // IndexedDB - Disabled for now to prevent cache conflicts
  useEffect(() => {
    console.log('💾 IndexedDB caching: DISABLED (prevents cache conflicts)')
    console.log('   All data is loaded from server and synced via WebRTC only')

    return () => {
      if (indexeddbProviderRef.current) {
        indexeddbProviderRef.current.destroy()
      }
    }
  }, [serverContentLoaded, topicId, doc])

  // WebRTC provider for P2P real-time collaboration
  const provider = useMemo(() => {
    const roomName = `${editorType}-topic-${topicId}`

    console.log(`🚀 Initializing WebRTC P2P collaboration for ${editorType} room:`, roomName)

    const wsHost = window.location.hostname
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const localSignaling = `${wsProtocol}//${wsHost}:5001`

    const webrtcProvider = new WebrtcProvider(roomName, doc, {
      signaling: [localSignaling],
      password: null,
      maxConns: 20,
      filterBcConns: false,
      peerOpts: {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      }
    })

    console.log(`📡 ${editorType} WebRTC Configuration:`)
    console.log('   - Room:', roomName)
    console.log('   - Signaling:', localSignaling)
    console.log('   - BroadcastChannel: enabled (for same-device tabs)')
    console.log('   - WebRTC: enabled (for different devices)')

    const awareness = webrtcProvider.awareness

    webrtcProvider.on('peers', ({ added, removed, webrtcPeers, bcPeers }) => {
      const totalPeers = webrtcPeers.length + bcPeers.length + 1
      const hasActivePeers = webrtcPeers.length > 0 || bcPeers.length > 0

      setConnectedUsers(totalPeers)
      setIsRoomConnected(hasActivePeers)

      // Only log when there's an actual change (added or removed peers)
      if (added.length > 0 || removed.length > 0) {
        console.log(`👥 ${editorType} peers changed:`, {
          added,
          removed,
          webrtcPeers: webrtcPeers.length,
          bcPeers: bcPeers.length,
          totalConnected: totalPeers,
          roomConnected: hasActivePeers
        })
        
        // Detailed peer connection status
        if (added.length > 0) {
          console.log(`  ✅ Peers added: ${added.length}`)
        }
        if (removed.length > 0) {
          console.log(`  ❌ Peers removed: ${removed.length}`)
          console.warn(`  ⚠️ WebRTC peer disconnected - possible causes:`)
          console.warn(`     - Network timeout`)
          console.warn(`     - NAT traversal failure`)
          console.warn(`     - Signaling server issue`)
        }
      }
    })
    
    // Add synced event listener
    webrtcProvider.on('synced', ({ synced }) => {
      console.log(`🔄 ${editorType} sync status: ${synced ? 'SYNCED' : 'NOT SYNCED'}`)
    })
    
    // Add connection status listener
    webrtcProvider.on('status', ({ status }) => {
      console.log(`📶 ${editorType} provider status: ${status}`)
    })

    if (awareness) {
      awareness.on('update', () => {
        const states = awareness.getStates()
        setConnectedUsers(states.size)
        // Only log awareness updates when user count changes
        // (awareness updates happen frequently for cursor positions)
      })

      awareness.on('change', ({ added, updated, removed }) => {
        // Only log when users actually join/leave (not just cursor movement)
        if (added.length > 0 || removed.length > 0) {
          console.log(`👤 ${editorType} awareness changed:`, { 
            added: added.length, 
            removed: removed.length 
          })
        }
      })
    }

    console.log(`✅ ${editorType} WebRTC Provider initialized`)

    return webrtcProvider
  }, [topicId, doc, editorType])

  // Periodic connection status check
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (provider && provider.awareness) {
        const states = provider.awareness.getStates()
        const peerCount = states.size

        const webrtcPeers = provider.room?.webrtcConns?.size || 0
        const bcPeers = provider.room?.bcConns?.size || 0
        const hasActivePeers = webrtcPeers > 0 || bcPeers > 0

        setConnectedUsers(peerCount)
        setIsRoomConnected(hasActivePeers)
      }
    }, 2000)

    return () => clearInterval(checkInterval)
  }, [provider])

  // Initialize
  useEffect(() => {
    if (!yjsInitialized) {
      if (initialContent && initialContent.length > 0) {
        console.log(`📥 Server has ${editorType} content:`, initialContent.length, 'blocks (will load after editor init)')
      } else {
        console.log(`📝 No ${editorType} server content, starting fresh`)
      }

      setYjsInitialized(true)
      setServerContentLoaded(true)
    }
  }, [initialContent, yjsInitialized, editorType])

  const editor = useCreateBlockNote({
    collaboration: {
      provider,
      fragment: doc.getXmlFragment('document-store'),
      user: {
        name: 'Anonymous',
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
      },
    },
    domAttributes: {
      editor: {
        class: 'bn-editor',
        'data-gramm': 'false',
        'data-gramm_editor': 'false',
        'data-enable-grammarly': 'false',
      }
    },
  })

  // Load server content AFTER editor is ready
  useEffect(() => {
    if (!isInitialized && editor && yjsInitialized) {
      const fragment = doc.getXmlFragment('document-store')

      // Clear Yjs document first to prevent conflicts
      doc.transact(() => {
        while (fragment.length > 0) {
          fragment.delete(0)
        }
      })

      if (initialContent && initialContent.length > 0) {
        console.log(`📥 Loading ${editorType} server content (source of truth)...`, initialContent.length, 'blocks')

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
      setServerContentLoaded(true)
    }
  }, [editor, isInitialized, yjsInitialized, doc, initialContent, editorType])

  // Smart error recovery - only for content type
  useEffect(() => {
    if (editorType !== 'content') return

    const handleError = async (event) => {
      if (event.error?.message?.includes('Position') &&
          event.error?.message?.includes('out of range')) {

        console.error('⚠️ Cache conflict detected (Position out of range)')
        event.preventDefault()

        if (errorRecoveryAttemptedRef.current) {
          console.error('❌ Recovery already attempted, manual intervention needed')
          console.log('💡 Try: window.clearTopicCache(' + topicId + ') then refresh')
          return
        }

        errorRecoveryAttemptedRef.current = true
        console.log('🔧 Attempting automatic recovery...')

        try {
          if (indexeddbProviderRef.current) {
            console.log('   1/4 Closing IndexedDB connection...')
            indexeddbProviderRef.current.destroy()
            indexeddbProviderRef.current = null
          }

          console.log('   2/4 Clearing stale cache...')
          const dbVersions = ['', '-v2', '-v3', '-v4', '-v5']
          for (const version of dbVersions) {
            const dbName = `topic-${topicId}${version}`
            try {
              await new Promise((resolve) => {
                const request = window.indexedDB.deleteDatabase(dbName)
                request.onsuccess = () => resolve()
                request.onerror = () => resolve()
                request.onblocked = () => resolve()
              })
            } catch (err) {
              console.warn(`   - Failed to delete ${dbName}:`, err.message)
            }
          }

          console.log('   3/4 Clearing in-memory document...')
          const fragment = doc.getXmlFragment('document-store')
          doc.transact(() => {
            while (fragment.length > 0) {
              fragment.delete(0)
            }
          })

          console.log('   4/4 Fetching latest content from server...')
          if (editor && onReloadNeeded) {
            const latestContent = await onReloadNeeded()
            if (latestContent && latestContent.length > 0) {
              editor.replaceBlocks(editor.document, latestContent)
              console.log('✅ Recovery successful! Reloaded', latestContent.length, 'blocks from server')
              console.log('   📅 Server timestamp:', new Date().toISOString())

              const dbName = `topic-${topicId}-v5`
              const provider = new IndexeddbPersistence(dbName, doc)
              indexeddbProviderRef.current = provider

              console.log('💾 IndexedDB reconnected with fresh cache')
            } else {
              console.log('⚠️ No server content available for recovery')
            }
          } else {
            console.error('⚠️ Cannot reload: onReloadNeeded callback not provided')
          }

        } catch (recoveryError) {
          console.error('❌ Automatic recovery failed:', recoveryError)
          console.log('💡 Please refresh the page manually')
        }
      }
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [topicId, doc, editor, onReloadNeeded, editorType])

  // Cleanup on unmount only (not when provider reference changes)
  useEffect(() => {
    const currentProvider = provider
    const currentIndexeddbProvider = indexeddbProviderRef.current
    
    return () => {
      console.log(`🧹 Cleaning up ${editorType} providers on unmount`)
      currentProvider.destroy()
      if (currentIndexeddbProvider) {
        currentIndexeddbProvider.destroy()
      }
    }
  }, []) // Empty deps = cleanup only on unmount

  const handleSave = async () => {
    if (!editor) {
      console.log('⚠️ Editor not ready yet')
      return
    }

    // Only content type saves to server
    if (editorType !== 'content') {
      // For feedback/ideas, just update UI status (WebRTC handles sync)
      setSaveStatus('saved')
      console.log(`ℹ️ ${editorType} section: Real-time sync via WebRTC only (no server save)`)
      return
    }

    // Safety check: Only save if we're synced with other users
    // Allow saving when:
    // - User is alone (connectedUsers === 1)
    // - Connected to room (isRoomConnected === true)
    // Note: If multiple users but not connected, we still allow save to prevent data loss
    // WebRTC will handle conflict resolution when connection is re-established
    if (!isRoomConnected && connectedUsers > 1) {
      console.warn('⚠️ Not connected to collaboration room, but saving anyway to prevent data loss')
      console.log('   WebRTC will sync changes when connection is restored')
      // Don't return - allow save to continue
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
      console.log('   → WebRTC broadcasts to connected users')
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

    // Only content type uses smart save
    if (editorType === 'content') {
      const currentBlockCount = editor?.document?.length || 0

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
            {lastSaved && editorType === 'content' && (
              <span className="last-saved">
                마지막 저장: {lastSaved.toLocaleTimeString('ko-KR')}
              </span>
            )}
          </div>
        </div>
        {!isRoomConnected && connectedUsers > 1 && (
          <div className="connection-warning">
            ⚠️ 다른 사용자와 동기화 연결 중... 연결될 때까지 저장이 일시 중단됩니다.
          </div>
        )}
        <div className="notion-editor-wrapper">
          <BlockNoteView
            editor={editor}
            onChange={handleEditorChange}
            theme="dark"
          />
        </div>
      </div>
    </section>
  )
}

export default CollaborativeEditor
