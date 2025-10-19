import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/AdminLoginPage.css'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // 이미 로그인되어 있으면 설정 페이지로 이동
  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuth')
    if (adminAuth === 'true') {
      navigate('/admin/settings')
    }
  }, [navigate])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    // 하드코딩된 관리자 계정
    if (username.trim() === 'admin' && password.trim() === 'claude') {
      // localStorage에 관리자 세션 저장
      localStorage.setItem('adminAuth', 'true')

      // 설정 페이지로 이동
      navigate('/admin/settings')
    } else {
      setError('아이디 또는 비밀번호가 잘못되었습니다.')
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <h1>⚙️ 관리자 로그인</h1>
            <p>SURE HACKERTON 2025 관리자 페이지</p>
          </div>

          <form onSubmit={handleSubmit} className="admin-login-form">
            {error && (
              <div className="admin-login-error">
                ⚠️ {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="admin-username">아이디</label>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="admin-password">비밀번호</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="claude"
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="btn btn-admin-login">
              로그인
            </button>
          </form>

          <div className="admin-login-hint">
            💡 ID: admin / PW: claude
          </div>

          <button
            type="button"
            className="btn-back-home"
            onClick={() => navigate('/')}
          >
            ← 홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}
