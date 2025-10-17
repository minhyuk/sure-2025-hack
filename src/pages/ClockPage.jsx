import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import '../styles/ClockPage.css'

function ClockPage() {
  const [settings, setSettings] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [timeUntilStart, setTimeUntilStart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    loadSettings()
  }, [])

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

  // Current time update
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Timer countdown (when hackathon is active)
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

  // D-day countdown (when hackathon is preparing)
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

  const formatCurrentTime = () => {
    const hours = String(currentTime.getHours()).padStart(2, '0')
    const minutes = String(currentTime.getMinutes()).padStart(2, '0')
    const seconds = String(currentTime.getSeconds()).padStart(2, '0')
    return `${hours}:${minutes}:${seconds}`
  }

  const formatCurrentDate = () => {
    const year = currentTime.getFullYear()
    const month = String(currentTime.getMonth() + 1).padStart(2, '0')
    const day = String(currentTime.getDate()).padStart(2, '0')
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const weekday = weekdays[currentTime.getDay()]
    return `${year}년 ${month}월 ${day}일 (${weekday})`
  }

  if (loading) {
    return (
      <div className="clock-page">
        <div className="clock-loading">
          <div className="spinner"></div>
          <p>로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="clock-page">
      <div className="clock-container">
        {/* Current Time */}
        <div className="current-time-section">
          <div className="current-date">{formatCurrentDate()}</div>
          <div className="current-time">{formatCurrentTime()}</div>
        </div>

        {/* Hackathon Timer */}
        {timeRemaining && (
          <div className={`hackathon-timer ${timeRemaining.ended ? 'ended' : ''}`}>
            <div className="timer-title">
              {timeRemaining.ended ? '🏁 해커톤 종료' : '⏱️ 남은 시간'}
            </div>
            <div className="timer-display-large">
              <div className="time-unit-large">
                <span className="time-value-large">{String(timeRemaining.hours).padStart(2, '0')}</span>
                <span className="time-label-large">시간</span>
              </div>
              <span className="time-separator-large">:</span>
              <div className="time-unit-large">
                <span className="time-value-large">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                <span className="time-label-large">분</span>
              </div>
              <span className="time-separator-large">:</span>
              <div className="time-unit-large">
                <span className="time-value-large">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                <span className="time-label-large">초</span>
              </div>
            </div>
          </div>
        )}

        {/* D-day Countdown */}
        {timeUntilStart && (
          <div className="dday-countdown-large">
            <div className="timer-title">
              {timeUntilStart.started ? '🚀 곧 시작' : '📅 시작까지'}
            </div>
            <div className="timer-display-large">
              {timeUntilStart.days > 0 && (
                <>
                  <div className="time-unit-large">
                    <span className="time-value-large">{String(timeUntilStart.days).padStart(2, '0')}</span>
                    <span className="time-label-large">일</span>
                  </div>
                  <span className="time-separator-large">:</span>
                </>
              )}
              <div className="time-unit-large">
                <span className="time-value-large">{String(timeUntilStart.hours).padStart(2, '0')}</span>
                <span className="time-label-large">시간</span>
              </div>
              <span className="time-separator-large">:</span>
              <div className="time-unit-large">
                <span className="time-value-large">{String(timeUntilStart.minutes).padStart(2, '0')}</span>
                <span className="time-label-large">분</span>
              </div>
              <span className="time-separator-large">:</span>
              <div className="time-unit-large">
                <span className="time-value-large">{String(timeUntilStart.seconds).padStart(2, '0')}</span>
                <span className="time-label-large">초</span>
              </div>
            </div>
          </div>
        )}

        {/* Hackathon Ended Status */}
        {settings?.status === 'ended' && (
          <div className="hackathon-status-large">
            <div className="status-icon">🏁</div>
            <div className="status-text">해커톤이 종료되었습니다</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ClockPage
