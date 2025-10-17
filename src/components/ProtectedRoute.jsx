import React from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../services/api'

function ProtectedRoute({ children }) {
  const isAuthenticated = api.isAuthenticated()

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
