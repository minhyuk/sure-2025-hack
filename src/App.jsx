import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { LiveblocksProvider } from '@liveblocks/react/suspense'
import HomePage from './pages/HomePage'
import TopicPage from './pages/TopicPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MonitorPage from './pages/MonitorPage'
import ClockPage from './pages/ClockPage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import AdminTeamsPage from './pages/AdminTeamsPage'
import AdminTopicsPage from './pages/AdminTopicsPage'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import GlobalNav from './components/GlobalNav'

const publicApiKey = import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY

console.log('🔑 Liveblocks Config:', {
  hasKey: !!publicApiKey,
  keyLength: publicApiKey?.length || 0,
  keyPrefix: (publicApiKey || '').substring(0, 15) + '...'
})

function App() {
  return (
    <LiveblocksProvider publicApiKey={publicApiKey}>
      <GlobalNav />
      <Routes>
        {/* Landing page - Public Dashboard */}
        <Route path="/" element={<MonitorPage />} />

        {/* Intro page (public) */}
        <Route path="/intro" element={<HomePage />} />

        {/* Clock page (public) */}
        <Route path="/clock" element={<ClockPage />} />

        {/* Auth pages (public) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Topic pages (requires login) */}
        <Route path="/topic/:id" element={
          <ProtectedRoute>
            <TopicPage />
          </ProtectedRoute>
        } />

        {/* Admin pages (requires admin role) */}
        <Route path="/admin/settings" element={
          <AdminRoute>
            <AdminSettingsPage />
          </AdminRoute>
        } />
        <Route path="/admin/teams" element={
          <AdminRoute>
            <AdminTeamsPage />
          </AdminRoute>
        } />
        <Route path="/admin/topics" element={
          <AdminRoute>
            <AdminTopicsPage />
          </AdminRoute>
        } />
      </Routes>
    </LiveblocksProvider>
  )
}

export default App
