// API 서비스 - Workspace JSON 기반

// No more proxy - direct backend connection
// Development and production both use same port (3001)
const API_BASE = '/api'

// Robust fetch with retry logic
async function fetchWithRetry(url, options = {}, retries = 5, delay = 1000) {
  let lastError = null

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)

      // If response is ok, return immediately
      if (response.ok) {
        if (i > 0) {
          console.log(`✅ Request succeeded after ${i + 1} attempts`)
        }
        return response
      }

      // 503 Service Unavailable - backend is starting/restarting, should retry
      if (response.status === 503) {
        if (i < retries - 1) {
          console.log(`⚠️ Backend service unavailable (attempt ${i + 1}/${retries})`)
          console.log(`   Waiting ${delay}ms for backend to be ready...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }

      // Other non-ok responses - retry with backoff
      if (i < retries - 1 && response.status >= 500) {
        console.log(`⚠️ Server error ${response.status} (attempt ${i + 1}/${retries})`)
        console.log(`   Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      // Last attempt or client error (4xx), return response (let caller handle)
      return response

    } catch (error) {
      lastError = error

      // Network error (backend not ready or connection refused)
      if (i < retries - 1) {
        console.log(`⚠️ Connection error (attempt ${i + 1}/${retries}): ${error.message}`)
        console.log(`   Backend may be restarting... retrying in ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } else {
        console.error(`❌ Failed after ${retries} attempts:`, error)
        throw error
      }
    }
  }

  // Should never reach here, but just in case
  throw lastError || new Error('Failed to fetch after retries')
}

// Get auth token from localStorage
function getAuthToken() {
  return localStorage.getItem('auth_token')
}

// Set auth token to localStorage
function setAuthToken(token) {
  localStorage.setItem('auth_token', token)
}

// Remove auth token from localStorage
function removeAuthToken() {
  localStorage.removeItem('auth_token')
}

// Get auth headers
function getAuthHeaders() {
  const token = getAuthToken()
  const headers = {}
  
  // JWT token (if available)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  // Simple admin authentication (if logged in as admin)
  const isAdmin = localStorage.getItem('adminAuth') === 'true'
  if (isAdmin) {
    headers['X-Admin-Key'] = 'admin-claude-2025'
  }
  
  return headers
}

export const api = {
  // ============================================
  // Authentication
  // ============================================

  async register(username, email, password, displayName, teamName, topicId) {
    const response = await fetchWithRetry(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password,
        display_name: displayName,
        team_name: teamName,
        topic_id: topicId
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Registration failed')
    }

    const data = await response.json()
    setAuthToken(data.token)
    return data
  },

  async login(username, password) {
    const response = await fetchWithRetry(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Login failed')
    }

    const data = await response.json()
    setAuthToken(data.token)
    return data
  },

  async getCurrentUser() {
    const response = await fetchWithRetry(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    })

    if (!response.ok) {
      removeAuthToken()
      return null
    }

    return response.json()
  },

  logout() {
    removeAuthToken()
  },

  isAuthenticated() {
    return !!getAuthToken()
  },

  // ============================================
  // Topics
  // ============================================

  async getTopics() {
    const response = await fetchWithRetry(`${API_BASE}/topics`)
    return response.json()
  },

  async getTopic(id) {
    const response = await fetchWithRetry(`${API_BASE}/topics/${id}`)
    return response.json()
  },

  // ============================================
  // Dashboard
  // ============================================

  async getDashboardTeams() {
    const response = await fetchWithRetry(`${API_BASE}/dashboard/teams`)

    if (!response.ok) {
      const text = await response.text()
      console.error('Dashboard teams API error:', { status: response.status, body: text })
      throw new Error(`Failed to fetch dashboard teams: ${response.status}`)
    }

    return response.json()
  },

  async getDashboardSettings() {
    const response = await fetchWithRetry(`${API_BASE}/dashboard/settings`)

    if (!response.ok) {
      const text = await response.text()
      console.error('Dashboard settings API error:', { status: response.status, body: text })
      throw new Error(`Failed to fetch dashboard settings: ${response.status}`)
    }

    return response.json()
  },

  async getRecentCheers(limit = 20) {
    const response = await fetchWithRetry(`${API_BASE}/cheers/recent?limit=${limit}`)

    if (!response.ok) {
      const text = await response.text()
      console.error('Recent cheers API error:', { status: response.status, body: text })
      throw new Error(`Failed to fetch recent cheers: ${response.status}`)
    }

    return response.json()
  },

  async addCheer(teamId, authorName, message, type = 'comment') {
    const response = await fetchWithRetry(`${API_BASE}/cheers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_id: teamId,
        author_name: authorName,
        message,
        type
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to add cheer')
    }

    return response.json()
  },

  // ============================================
  // Workspace API
  // ============================================

  async getWorkspace(topicId) {
    const url = `${API_BASE}/workspace/${topicId}`
    console.log(`🔍 Fetching workspace: ${url}`)

    const response = await fetchWithRetry(url)

    if (!response.ok) {
      console.error(`❌ Workspace API error:`, {
        url,
        status: response.status,
        statusText: response.statusText
      })
      throw new Error(`Failed to fetch workspace: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`✅ Workspace loaded:`, { topicId, blocks: data.content?.blocks?.length || 0 })
    return data
  },

  async saveContent(topicId, content, updatedBy) {
    const url = `${API_BASE}/workspace/${topicId}/content`
    console.log(`💾 Saving content:`, { url, blocks: content?.length || 0 })

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, updated_by: updatedBy })
    })

    if (!response.ok) {
      console.error(`❌ Save API error:`, {
        url,
        status: response.status,
        statusText: response.statusText
      })
      throw new Error(`Failed to save content: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`✅ Content saved successfully`)
    return data
  },

  async addFeedback(topicId, authorName, content) {
    const response = await fetchWithRetry(`${API_BASE}/workspace/${topicId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_name: authorName, content })
    })
    return response.json()
  },

  async addIdea(topicId, authorName, idea) {
    const response = await fetchWithRetry(`${API_BASE}/workspace/${topicId}/ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_name: authorName, idea })
    })
    return response.json()
  },

  async voteIdea(topicId, ideaId) {
    const response = await fetchWithRetry(`${API_BASE}/workspace/${topicId}/ideas/${ideaId}/vote`, {
      method: 'POST'
    })
    return response.json()
  }
}

// ============================================
// Admin API functions
// ============================================

export async function getHackathonSettings() {
  const response = await fetchWithRetry(`${API_BASE}/dashboard/settings`)
  if (!response.ok) throw new Error('Failed to fetch hackathon settings')
  return response.json()
}

export async function updateHackathonSettings(settings) {
  const response = await fetchWithRetry(`${API_BASE}/admin/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(settings)
  })
  if (!response.ok) {
    const errorText = await response.text()
    console.error('Update settings error:', { status: response.status, body: errorText })
    throw new Error(`Failed to update settings: ${response.status} - ${errorText}`)
  }
  return response.json()
}

// Announcements
export async function getAnnouncements() {
  const response = await fetchWithRetry(`${API_BASE}/announcements`)
  if (!response.ok) throw new Error('Failed to fetch announcements')
  return response.json()
}

export async function createAnnouncement(announcement) {
  const response = await fetchWithRetry(`${API_BASE}/announcements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(announcement)
  })
  if (!response.ok) throw new Error('Failed to create announcement')
  return response.json()
}

export async function deleteAnnouncement(id) {
  const response = await fetchWithRetry(`${API_BASE}/announcements/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  if (!response.ok) throw new Error('Failed to delete announcement')
  return response.json()
}

// Teams
export async function getTeams() {
  const response = await fetchWithRetry(`${API_BASE}/admin/teams`, {
    headers: getAuthHeaders()
  })
  if (!response.ok) throw new Error('Failed to fetch teams')
  return response.json()
}

export async function createTeam(team) {
  const response = await fetchWithRetry(`${API_BASE}/admin/teams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(team)
  })
  if (!response.ok) throw new Error('Failed to create team')
  return response.json()
}

export async function updateTeam(id, team) {
  const response = await fetchWithRetry(`${API_BASE}/admin/teams/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(team)
  })
  if (!response.ok) throw new Error('Failed to update team')
  return response.json()
}

export async function deleteTeam(id) {
  const response = await fetchWithRetry(`${API_BASE}/admin/teams/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  if (!response.ok) throw new Error('Failed to delete team')
  return response.json()
}

// Topics
export async function getTopics() {
  const response = await fetchWithRetry(`${API_BASE}/topics`)
  if (!response.ok) throw new Error('Failed to fetch topics')
  return response.json()
}

export async function createTopic(topic) {
  const response = await fetchWithRetry(`${API_BASE}/admin/topics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(topic)
  })
  if (!response.ok) throw new Error('Failed to create topic')
  return response.json()
}

export async function updateTopic(id, topic) {
  const response = await fetchWithRetry(`${API_BASE}/admin/topics/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(topic)
  })
  if (!response.ok) throw new Error('Failed to update topic')
  return response.json()
}

export async function deleteTopic(id) {
  const response = await fetchWithRetry(`${API_BASE}/admin/topics/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  if (!response.ok) throw new Error('Failed to delete topic')
  return response.json()
}
