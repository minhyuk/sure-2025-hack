import React, { useState, useEffect, useCallback } from 'react'
import { useBroadcastEvent, useMutation } from '@liveblocks/react/suspense'
import { api } from '../services/api'
import '../styles/FloatingComments.css'

function FloatingComments({ viewMode, toggleViewMode }) {
  const [newComment, setNewComment] = useState('')
  const [nickname, setNickname] = useState('')

  // For emojis
  const emojiOptions = ['👍', '❤️', '🔥', '🎉', '👏', '💪', '✨', '🚀', '⭐', '💯']
  const broadcast = useBroadcastEvent()

  // Load nickname from localStorage
  useEffect(() => {
    const savedNickname = localStorage.getItem('nickname')
    setNickname(savedNickname || '익명')
  }, [])

  // Generate consistent color based on author name
  const getColorForAuthor = (name) => {
    const colors = [
      '#FFE66D', // Yellow
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#95E1D3', // Mint
      '#F38181', // Pink
      '#AA96DA', // Purple
      '#FCBAD3', // Light Pink
      '#A8D8EA', // Light Blue
    ]

    // Simple hash function to get consistent index
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % colors.length
    return colors[index]
  }

  // Find empty space for new sticky note (same logic as PostItWall)
  const findEmptySpace = (existingNotes) => {
    const noteWidth = 15
    const noteHeight = 15
    const padding = 2
    const marginX = 2  // Left margin (5%)
    const maxX = 83    // Maximum X (right margin increased for better spacing)
    const marginY = 5  // Top margin (5%)
    const maxY = 55    // Maximum Y (bottom margin increased for better spacing)

    const attempts = []
    // 3 rows, 5 columns grid (adjusted for new margins)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        attempts.push({
          x: marginX + col * 14 + Math.random() * 5,   // 5-75% horizontal with margin
          y: marginY + row * 18 + Math.random() * 6    // 5-60% vertical with spacing
        })
      }
    }

    for (const pos of attempts) {
      let hasOverlap = false

      for (const note of existingNotes) {
        const dx = Math.abs(pos.x - note.position.x)
        const dy = Math.abs(pos.y - note.position.y)

        if (dx < (noteWidth + padding) && dy < (noteHeight + padding)) {
          hasOverlap = true
          break
        }
      }

      if (!hasOverlap) {
        return pos
      }
    }

    // Fallback: random position within safe area with margins
    return {
      x: marginX + Math.random() * maxX,  // 5-75% horizontal
      y: marginY + Math.random() * maxY   // 5-60% vertical
    }
  }

  // Mutation to add a sticky note to PostItWall
  const addStickyNote = useMutation(({ storage }, text, author, color) => {
    const notes = storage.get('stickyNotes')
    const newId = Date.now().toString()

    const existingNotes = Array.from(notes.entries()).map(([id, note]) => note)
    const position = findEmptySpace(existingNotes)

    notes.set(newId, {
      id: newId,
      text,
      author,
      color,
      timestamp: new Date().toISOString(),
      position
    })

    // Limit to 100 most recent notes
    if (notes.size > 100) {
      const allNotes = Array.from(notes.entries()).map(([id, note]) => ({
        id,
        timestamp: note.timestamp
      }))
      allNotes.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

      const toDelete = notes.size - 100
      for (let i = 0; i < toDelete; i++) {
        notes.delete(allNotes[i].id)
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      const message = newComment.trim()
      const author = nickname || '익명'
      
      // Add to PostItWall (Liveblocks)
      const color = getColorForAuthor(author)
      addStickyNote(message, author, color)
      
      // Also send to API for logging
      await api.addCheer(null, author, message, 'comment')
      
      setNewComment('')
    } catch (err) {
      console.error('Failed to send comment:', err)
    }
  }

  // handleEmojiClick removed - emoji handling moved to FlyingEmojis component

  return (
    <div className="unified-input-bar">
        <div className="unified-input-container">
          {/* Emoji Quick Reactions - Display Only (Keyboard Shortcuts) */}
          <div className="emoji-quick-bar">
            <div className="emoji-quick-title">빠른 반응 (숫자키 1-9, 0)</div>
            <div className="emoji-quick-buttons">
              {emojiOptions.map((emoji, index) => (
                <div
                  key={emoji}
                  className="emoji-quick-btn disabled"
                  title={`${emoji} (키보드 ${index === 9 ? '0' : index + 1})`}
                >
                  <span className="emoji-quick-icon">{emoji}</span>
                  <span className="emoji-quick-shortcut">{index === 9 ? '0' : index + 1}</span>
                </div>
              ))}
            </div>

            {/* View Toggle Button */}
            <button
              type="button"
              className="view-mode-toggle"
              onClick={toggleViewMode}
              title={viewMode === 'postit-wall' ? '댓글 리스트로 보기' : '포스트잇으로 보기'}
            >
              {viewMode === 'postit-wall' ? '💬' : '📌'}
            </button>
          </div>

          {/* Comment Input Form */}
          <form onSubmit={handleSubmit} className="comment-input-form">
            <span className="comment-nickname">👤 {nickname}</span>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="응원 메시지를 입력하세요... (Enter로 전송)"
              className="comment-input"
              maxLength={100}
            />
            <button type="submit" className="comment-submit-btn">
              💬 전송
            </button>
          </form>
        </div>
      </div>
  )
}

export default FloatingComments
