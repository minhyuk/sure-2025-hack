import React from 'react'
import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import TopicPage from './pages/TopicPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/topic/:id" element={<TopicPage />} />
    </Routes>
  )
}

export default App
