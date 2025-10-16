import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import '../styles/HomePage.css'

function HomePage() {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadTopics()
  }, [])

  const loadTopics = async () => {
    try {
      const data = await api.getTopics()
      setTopics(data)
    } catch (error) {
      console.error('Failed to load topics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTopicClick = (topicId) => {
    navigate(`/topic/${topicId}`)
  }

  if (loading) {
    return (
      <div className="container loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container home-page">
      <header className="hero">
        <div className="glitch-wrapper">
          <h1 className="glitch" data-text="SURE HACKERTON">SURE HACKERTON</h1>
        </div>
        <div className="subtitle">
          <p className="neon-text">AI VIBE CODING CHALLENGE 2025</p>
          <div className="tagline">혁신을 코딩하다 • 미래를 창조하다</div>
        </div>
        <div className="hero-decoration">
          <div className="scan-line"></div>
          <div className="grid-bg"></div>
        </div>
      </header>

      <section className="stats">
        <div className="stat-item">
          <div className="stat-number">{topics.length}</div>
          <div className="stat-label">주제</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">LIVE</div>
          <div className="stat-label">상태</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">2025</div>
          <div className="stat-label">연도</div>
        </div>
      </section>

      <section className="topics-section">
        <h2 className="section-title">
          <span className="bracket">[</span>
          해커톤 주제
          <span className="bracket">]</span>
        </h2>
        <div className="topics-grid">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="topic-card"
              onClick={() => handleTopicClick(topic.id)}
            >
              <div className="topic-number">{String(topic.id).padStart(2, '0')}</div>
              <h3 className="topic-title">{topic.title}</h3>
              <p className="topic-description">{topic.description}</p>
              <div className="topic-footer">
                <span className="topic-link">자세히 보기 →</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <p>© 2025 Sure Hackerton • AI Vibe Coding Challenge</p>
          <div className="footer-decoration">
            <span className="pulse-dot"></span>
            <span className="footer-text">POWERED BY Peter(feat. Claude CODE)</span>
            <span className="pulse-dot"></span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage
