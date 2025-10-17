import React, { useState } from 'react'
import { useStorage, useMutation } from '@liveblocks/react/suspense'
import '../styles/PostItWall.css'

function PostItWall({ currentUser, isAuthenticated }) {
  const [newNote, setNewNote] = useState('')
  const [authorName, setAuthorName] = useState('')

  // Use logged-in user's name
  const getAuthorName = () => {
    if (isAuthenticated && currentUser?.display_name) {
      return currentUser.display_name
    }
    return authorName
  }

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

  // Get sticky notes from Liveblocks Storage
  const stickyNotes = useStorage((root) => root.stickyNotes)

  // Find empty space for new sticky note
  const findEmptySpace = (existingNotes) => {
    // Note size in percentage (approximately 200px width, 180px height)
    const noteWidth = 15  // ~15% width
    const noteHeight = 15 // ~15% height
    const padding = 2     // 2% padding between notes

    // Try multiple positions in a grid covering the full area
    const attempts = []
    for (let row = 0; row < 6; row++) {  // 6 rows (0-85% vertical)
      for (let col = 0; col < 6; col++) {  // 6 columns (0-85% horizontal)
        attempts.push({
          x: col * 14 + Math.random() * 5,  // 0, 14, 28, 42, 56, 70 + random
          y: row * 15 + Math.random() * 5   // 0, 15, 30, 45, 60, 75 + random
        })
      }
    }

    // Check each position for overlap
    for (const pos of attempts) {
      let hasOverlap = false

      for (const note of existingNotes) {
        const dx = Math.abs(pos.x - note.position.x)
        const dy = Math.abs(pos.y - note.position.y)

        // Check if notes overlap
        if (dx < (noteWidth + padding) && dy < (noteHeight + padding)) {
          hasOverlap = true
          break
        }
      }

      if (!hasOverlap) {
        return pos
      }
    }

    // No empty space found, return random position (will overlap)
    return {
      x: Math.random() * 85,  // 0-85% to leave space for note width
      y: Math.random() * 80   // 0-80% to leave space for note height
    }
  }

  // Mutation to add a new sticky note
  const addStickyNote = useMutation(({ storage }, text, author, color) => {
    const notes = storage.get('stickyNotes')
    const newId = Date.now().toString()

    // Get existing notes to find empty space
    const existingNotes = Array.from(notes.entries()).map(([id, note]) => note)
    const position = findEmptySpace(existingNotes)

    // Add new note
    notes.set(newId, {
      id: newId,
      text,
      author,
      color,
      timestamp: new Date().toISOString(),
      position
    })

    // Limit to 100 most recent notes (delete oldest if over 100)
    if (notes.size > 100) {
      // Sort by timestamp to find oldest
      const allNotes = Array.from(notes.entries()).map(([id, note]) => ({
        id,
        timestamp: note.timestamp
      }))
      allNotes.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

      // Delete oldest notes until we have 100
      const toDelete = notes.size - 100
      for (let i = 0; i < toDelete; i++) {
        notes.delete(allNotes[i].id)
      }
    }
  }, [])

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

  const handleSubmit = (e) => {
    e.preventDefault()

    const finalAuthorName = getAuthorName()

    if (!newNote.trim()) {
      alert('메모 내용을 입력해주세요!')
      return
    }

    if (!finalAuthorName.trim()) {
      alert('이름을 입력해주세요!')
      return
    }

    const color = getColorForAuthor(finalAuthorName)
    addStickyNote(newNote, finalAuthorName, color)
    setNewNote('')
    // Don't clear author name - keep it for consecutive posts
  }

  const handleClearAll = () => {
    if (window.confirm('모든 포스트잇을 삭제하시겠습니까?')) {
      clearAllStickyNotes()
    }
  }

  // Check if current user is admin
  const isAdmin = () => {
    return isAuthenticated && currentUser?.username === 'admin'
  }

  // Convert Map to array for rendering
  const notesArray = stickyNotes ? Array.from(stickyNotes.entries()) : []

  return (
    <div className="postit-wall">
      {/* Add Note Form - Compact Single Row */}
      <form className="postit-form" onSubmit={handleSubmit}>
        <div className="form-row">
          {/* Show name input only if not authenticated */}
          {!isAuthenticated && (
            <input
              type="text"
              className="author-input"
              placeholder="이름"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              maxLength={20}
            />
          )}

          {/* Show logged-in user name with their color */}
          {isAuthenticated && currentUser?.display_name && (
            <span
              className="logged-in-name"
              style={{
                background: getColorForAuthor(currentUser.display_name),
                color: '#1E293B'
              }}
            >
              {currentUser.display_name}
            </span>
          )}

          <input
            type="text"
            className="note-input"
            placeholder="응원 메시지를 입력하세요..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            maxLength={200}
          />

          <button type="submit" className="submit-button">
            추가
          </button>

          {/* Admin Clear All Button */}
          {isAdmin() && (
            <button
              type="button"
              className="clear-all-button"
              onClick={handleClearAll}
              title="모든 포스트잇 삭제 (관리자 전용)"
            >
              전체삭제
            </button>
          )}
        </div>
      </form>

      {/* Sticky Notes Display */}
      <div className="sticky-notes-container">
        {notesArray.length === 0 ? (
          <div className="no-notes">
            <p>아직 포스트잇이 없습니다. 첫 번째 응원 메시지를 남겨주세요!</p>
          </div>
        ) : (
          notesArray.map(([id, note]) => (
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
          ))
        )}
      </div>
    </div>
  )
}

export default PostItWall
