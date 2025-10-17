import React, { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import '../styles/FloatingComments.css'

function FloatingComments() {
  const [comments, setComments] = useState([])
  const [activeComments, setActiveComments] = useState([])
  const containerRef = useRef(null)
  const commentIdCounter = useRef(0)

  // Load recent cheers/comments
  useEffect(() => {
    loadComments()
    const interval = setInterval(loadComments, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [])

  // Spawn new floating comments
  useEffect(() => {
    if (comments.length === 0) return

    const spawnInterval = setInterval(() => {
      // Pick a random comment
      const randomComment = comments[Math.floor(Math.random() * comments.length)]

      // Create floating comment with unique ID and random lane
      const newComment = {
        ...randomComment,
        floatId: commentIdCounter.current++,
        lane: Math.floor(Math.random() * 5) // 5 lanes
      }

      setActiveComments(prev => [...prev, newComment])

      // Remove after animation completes (duration in CSS)
      setTimeout(() => {
        setActiveComments(prev => prev.filter(c => c.floatId !== newComment.floatId))
      }, 15000) // 15s animation duration

    }, 3000) // Spawn new comment every 3 seconds

    return () => clearInterval(spawnInterval)
  }, [comments])

  const loadComments = async () => {
    try {
      const cheers = await api.getRecentCheers(50)
      setComments(cheers)
    } catch (err) {
      console.error('Failed to load comments:', err)
    }
  }

  const getCommentColor = (type) => {
    switch (type) {
      case 'cheer': return '#10B981' // Green
      case 'question': return '#F59E0B' // Yellow
      case 'tip': return '#8B5CF6' // Purple
      default: return '#3B82F6' // Blue
    }
  }

  return (
    <div className="floating-comments-container" ref={containerRef}>
      {activeComments.map(comment => (
        <div
          key={comment.floatId}
          className="floating-comment"
          style={{
            top: `${comment.lane * 15 + 10}%`,
            backgroundColor: getCommentColor(comment.type),
            animationDuration: '15s',
            animationDelay: '0s'
          }}
        >
          <span className="comment-author">{comment.author_name}</span>
          <span className="comment-separator">:</span>
          <span className="comment-message">{comment.message}</span>
        </div>
      ))}
    </div>
  )
}

export default FloatingComments
