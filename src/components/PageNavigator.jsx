import React from 'react'
import '../styles/PageNavigator.css'

function PageNavigator({ topics, currentTopicId, isOpen, onClose, onNavigate, onPrev, onNext }) {
  return (
    <>
      <aside className={`page-navigator ${isOpen ? 'open' : ''}`}>
        <div className="navigator-header">
          <h3>📚 주제 목록</h3>
          <button className="close-nav-btn" onClick={onClose}>×</button>
        </div>
        <div className="navigator-content">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className={`navigator-item ${topic.id === currentTopicId ? 'active' : ''}`}
              onClick={() => {
                onNavigate(topic.id)
                onClose()
              }}
            >
              <span className="navigator-number">{String(topic.id).padStart(2, '0')}</span>
              <span className="navigator-title">{topic.title}</span>
            </div>
          ))}
        </div>
        <div className="navigator-footer">
          <button className="nav-btn prev-btn" onClick={onPrev}>
            ← 이전 주제
          </button>
          <button className="nav-btn next-btn" onClick={onNext}>
            다음 주제 →
          </button>
        </div>
      </aside>
      {isOpen && <div className="navigator-overlay" onClick={onClose}></div>}
    </>
  )
}

export default PageNavigator
