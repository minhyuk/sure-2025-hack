import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import '../styles/AdminLoginModal.css'

export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    // 하드코딩된 관리자 계정
    if (username.trim() === 'admin' && password.trim() === 'claude') {
      // localStorage에 관리자 세션 저장
      localStorage.setItem('adminAuth', 'true')
      
      // 상태 초기화
      setUsername('')
      setPassword('')
      
      // 로그인 성공 콜백
      if (onLoginSuccess) {
        onLoginSuccess()
      }
      
      // 모달 닫기
      onClose()
    } else {
      setError('아이디 또는 비밀번호가 잘못되었습니다.')
    }
  }

  const handleClose = () => {
    setUsername('')
    setPassword('')
    setError('')
    onClose()
  }

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!isOpen) return

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setUsername('')
        setPassword('')
        setError('')
        onClose()
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const modalContent = (
    <div className="admin-modal-overlay" onClick={handleClose}>
      <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>⚙️ 관리자 로그인</h2>
          <button className="admin-modal-close" onClick={handleClose} type="button">
            ✕
          </button>
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
      </div>
    </div>
  )

  // Portal을 사용하여 body에 직접 렌더링
  return createPortal(modalContent, document.body)
}

