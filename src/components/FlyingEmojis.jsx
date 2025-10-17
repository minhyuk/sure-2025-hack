import React, { useState, useCallback, useEffect } from 'react'
import { useBroadcastEvent, useEventListener } from '@liveblocks/react/suspense'
import '../styles/FlyingEmojis.css'

function FlyingEmojis() {
  const [emojis, setEmojis] = useState([])
  const [selectedEmoji, setSelectedEmoji] = useState('👍')

  const emojiOptions = ['👍', '❤️', '🔥', '🎉', '👏', '💪', '✨', '🚀']

  // Broadcast emoji to all users
  const broadcast = useBroadcastEvent()

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
  useEventListener(({ event }) => {
    if (event.type === 'EMOJI_SENT') {
      addEmoji(event.emoji, event.left, event.duration)
    }
  })

  const handleEmojiClick = (emoji) => {
    setSelectedEmoji(emoji)
    const { left, duration } = addEmoji(emoji)

    // Broadcast to other users
    broadcast({
      type: 'EMOJI_SENT',
      emoji,
      left,
      duration,
    })
  }

  // Keyboard shortcut: Press number keys 1-8 to send emojis
  useEffect(() => {
    const handleKeyPress = (e) => {
      const num = parseInt(e.key)
      if (num >= 1 && num <= 8) {
        const emoji = emojiOptions[num - 1]
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
      {/* Emoji Picker */}
      <div className="emoji-picker-bar">
        {emojiOptions.map((emoji, index) => (
          <button
            key={emoji}
            className={`emoji-button ${selectedEmoji === emoji ? 'active' : ''}`}
            onClick={() => handleEmojiClick(emoji)}
            title={`${emoji} (Press ${index + 1})`}
          >
            {emoji}
          </button>
        ))}
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
