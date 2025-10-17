import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../services/api'
import '../styles/AuthPages.css'

function RegisterPage() {
  const navigate = useNavigate()
  const [topics, setTopics] = useState([])
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    teamName: '',
    topicId: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load topics for selection
    api.getTopics()
      .then(data => setTopics(data))
      .catch(err => console.error('Failed to load topics:', err))
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다')
      setLoading(false)
      return
    }

    if (formData.password.length < 4) {
      setError('비밀번호는 최소 4자 이상이어야 합니다')
      setLoading(false)
      return
    }

    if (formData.username.length < 3 || formData.username.length > 20) {
      setError('아이디는 3~20자 사이여야 합니다')
      setLoading(false)
      return
    }

    if (!formData.topicId) {
      setError('참여 주제를 선택해주세요')
      setLoading(false)
      return
    }

    try {
      const data = await api.register(
        formData.username,
        formData.email,
        formData.password,
        formData.displayName,
        formData.teamName,
        parseInt(formData.topicId)
      )
      console.log('Registration successful:', data.user)

      // Redirect to home page
      navigate('/')
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">SURE HACKERTON</h1>
          <p className="auth-subtitle">AI VIBE CODING CHALLENGE 2025</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2 className="form-title">회원가입</h2>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">아이디 *</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="3-20자 영문/숫자"
              required
              disabled={loading}
              minLength={3}
              maxLength={20}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">이메일 *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호 *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="최소 4자"
              required
              disabled={loading}
              minLength={4}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">비밀번호 확인 *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="비밀번호 재입력"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="displayName">표시 이름 *</label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              placeholder="실명 또는 닉네임"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="teamName">팀 이름 *</label>
            <input
              type="text"
              id="teamName"
              name="teamName"
              value={formData.teamName}
              onChange={handleChange}
              placeholder="팀 이름 (같은 팀원은 동일한 이름 입력)"
              required
              disabled={loading}
            />
            <small className="form-hint">
              같은 팀원들은 동일한 팀 이름을 입력해주세요. 새 팀이 자동 생성되거나 기존 팀에 합류합니다.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="topicId">참여 주제 *</label>
            <select
              id="topicId"
              name="topicId"
              value={formData.topicId}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="">주제를 선택하세요</option>
              {topics.map(topic => (
                <option key={topic.id} value={topic.id}>
                  {String(topic.id).padStart(2, '0')}. {topic.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn-submit"
            disabled={loading}
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>

          <div className="form-footer">
            <p>
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="link">
                로그인
              </Link>
            </p>
            <p>
              <Link to="/intro" className="link">
                ← 소개 페이지로
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterPage
