import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import '../styles/HomePage.css'

function HomePage() {
  const [nickname, setNickname] = useState('')
  const [settings, setSettings] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [timeUntilStart, setTimeUntilStart] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadSettings()
    
    // 이미 닉네임이 저장되어 있으면 MonitorPage로 이동
    const savedNickname = localStorage.getItem('nickname')
    if (savedNickname) {
      navigate('/monitor')
    }
  }, [navigate])

  const loadSettings = async () => {
    try {
      const settingsData = await api.getDashboardSettings()
      setSettings(settingsData)
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  // D-day countdown (preparing 상태)
  useEffect(() => {
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

  // Timer countdown (active 상태)
  useEffect(() => {
    if (!settings?.end_time || settings.status !== 'active') {
      setTimeRemaining(null)
      return
    }

    const updateTimer = () => {
      const now = Date.now()
      const end = new Date(settings.end_time).getTime()
      const remaining = end - now

      if (remaining <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, ended: true })
      } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60))
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
        setTimeRemaining({ hours, minutes, seconds, ended: false })
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [settings])

  const handleEnter = (e) => {
    e.preventDefault()

    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요!')
      return
    }

    // localStorage에 닉네임 저장
    localStorage.setItem('nickname', nickname.trim())

    // GlobalNav에 닉네임 업데이트 알림
    window.dispatchEvent(new Event('nickname-updated'))

    // MonitorPage로 이동
    navigate('/monitor')
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
    <div className="home-page">
      {/* Background Image */}
      <div className="hero-background">
        <img src="/sure.png" alt="SUKATHON" className="background-image" />
      </div>

      {/* Floating Decorations */}
      <div className="floating-decoration star" style={{ top: '10%', left: '10%', fontSize: '2rem' }}>⭐</div>
      <div className="floating-decoration star" style={{ top: '20%', right: '15%', fontSize: '1.5rem' }}>✨</div>
      <div className="floating-decoration star" style={{ bottom: '15%', left: '20%', fontSize: '2.5rem' }}>💫</div>
      <div className="floating-decoration star" style={{ bottom: '25%', right: '10%', fontSize: '1.8rem' }}>🌟</div>

      <div className="container">
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-layout">
            {/* Left Side - Banner */}
            <div className="hero-banner">
              <h1 className="hero-title">SUKATHON</h1>
              <p className="hero-subtitle">AI HACKATHON</p>
              <p className="hero-tagline">INNOVATE · CODE · CREATE</p>

              {/* Event Status Stats */}
              <div className="hero-stats">
              {timeUntilStart ? (
                <div className="stat-card stat-dday">
                  <div className="stat-icon">⏰</div>
                  <div className="stat-content">
                    <div className="stat-label">{timeUntilStart.started ? '종료' : '시작까지'}</div>
                    <div className="stat-countdown">
                      {timeUntilStart.days > 0 && (
                        <div className="countdown-unit">
                          <span className="countdown-value">{timeUntilStart.days}</span>
                          <span className="countdown-text">일</span>
                        </div>
                      )}
                      <div className="countdown-unit">
                        <span className="countdown-value">{String(timeUntilStart.hours).padStart(2, '0')}</span>
                        <span className="countdown-text">시간</span>
                      </div>
                      <div className="countdown-unit">
                        <span className="countdown-value">{String(timeUntilStart.minutes).padStart(2, '0')}</span>
                        <span className="countdown-text">분</span>
                      </div>
                      <div className="countdown-unit">
                        <span className="countdown-value">{String(timeUntilStart.seconds).padStart(2, '0')}</span>
                        <span className="countdown-text">초</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`stat-card stat-status ${settings?.status === 'active' ? 'status-active' : settings?.status === 'ended' ? 'status-ended' : 'status-preparing'}`}>
                  <div className="stat-icon">
                    {settings?.status === 'active' ? '🔴' : settings?.status === 'ended' ? '✅' : '⏳'}
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">
                      {settings?.status === 'active' ? 'LIVE' : settings?.status === 'ended' ? '종료됨' : '준비중'}
                    </div>
                    <div className="stat-label">이벤트 상태</div>
                  </div>
                </div>
              )}
              
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div className="stat-content">
                  <div className="stat-value">2025</div>
                  <div className="stat-label">HACKATHON</div>
                </div>
              </div>
            </div>
            </div>

            {/* Right Side - Entrance Form */}
            <div className="hero-entrance">
              {/* Timer Display */}
              {timeRemaining && !timeRemaining.ended && (
                <div className="hero-timer">
                  <div className="timer-label">⏰ 남은 시간</div>
                  <div className="timer-display">
                    <div className="timer-unit">
                      <span className="timer-value">{String(timeRemaining.hours).padStart(2, '0')}</span>
                      <span className="timer-text">시간</span>
                    </div>
                    <span className="timer-colon">:</span>
                    <div className="timer-unit">
                      <span className="timer-value">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                      <span className="timer-text">분</span>
                    </div>
                    <span className="timer-colon">:</span>
                    <div className="timer-unit">
                      <span className="timer-value">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                      <span className="timer-text">초</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Nickname Input Form */}
              <div className="card entrance-card">
              <h2 className="entrance-title">👤 닉네임을 입력하고 입장하세요</h2>
              <form onSubmit={handleEnter} className="entrance-form">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  className="nickname-input"
                  maxLength={20}
                />
                <button type="submit" className="btn btn-primary">
                  입장하기 →
                </button>
              </form>
              <div className="entrance-info">
                <p>💬 닉네임만 입력하면 바로 응원 활동에 참여할 수 있습니다!</p>
                <p>📝 포스트잇을 붙이고, 댓글을 남기며 함께 해커톤 분위기를 즐겨보세요!</p>
              </div>
            </div>
            </div>
          </div>
        </section>

        {/* Info Section - Remove or keep minimal */}
        <section className="info-section" style={{ display: 'none' }}>
          <div className="grid">
            <div className="card info-card">
              <div className="icon-decoration">📅</div>
              <h3>행사 일시</h3>
              <p>2025년 깜짝 해커톤 이벤트</p>
            </div>
            <div className="card info-card">
              <div className="icon-decoration">📍</div>
              <h3>참여 방법</h3>
              <p>닉네임만 입력하면 즉시 참여 가능</p>
            </div>
            <div className="card info-card">
              <div className="icon-decoration">🎉</div>
              <h3>이벤트 특징</h3>
              <p>실시간 응원과 포스트잇으로 함께 즐기기</p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>© 2025 SUKATHON • AI Hackathon Event</p>
        <p className="footer-credit">POWERED BY Peter (feat. Claude CODE)</p>
      </footer>
    </div>
  )
}

export default HomePage
