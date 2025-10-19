import React, { useState, useEffect, Suspense } from 'react'
import { RoomProvider } from '@liveblocks/react/suspense'
import { LiveMap } from '@liveblocks/client'
import { api } from '../services/api'
import FloatingComments from '../components/FloatingComments'
import PostItWall from '../components/PostItWall'
import FlyingEmojis from '../components/FlyingEmojis'
import '../styles/MonitorPage.css'

function MonitorPage() {
  const [teams, setTeams] = useState([])
  const [settings, setSettings] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [timeUntilStart, setTimeUntilStart] = useState(null)
  const [nickname, setNickname] = useState(null)
  const [viewMode, setViewMode] = useState('postit-wall') // 'postit-wall' or 'comment-list'

  // Load nickname from localStorage
  useEffect(() => {
    const savedNickname = localStorage.getItem('nickname')
    setNickname(savedNickname)
  }, [])

  // Load dashboard data
  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [])

  // Timer countdown (when hackathon is active)
  useEffect(() => {
    // Only show timer if hackathon is active and end_time is set
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
        // Start time has passed but hackathon not active yet
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

  const loadDashboardData = async () => {
    try {
      const [teamsResponse, settingsData, announcementsData] = await Promise.all([
        api.getDashboardTeams(),
        api.getDashboardSettings(),
        fetch('/api/announcements').then(res => res.json()).catch(() => [])
      ])

      // Extract teams array from response object
      const teamsData = teamsResponse.teams || []

      setTeams(teamsData)
      setSettings(settingsData)
      setAnnouncements(announcementsData || [])
      setLoading(false)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const getStageLabel = (stage) => {
    const stages = {
      1: '아이디어 구상',
      2: '팀 빌딩',
      3: '기획 설계',
      4: '프로토타입',
      5: '개발 진행',
      6: '테스트',
      7: '디버깅',
      8: '최종 마무리',
      9: '발표 준비',
      10: '완료'
    }
    return stages[stage] || `Stage ${stage}`
  }

  if (loading) {
    return (
      <div className="monitor-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>대시보드 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="monitor-page">
        <div className="error-message">
          <h2>오류 발생</h2>
          <p>{error}</p>
          <button onClick={loadDashboardData}>다시 시도</button>
        </div>
      </div>
    )
  }

  return (
    <div className="monitor-page">
      {/* Background Image */}
      <div className="monitor-background">
        <img src="/sure.png" alt="SUKATHON" className="monitor-background-image" />
      </div>

      {/* Floating Decorations */}
      <div className="floating-decoration star" style={{ top: '10%', left: '10%', fontSize: '2rem' }}>⭐</div>
      <div className="floating-decoration star" style={{ top: '20%', right: '15%', fontSize: '1.5rem' }}>✨</div>
      <div className="floating-decoration star" style={{ bottom: '15%', left: '20%', fontSize: '2.5rem' }}>💫</div>
      <div className="floating-decoration star" style={{ bottom: '25%', right: '10%', fontSize: '1.8rem' }}>🌟</div>

      {/* Announcements Banner - Outside RoomProvider for instant display */}
      <AnnouncementBanner announcements={announcements} />

      <RoomProvider
        id="monitor-dashboard"
        initialPresence={{}}
        initialStorage={() => ({ stickyNotes: new LiveMap() })}
      >
        <Suspense fallback={
          <div className="monitor-page-content">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>대시보드 로딩 중...</p>
            </div>
          </div>
        }>
          <MonitorContent
            teams={teams}
            settings={settings}
            timeRemaining={timeRemaining}
            timeUntilStart={timeUntilStart}
            getStageLabel={getStageLabel}
            loadDashboardData={loadDashboardData}
            nickname={nickname}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        </Suspense>
      </RoomProvider>
    </div>
  )
}

function AnnouncementBanner({ announcements }) {
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0)

  // Auto-slide announcements
  useEffect(() => {
    if (announcements.length <= 1) return

    const interval = setInterval(() => {
      setCurrentAnnouncementIndex((prev) => (prev + 1) % announcements.length)
    }, 5000) // 5초마다 슬라이드

    return () => clearInterval(interval)
  }, [announcements.length])

  // Reset index if it's out of bounds
  useEffect(() => {
    if (currentAnnouncementIndex >= announcements.length && announcements.length > 0) {
      setCurrentAnnouncementIndex(0)
    }
  }, [announcements.length, currentAnnouncementIndex])

  // Get current announcement safely
  const currentAnnouncement = announcements[currentAnnouncementIndex]

  if (!currentAnnouncement) return null

  return (
    <div className={`announcement-banner announcement-${currentAnnouncement.priority}`}>
      <div className="announcement-icon">
        {currentAnnouncement.priority === 'urgent' ? '🚨' :
         currentAnnouncement.priority === 'important' ? '⚠️' : '📢'}
      </div>
      <div className="announcement-content">
        <span className="announcement-title">{currentAnnouncement.title}</span>
        <span className="announcement-separator">•</span>
        <span className="announcement-message">{currentAnnouncement.content}</span>
      </div>
      {announcements.length > 1 && (
        <div className="announcement-indicator">
          {announcements.map((_, index) => (
            <div
              key={index}
              className={`announcement-dot ${index === currentAnnouncementIndex ? 'active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MonitorContent({ teams, settings, timeRemaining, timeUntilStart, getStageLabel, loadDashboardData, nickname, viewMode, setViewMode }) {
  const toggleViewMode = () => {
    setViewMode(viewMode === 'postit-wall' ? 'comment-list' : 'postit-wall')
  }

  return (
    <div className="monitor-page-content">
      {/* Floating Comments Overlay */}
      <FloatingComments viewMode={viewMode} toggleViewMode={toggleViewMode} />

      {/* Flying Emojis (YouTube Style) - Inside RoomProvider for Liveblocks sync */}
      <FlyingEmojis />

      {/* Main Content - Full Screen Post-It Wall */}
      <main className="monitor-main">
        <div className="monitor-layout monitor-layout-fullscreen">
          {/* Post-It Wall - Full Screen */}
          <section className="postit-section-fullscreen">
            <PostItWall nickname={nickname} viewMode={viewMode} />
          </section>
        </div>
      </main>
    </div>
  )
}

export default MonitorPage
