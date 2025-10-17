import React, { useState, useEffect, Suspense } from 'react'
import { RoomProvider } from '@liveblocks/react/suspense'
import { LiveMap } from '@liveblocks/client'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import FloatingComments from '../components/FloatingComments'
import PostItWall from '../components/PostItWall'
import FlyingEmojis from '../components/FlyingEmojis'
import '../styles/MonitorPage.css'

function MonitorPage() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check authentication and load user info
  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = api.isAuthenticated()
      setIsAuthenticated(authenticated)

      if (authenticated) {
        try {
          const user = await api.getCurrentUser()
          setCurrentUser(user)
        } catch (error) {
          console.error('Failed to load user:', error)
        }
      }
    }

    checkAuth()
  }, [])

  // Load dashboard data
  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  // Timer countdown
  useEffect(() => {
    if (!settings?.end_time) return

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

  const loadDashboardData = async () => {
    try {
      const [teamsResponse, settingsData] = await Promise.all([
        api.getDashboardTeams(),
        api.getDashboardSettings()
      ])

      // Extract teams array from response object
      const teamsData = teamsResponse.teams || []

      setTeams(teamsData)
      setSettings(settingsData)
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
    <RoomProvider
      id="monitor-dashboard"
      initialPresence={{}}
      initialStorage={() => ({ stickyNotes: new LiveMap() })}
    >
      <Suspense fallback={
        <div className="monitor-page">
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
          getStageLabel={getStageLabel}
          loadDashboardData={loadDashboardData}
          isAuthenticated={isAuthenticated}
          currentUser={currentUser}
          navigate={navigate}
        />
      </Suspense>
    </RoomProvider>
  )
}

function MonitorContent({ teams, settings, timeRemaining, getStageLabel, loadDashboardData, isAuthenticated, currentUser, navigate }) {
  const [showTeamsPanel, setShowTeamsPanel] = useState(true)

  const handleNavigation = () => {
    if (isAuthenticated && currentUser?.team?.topic_id) {
      navigate(`/topic/${currentUser.team.topic_id}`)
    } else if (!isAuthenticated) {
      navigate('/login')
    }
  }

  const handleLogout = () => {
    api.logout()
    window.location.reload() // Reload to update auth state
  }

  const toggleTeamsPanel = () => {
    setShowTeamsPanel(!showTeamsPanel)
  }

  return (
    <div className="monitor-page">
      {/* Floating Comments Overlay */}
      <FloatingComments />

      {/* Flying Emojis (YouTube Style) - Inside RoomProvider for Liveblocks sync */}
      <FlyingEmojis />

      {/* Header with Timer */}
      <header className="monitor-header">
        <div className="header-content">
          <h1 className="hackathon-title">SURE HACKERTON 2025</h1>
          <p className="hackathon-subtitle">AI VIBE CODING CHALLENGE</p>
        </div>

        {/* Navigation Buttons */}
        <div className="nav-buttons">
          <button
            className="nav-button nav-button-primary"
            onClick={() => navigate('/intro')}
          >
            📖 소개
          </button>

          <button
            className="nav-button nav-button-primary"
            onClick={toggleTeamsPanel}
          >
            {showTeamsPanel ? '👥 팀현황 숨김' : '👥 팀현황 보기'}
          </button>

          {isAuthenticated ? (
            <>
              <button
                className="nav-button nav-button-primary"
                onClick={handleNavigation}
              >
                📝 내 팀 페이지
              </button>
              <button
                className="nav-button nav-button-logout"
                onClick={handleLogout}
              >
                🚪 로그아웃
              </button>
            </>
          ) : (
            <button
              className="nav-button nav-button-primary"
              onClick={handleNavigation}
            >
              🔐 로그인
            </button>
          )}
        </div>

        {timeRemaining && (
          <div className={`timer ${timeRemaining.ended ? 'ended' : ''}`}>
            <div className="timer-label">
              {timeRemaining.ended ? '해커톤 종료' : '남은 시간'}
            </div>
            <div className="timer-display">
              <div className="time-unit">
                <span className="time-value">{String(timeRemaining.hours).padStart(2, '0')}</span>
                <span className="time-label">시간</span>
              </div>
              <span className="time-separator">:</span>
              <div className="time-unit">
                <span className="time-value">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                <span className="time-label">분</span>
              </div>
              <span className="time-separator">:</span>
              <div className="time-unit">
                <span className="time-value">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                <span className="time-label">초</span>
              </div>
            </div>
          </div>
        )}

        {settings?.current_stage && (
          <div className="current-stage">
            <span className="stage-label">현재 단계:</span>
            <span className="stage-value">{getStageLabel(settings.current_stage)}</span>
          </div>
        )}
      </header>

      {/* Main Content - Split Layout */}
      <main className="monitor-main">
        <div className={`monitor-layout ${!showTeamsPanel ? 'full-width' : ''}`}>
          {/* Left Side - Post-It Wall */}
          <section className="postit-section-main">
            <PostItWall currentUser={currentUser} isAuthenticated={isAuthenticated} />
          </section>

          {/* Right Side - Teams Grid (toggleable) */}
          {showTeamsPanel && (
            <section className="teams-section-mini">
              <h2 className="section-title-mini">팀 진행 현황</h2>

              {teams.length === 0 ? (
                <div className="no-teams-mini">
                  <p>팀 없음</p>
                </div>
              ) : (
                <div className="teams-list-mini">
                  {teams.map(team => (
                    <div key={team.id} className="team-card-mini" style={{ borderLeftColor: team.color }}>
                      <div className="team-mini-header">
                        <div
                          className="team-color-dot"
                          style={{ backgroundColor: team.color }}
                        ></div>
                        <h3 className="team-name-mini">{team.name}</h3>
                      </div>

                      <div className="team-mini-info">
                        <span className="team-mini-topic">{team.topic_title}</span>
                        <span className="team-mini-stage">{getStageLabel(team.current_stage)}</span>
                      </div>

                      <div className="progress-bar-mini">
                        <div
                          className="progress-fill-mini"
                          style={{
                            width: `${team.progress_percentage}%`,
                            backgroundColor: team.color
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

export default MonitorPage
