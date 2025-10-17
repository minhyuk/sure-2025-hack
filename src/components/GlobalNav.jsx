import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import '../styles/GlobalNav.css';

export default function GlobalNav() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timeUntilStart, setTimeUntilStart] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
    loadSettings();
  }, []);

  const loadUser = async () => {
    if (api.isAuthenticated()) {
      try {
        const userData = await api.getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    }
  };

  const loadSettings = async () => {
    try {
      const settingsData = await api.getDashboardSettings();
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  // Timer countdown (when hackathon is active)
  useEffect(() => {
    if (!settings?.end_time || settings.status !== 'active') {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const end = new Date(settings.end_time).getTime();
      const remaining = end - now;

      if (remaining <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, ended: true });
      } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setTimeRemaining({ hours, minutes, seconds, ended: false });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [settings]);

  // D-day countdown (when hackathon is preparing)
  useEffect(() => {
    if (!settings?.start_time || settings.status !== 'preparing') {
      setTimeUntilStart(null);
      return;
    }

    const updateDday = () => {
      const now = Date.now();
      const start = new Date(settings.start_time).getTime();
      const remaining = start - now;

      if (remaining <= 0) {
        setTimeUntilStart({ days: 0, hours: 0, minutes: 0, seconds: 0, started: true });
      } else {
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setTimeUntilStart({ days, hours, minutes, seconds, started: false });
      }
    };

    updateDday();
    const interval = setInterval(updateDday, 1000);
    return () => clearInterval(interval);
  }, [settings]);

  const handleLogout = () => {
    api.logout();
    setUser(null);
    navigate('/');
    window.location.reload(); // Refresh to update auth state
  };

  return (
    <nav className="global-nav">
      <div className="global-nav-left">
        <Link to="/" className="global-nav-logo">
          🏆 SURE HACKERTON 2025
        </Link>
      </div>

      {/* Mini Timer */}
      {(timeRemaining || timeUntilStart) && (
        <div className="global-nav-timer">
          {timeRemaining && (
            <Link to="/clock" className="timer-mini">
              <span className="timer-mini-label">{timeRemaining.ended ? '종료' : '남은 시간'}</span>
              <span className="timer-mini-value">
                {String(timeRemaining.hours).padStart(2, '0')}:
                {String(timeRemaining.minutes).padStart(2, '0')}:
                {String(timeRemaining.seconds).padStart(2, '0')}
              </span>
            </Link>
          )}
          {timeUntilStart && (
            <Link to="/clock" className="timer-mini timer-dday">
              <span className="timer-mini-label">{timeUntilStart.started ? 'END' : '시작까지'}</span>
              <span className="timer-mini-value">
                {timeUntilStart.days > 0 && `${timeUntilStart.days}d `}
                {String(timeUntilStart.hours).padStart(2, '0')}:
                {String(timeUntilStart.minutes).padStart(2, '0')}:
                {String(timeUntilStart.seconds).padStart(2, '0')}
              </span>
            </Link>
          )}
        </div>
      )}

      <div className="global-nav-right">
        <Link to="/" className="global-nav-link">
          🖥️ 대시보드
        </Link>
        <Link to="/intro" className="global-nav-link">
          📖 소개
        </Link>
        <Link to="/clock" className="global-nav-link">
          ⏰ 시계
        </Link>

        {user ? (
          <>
            {user.role === 'admin' && (
              <Link to="/admin/settings" className="global-nav-link admin-link">
                ⚙️ 관리자
              </Link>
            )}
            <span className="global-nav-user">
              👤 {user.display_name || user.username}
            </span>
            <button onClick={handleLogout} className="global-nav-btn">
              🚪 로그아웃
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="global-nav-btn">
              로그인
            </Link>
            <Link to="/register" className="global-nav-btn global-nav-btn-primary">
              회원가입
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
