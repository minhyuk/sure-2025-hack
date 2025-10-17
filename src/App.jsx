import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { LiveblocksProvider } from '@liveblocks/react/suspense'
import HomePage from './pages/HomePage'
import TopicPage from './pages/TopicPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MonitorPage from './pages/MonitorPage'
import ProtectedRoute from './components/ProtectedRoute'

const publicApiKey = import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY

console.log('🔑 Liveblocks Config:', {
  hasKey: !!publicApiKey,
  keyLength: publicApiKey?.length || 0,
  keyPrefix: (publicApiKey || '').substring(0, 15) + '...'
})

function App() {
  return (
    <LiveblocksProvider publicApiKey={publicApiKey}>
      <Routes>
        {/* Landing page - Public Dashboard */}
        <Route path="/" element={<MonitorPage />} />

        {/* Intro page (public) */}
        <Route path="/intro" element={<HomePage />} />

        {/* Auth pages (public) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Topic pages (requires login) */}
        <Route path="/topic/:id" element={
          <ProtectedRoute>
            <TopicPage />
          </ProtectedRoute>
        } />
      </Routes>
    </LiveblocksProvider>
  )
}

export default App
