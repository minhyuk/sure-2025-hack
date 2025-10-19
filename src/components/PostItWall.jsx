import React, { useState } from 'react'
import { useStorage, useMutation } from '@liveblocks/react/suspense'
import '../styles/PostItWall.css'

function PostItWall({ nickname, viewMode }) {

  // Get sticky notes from Liveblocks Storage
  const stickyNotes = useStorage((root) => root.stickyNotes)

  // Mutation to delete a sticky note
  const deleteStickyNote = useMutation(({ storage }, noteId) => {
    const notes = storage.get('stickyNotes')
    notes.delete(noteId)
  }, [])

  // Mutation to clear all sticky notes (admin only)
  const clearAllStickyNotes = useMutation(({ storage }) => {
    const notes = storage.get('stickyNotes')
    // LiveMap doesn't have clear(), so delete all entries one by one
    const allIds = Array.from(notes.keys())
    allIds.forEach(id => notes.delete(id))
  }, [])

  const handleClearAll = () => {
    if (window.confirm('모든 포스트잇을 삭제하시겠습니까?')) {
      clearAllStickyNotes()
    }
  }

  // Check if current user is admin
  const isAdmin = () => {
    return localStorage.getItem('adminAuth') === 'true'
  }

  // Generate consistent avatar emoji based on author name
  const getAvatarForAuthor = (name) => {
    const avatars = [
      '😊', '😎', '🤗', '😄', '🥳', '🤩', '😇', '🙂',
      '😃', '😁', '🤠', '🥰', '😍', '🤓', '😌', '✨',
      '🌟', '⭐', '💫', '🔥', '💪', '👍', '✌️', '🤘'
    ]

    // Simple hash function to get consistent index
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % avatars.length
    return avatars[index]
  }

  // Convert Map to array for rendering
  const notesArray = stickyNotes ? Array.from(stickyNotes.entries()) : []

  // Sort notes by timestamp (newest first) for comment list view
  const sortedNotesArray = [...notesArray].sort((a, b) => {
    return new Date(b[1].timestamp) - new Date(a[1].timestamp)
  })

  // Post-it Wall View
  if (viewMode === 'postit-wall') {
    return (
      <>
        {/* Admin Clear All Button */}
        {isAdmin() && (
          <button
            type="button"
            className="clear-all-button admin-only"
            onClick={handleClearAll}
            title="모든 포스트잇 삭제 (관리자 전용)"
          >
            🗑️ 전체삭제
          </button>
        )}

        {/* No notes message */}
        {notesArray.length === 0 && (
          <div className="no-notes">
            <p>아직 포스트잇이 없습니다. 첫 번째 응원 메시지를 남겨주세요!</p>
          </div>
        )}

        {/* Post-it Wall */}
        {notesArray.length > 0 && (
          <div className="postit-wall">
          {notesArray.map(([id, note]) => (
            <div
              key={id}
              className="sticky-note"
              style={{
                backgroundColor: note.color,
                left: `${note.position.x}%`,
                top: `${note.position.y}%`
              }}
            >
              {/* Delete button - Admin only */}
              {isAdmin() && (
                <button
                  className="delete-button"
                  onClick={() => deleteStickyNote(id)}
                  title="삭제 (관리자 전용)"
                >
                  ×
                </button>
              )}

              <div className="note-content">
                <p className="note-text">{note.text}</p>
              </div>

              <div className="note-footer">
                <span className="note-author">- {note.author}</span>
                <span className="note-time">
                  {new Date(note.timestamp).toLocaleString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          ))}
          </div>
        )}
      </>
    )
  }

  // Comment List View
  return (
    <div className="comment-list">
      {sortedNotesArray.map(([id, note]) => (
        <div key={id} className="comment-item">
          {/* Delete button - Admin only */}
          {isAdmin() && (
            <button
              className="delete-button-list"
              onClick={() => deleteStickyNote(id)}
              title="삭제 (관리자 전용)"
            >
              ×
            </button>
          )}

          {/* Avatar */}
          <div className="comment-avatar">
            {getAvatarForAuthor(note.author)}
          </div>

          {/* Content */}
          <span className="comment-author">{note.author}:</span>
          <span className="comment-text">{note.text}</span>
        </div>
      ))}
    </div>
  )
}

export default PostItWall
