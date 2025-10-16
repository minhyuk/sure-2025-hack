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

export const api = {
  // Topics
  async getTopics() {
    const response = await fetchWithRetry(`${API_BASE}/topics`)
    return response.json()
  },

  async getTopic(id) {
    const response = await fetchWithRetry(`${API_BASE}/topics/${id}`)
    return response.json()
  },

  // Workspace API
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
