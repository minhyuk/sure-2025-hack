import React, { useState, useCallback, useEffect } from 'react'
import { useBroadcastEvent, useEventListener, useSelf } from '@liveblocks/react/suspense'
import '../styles/FlyingEmojis.css'

function FlyingEmojis() {
  const [emojis, setEmojis] = useState([])

  const emojiOptions = ['👍', '❤️', '🔥', '🎉', '👏', '💪', '✨', '🚀', '⭐', '💯']

  // Broadcast emoji to all users
  const broadcast = useBroadcastEvent()
  const self = useSelf() // Get current user's connection ID

  const addEmoji = useCallback((emoji, left = null, duration = null) => {
    const id = Date.now() + Math.random()
    const finalLeft = left !== null ? left : Math.random() * 80 + 10 // 10-90% from left
    const finalDuration = duration !== null ? duration : 3 + Math.random() * 2 // 3-5 seconds

    const newEmoji = {
      id,
      emoji,
      left: finalLeft,
      duration: finalDuration,
    }

    setEmojis(prev => [...prev, newEmoji])

    // Remove emoji after animation completes
    setTimeout(() => {
      setEmojis(prev => prev.filter(e => e.id !== id))
    }, (newEmoji.duration + 0.5) * 1000)

    return { left: finalLeft, duration: finalDuration }
  }, [])

  // Listen for emoji events from other users
  useEventListener(({ event, connectionId }) => {
    if (event.type === 'EMOJI_SENT') {
      // Ignore events from self to prevent duplicate emojis
      if (self && connectionId === self.connectionId) {
        return
      }
      addEmoji(event.emoji, event.left, event.duration)
    }
  })

  // Listen for local emoji events (from FloatingComments)
  useEffect(() => {
    const handleLocalEmoji = (event) => {
      const { emoji, left, duration } = event.detail
      addEmoji(emoji, left, duration)
    }

    window.addEventListener('local-emoji', handleLocalEmoji)
    return () => window.removeEventListener('local-emoji', handleLocalEmoji)
  }, [addEmoji])

  // Removed handleEmojiClick - keyboard only mode

  // Keyboard shortcut: Press number keys 1-9, 0 to send emojis
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignore keyboard shortcuts when user is typing in input fields
      const target = e.target
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const key = e.key
      let index = -1

      if (key >= '1' && key <= '9') {
        index = parseInt(key) - 1
      } else if (key === '0') {
        index = 9  // 0 is 10th emoji (index 9)
      }

      if (index >= 0 && index < emojiOptions.length) {
        const emoji = emojiOptions[index]
        const { left, duration } = addEmoji(emoji)

        // Broadcast to other users
        broadcast({
          type: 'EMOJI_SENT',
          emoji,
          left,
          duration,
        })
      }
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [addEmoji, emojiOptions, broadcast])

  return (
    <div className="flying-emojis-container">
      {/* Emoji Picker with Shortcuts - Display Only (Keyboard Only) */}
      <div className="emoji-picker-bar">
        <div className="emoji-picker-title">빠른 반응 (숫자키 1-9, 0)</div>
        <div className="emoji-buttons-grid">
          {emojiOptions.map((emoji, index) => (
            <div
              key={emoji}
              className="emoji-button"
              title={`${emoji} (키보드 ${index === 9 ? '0' : index + 1})`}
            >
              <span className="emoji-icon">{emoji}</span>
              <span className="emoji-shortcut">{index === 9 ? '0' : index + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Flying Emojis */}
      <div className="emoji-animation-area">
        {emojis.map(({ id, emoji, left, duration }) => (
          <div
            key={id}
            className="flying-emoji"
            style={{
              left: `${left}%`,
              animationDuration: `${duration}s`,
            }}
          >
            {emoji}
          </div>
        ))}
      </div>
    </div>
  )
}

export default FlyingEmojis
