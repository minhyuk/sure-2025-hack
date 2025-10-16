const http = require('http')
const WebSocket = require('ws')

const PORT = 5001
const PING_INTERVAL = 30000

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('WebRTC Signaling Server Running\n')
})

// Create WebSocket server
const wss = new WebSocket.Server({
  server,
  perMessageDeflate: false,
  clientTracking: true
})

// Map to store rooms and their connected clients
const rooms = new Map()

function getRoom(roomName) {
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set())
  }
  return rooms.get(roomName)
}

wss.on('connection', (ws, req) => {
  ws.isAlive = true
  ws.room = null // Will be set when client subscribes

  console.log(`🔌 Client connected (waiting for room subscription)`)

  ws.on('pong', () => {
    ws.isAlive = true
  })

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message)

      // Handle y-webrtc signaling protocol
      if (data.type === 'subscribe') {
        // Client is subscribing to a room
        const topics = data.topics || []
        if (topics.length > 0) {
          const roomName = topics[0] // y-webrtc sends room name in topics array
          
          // Remove from old room if exists
          if (ws.room) {
            const oldRoom = getRoom(ws.room)
            oldRoom.delete(ws)
          }

          // Add to new room
          ws.room = roomName
          const room = getRoom(roomName)
          room.add(ws)

          console.log(`✅ Client subscribed to room: ${roomName} (Total in room: ${room.size})`)

          // Notify client of subscription success
          ws.send(JSON.stringify({
            type: 'subscribe',
            topics: [roomName]
          }))

          return
        }
      }

      // Handle y-webrtc publish messages (signaling data)
      if (data.type === 'publish' && ws.room) {
        const topics = data.topics || []
        if (topics.length > 0 && topics[0] === ws.room) {
          const room = getRoom(ws.room)
          
          // Broadcast to all peers in the same room except sender
          room.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(data))
            }
          })
        }
        return
      }

      // Handle ping/pong for y-webrtc
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }))
        return
      }

      // Fallback: broadcast any other message to room
      if (ws.room) {
        const room = getRoom(ws.room)
        room.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data))
          }
        })
      }

    } catch (err) {
      console.error('Error processing message:', err)
    }
  })

  ws.on('close', () => {
    if (ws.room) {
      const room = getRoom(ws.room)
      room.delete(ws)
      console.log(`❌ Client disconnected from room: ${ws.room} (Remaining: ${room.size})`)

      // Clean up empty rooms
      if (room.size === 0) {
        rooms.delete(ws.room)
        console.log(`🗑️  Room ${ws.room} cleaned up`)
      } else {
        // Notify remaining clients about peer leaving
        room.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'publish',
              topics: [ws.room],
              // y-webrtc peer disconnect notification
            }))
          }
        })
      }
    }
  })

  ws.on('error', (err) => {
    console.error('WebSocket error:', err)
  })
})

// Heartbeat to detect broken connections
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('Terminating inactive connection')
      return ws.terminate()
    }
    ws.isAlive = false
    ws.ping()
  })
}, PING_INTERVAL)

wss.on('close', () => {
  clearInterval(heartbeat)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WebRTC Signaling Server running on ws://0.0.0.0:${PORT}`)
  console.log(`   External access: ws://10.10.10.200:${PORT}`)
  console.log(`   Heartbeat interval: ${PING_INTERVAL}ms`)
})

process.on('SIGINT', () => {
  console.log('Shutting down WebRTC Signaling Server...')
  clearInterval(heartbeat)
  wss.close()
  server.close()
  process.exit(0)
})
