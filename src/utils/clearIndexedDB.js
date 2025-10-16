/**
 * Utility to clear all Yjs IndexedDB databases
 * Use this if you encounter persistent "Position out of range" errors
 */

export async function clearAllYjsDatabases() {
  try {
    const databases = await window.indexedDB.databases()

    let cleared = 0
    for (const db of databases) {
      if (db.name && db.name.startsWith('topic-')) {
        await new Promise((resolve, reject) => {
          const request = window.indexedDB.deleteDatabase(db.name)
          request.onsuccess = () => {
            console.log(`🗑️ Cleared IndexedDB: ${db.name}`)
            cleared++
            resolve()
          }
          request.onerror = () => reject(request.error)
          request.onblocked = () => {
            console.warn(`⚠️ Database ${db.name} is blocked, please close all tabs`)
            resolve()
          }
        })
      }
    }

    console.log(`✅ Cleared ${cleared} IndexedDB database(s)`)
    return cleared
  } catch (err) {
    console.error('Failed to clear IndexedDB:', err)
    return 0
  }
}

export async function clearTopicDatabase(topicId) {
  try {
    const dbNames = [
      `topic-${topicId}`,
      `topic-${topicId}-v2`,
      `topic-${topicId}-v3`,
      `topic-${topicId}-v4`,
      `topic-${topicId}-v5`
    ]

    for (const dbName of dbNames) {
      await new Promise((resolve, reject) => {
        const request = window.indexedDB.deleteDatabase(dbName)
        request.onsuccess = () => {
          console.log(`🗑️ Cleared IndexedDB: ${dbName}`)
          resolve()
        }
        request.onerror = () => reject(request.error)
        request.onblocked = () => {
          console.warn(`⚠️ Database ${dbName} is blocked`)
          resolve()
        }
      })
    }

    console.log(`✅ Cleared topic ${topicId} databases`)
    return true
  } catch (err) {
    console.error('Failed to clear topic database:', err)
    return false
  }
}

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  window.clearYjsCache = clearAllYjsDatabases
  window.clearTopicCache = clearTopicDatabase

  console.log('🛠️ Debug utilities loaded:')
  console.log('  - window.clearYjsCache() - Clear all Yjs databases')
  console.log('  - window.clearTopicCache(topicId) - Clear specific topic database')
}
