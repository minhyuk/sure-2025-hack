import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../services/api'
import '../styles/HomePage.css'

function HomePage() {
  const [topics, setTopics] = useState([])
  const [settings, setSettings] = useState(null)
  const [timeUntilStart, setTimeUntilStart] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [topicsData, settingsData] = await Promise.all([
        api.getTopics(),
        api.getDashboardSettings()
      ])
      setTopics(topicsData)
      setSettings(settingsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  // D-day countdown (when hackathon is preparing)
  useEffect(() => {
    // Only show D-day when hackathon is preparing and start_time is set
    if (!settings?.start_time || settings.status !== 'preparing') {
      setTimeUntilStart(null)
      return
    }

    const updateDday = () => {
      const now = Date.now()
      const start = new Date(settings.start_time).getTime()
      const remaining = start - now

      if (remaining <= 0) {
        setTimeUntilStart({ days: 0, hours: 0, minutes: 0, seconds: 0, started: true })
      } else {
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24))
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
        setTimeUntilStart({ days, hours, minutes, seconds, started: false })
      }
    }

    updateDday()
    const interval = setInterval(updateDday, 1000)
    return () => clearInterval(interval)
  }, [settings])

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
        <div className="hero-buttons">
          {api.isAuthenticated() ? (
            <Link to="/" className="hero-btn hero-btn-primary">
              대시보드로 이동
            </Link>
          ) : (
            <>
              <Link to="/login" className="hero-btn hero-btn-primary">
                로그인
              </Link>
              <Link to="/register" className="hero-btn hero-btn-secondary">
                회원가입
              </Link>
            </>
          )}
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
        {timeUntilStart ? (
          <div className="stat-item stat-dday">
            <div className="stat-dday-label">{timeUntilStart.started ? 'END' : '시작까지'}</div>
            <div className="stat-dday-countdown">
              {timeUntilStart.days > 0 && (
                <div className="stat-dday-unit">
                  <span className="stat-dday-value">{timeUntilStart.days}</span>
                  <span className="stat-dday-text">일</span>
                </div>
              )}
              <div className="stat-dday-unit">
                <span className="stat-dday-value">{String(timeUntilStart.hours).padStart(2, '0')}</span>
                <span className="stat-dday-text">시간</span>
              </div>
              <div className="stat-dday-unit">
                <span className="stat-dday-value">{String(timeUntilStart.minutes).padStart(2, '0')}</span>
                <span className="stat-dday-text">분</span>
              </div>
              <div className="stat-dday-unit">
                <span className="stat-dday-value">{String(timeUntilStart.seconds).padStart(2, '0')}</span>
                <span className="stat-dday-text">초</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="stat-item">
            <div className="stat-number">
              {settings?.status === 'active' ? 'LIVE' : settings?.status === 'ended' ? 'END' : '준비중'}
            </div>
            <div className="stat-label">상태</div>
          </div>
        )}
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
