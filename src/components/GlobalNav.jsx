import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import '../styles/GlobalNav.css';

export default function GlobalNav() {
  const [nickname, setNickname] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timeUntilStart, setTimeUntilStart] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadNickname();
    checkAdminAuth();
    loadSettings();

    // localStorage 변경 감지 (다른 컴포넌트에서 닉네임 변경 시)
    const handleStorageChange = (e) => {
      if (e.key === 'nickname') {
        setNickname(e.newValue);
      } else if (e.key === 'adminAuth') {
        setIsAdmin(e.newValue === 'true');
      }
    };

    // Custom event 리스너 (같은 페이지 내 변경 감지용)
    const handleNicknameUpdate = () => {
      loadNickname();
      checkAdminAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('nickname-updated', handleNicknameUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('nickname-updated', handleNicknameUpdate);
    };
  }, []);

  const loadNickname = () => {
    const savedNickname = localStorage.getItem('nickname');
    setNickname(savedNickname);
  };

  const checkAdminAuth = () => {
    const adminAuth = localStorage.getItem('adminAuth');
    setIsAdmin(adminAuth === 'true');
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


  const handleAdminLogout = () => {
    localStorage.removeItem('adminAuth');
    setIsAdmin(false);
    navigate('/');
  };

  const handleChangeNickname = () => {
    if (window.confirm('닉네임을 변경하고 다시 입장하시겠습니까?')) {
      localStorage.removeItem('nickname');
      navigate('/');
      window.location.reload(); // 상태 초기화를 위해 새로고침
    }
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
        <Link to="/monitor" className="global-nav-link">
          🖥️ 대시보드
        </Link>
        <Link to="/clock" className="global-nav-link">
          ⏰ 시계
        </Link>

        {isAdmin ? (
          <>
            <Link to="/admin/settings" className="global-nav-link admin-link">
              ⚙️ 관리자
            </Link>
            <button onClick={handleAdminLogout} className="global-nav-btn">
              🚪 로그아웃
            </button>
          </>
        ) : (
          <>
            {nickname && (
              <>
                <span className="global-nav-user" title="닉네임 변경하려면 클릭">
                  👤 {nickname}
                </span>
                <button
                  onClick={handleChangeNickname}
                  className="global-nav-btn global-nav-btn-change"
                  title="닉네임 변경"
                >
                  🔄 재입장
                </button>
              </>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
