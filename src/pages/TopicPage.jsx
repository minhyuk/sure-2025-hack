import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import CollaborativeEditor from '../components/CollaborativeEditor'
import PageNavigator from '../components/PageNavigator'
import '../styles/TopicPage.css'

function TopicPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [topic, setTopic] = useState(null)
  const [allTopics, setAllTopics] = useState([])
  const [workspace, setWorkspace] = useState(null)
  const [showNavigator, setShowNavigator] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyPress = (e) => {
      if (e.altKey) {
        switch(e.key) {
          case 'n':
            e.preventDefault()
            setShowNavigator(prev => !prev)
            break
          case '[':
            e.preventDefault()
            goToPrevTopic()
            break
          case ']':
            e.preventDefault()
            goToNextTopic()
            break
        }
      }
      if (e.key === 'Escape') {
        setShowNavigator(false)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [id, allTopics])

  const loadData = async () => {
    setLoading(true)
    try {
      const [topicData, workspaceData, topicsData] = await Promise.all([
        api.getTopic(id),
        api.getWorkspace(id),
        api.getTopics()
      ])
      setTopic(topicData)
      setWorkspace(workspaceData)
      setAllTopics(topicsData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const goToPrevTopic = () => {
    const currentIndex = allTopics.findIndex(t => t.id === parseInt(id))
    if (currentIndex > 0) {
      navigate(`/topic/${allTopics[currentIndex - 1].id}`)
    }
  }

  const goToNextTopic = () => {
    const currentIndex = allTopics.findIndex(t => t.id === parseInt(id))
    if (currentIndex < allTopics.length - 1) {
      navigate(`/topic/${allTopics[currentIndex + 1].id}`)
    }
  }

  const handleContentSave = async (content, updatedBy) => {
    try {
      await api.saveContent(id, content, updatedBy)
      // Reload workspace to get updated data
      const updatedWorkspace = await api.getWorkspace(id)
      setWorkspace(updatedWorkspace)
    } catch (error) {
      console.error('Failed to save content:', error)
    }
  }

  if (loading) {
    return (
      <div className="container loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="container error">
        <h2>Topic not found</h2>
        <button onClick={() => navigate('/')}>Go Home</button>
      </div>
    )
  }

  return (
    <div className="topic-page">
      <PageNavigator
        topics={allTopics}
        currentTopicId={parseInt(id)}
        isOpen={showNavigator}
        onClose={() => setShowNavigator(false)}
        onNavigate={(topicId) => navigate(`/topic/${topicId}`)}
        onPrev={goToPrevTopic}
        onNext={goToNextTopic}
      />

      <button
        className="nav-toggle-btn"
        onClick={() => setShowNavigator(!showNavigator)}
      >
        📚
      </button>

      <div className="container main-content">
        <header className="topic-header">
          <div className="header-top">
            <button className="back-btn" onClick={() => navigate('/')}>
              ← 돌아가기
            </button>
            <div className="live-indicator">
              <span className="pulse-dot"></span>
              <span>LIVE</span>
            </div>
          </div>
          <div className="topic-info">
            <div className="topic-number">{String(topic.id).padStart(2, '0')}</div>
            <h1 className="topic-title">{topic.title}</h1>
            <p className="topic-description">{topic.description}</p>
          </div>
        </header>

        <div className="tab-content-container">
          <CollaborativeEditor
            key={`editor-${id}`}
            topicId={id}
          />
        </div>

        <div className="shortcuts-help">
          <div className="shortcuts-toggle">⌨️ 단축키</div>
          <div className="shortcuts-panel">
            <h4>키보드 단축키</h4>
            <ul>
              <li><kbd>Alt</kbd> + <kbd>N</kbd> - 네비게이터 열기/닫기</li>
              <li><kbd>Alt</kbd> + <kbd>[</kbd> - 이전 주제</li>
              <li><kbd>Alt</kbd> + <kbd>]</kbd> - 다음 주제</li>
              <li><kbd>ESC</kbd> - 네비게이터 닫기</li>
            </ul>
          </div>
        </div>

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
    </div>
  )
}

export default TopicPage
