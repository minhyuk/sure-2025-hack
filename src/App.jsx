import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { LiveblocksProvider } from '@liveblocks/react/suspense'
import HomePage from './pages/HomePage'
import TopicPage from './pages/TopicPage'

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
        <Route path="/" element={<HomePage />} />
        <Route path="/topic/:id" element={<TopicPage />} />
      </Routes>
    </LiveblocksProvider>
  )
}

export default App
