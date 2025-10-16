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
      
      console.log(`📨 Received message type: ${data.type}`, data.topics ? `topics: ${data.topics}` : '')

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

          // Notify client of subscription success (y-webrtc expects this)
          ws.send(JSON.stringify({
            type: 'subscribe',
            topics: [roomName]
          }))

          return
        }
      }

      // Handle y-webrtc unsubscribe
      if (data.type === 'unsubscribe') {
        const topics = data.topics || []
        if (topics.length > 0 && ws.room) {
          const room = getRoom(ws.room)
          room.delete(ws)
          console.log(`⛔ Client unsubscribed from room: ${ws.room}`)
          ws.room = null
        }
        return
      }

      // Handle y-webrtc publish messages (signaling data: SDP, ICE candidates)
      if (data.type === 'publish') {
        const topics = data.topics || []
        
        // If not subscribed to a room yet, use first topic as room
        if (!ws.room && topics.length > 0) {
          ws.room = topics[0]
          const room = getRoom(ws.room)
          room.add(ws)
          console.log(`✅ Auto-subscribed to room: ${ws.room} (via publish)`)
        }
        
        if (ws.room && topics.includes(ws.room)) {
          const room = getRoom(ws.room)
          
          console.log(`📡 Broadcasting signaling data to ${room.size - 1} peers in room: ${ws.room}`)
          
          // Broadcast to all peers in the same room except sender
          let sent = 0
          room.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(data))
              sent++
            }
          })
          
          console.log(`   ↳ Sent to ${sent} peers`)
        }
        return
      }

      // Handle ping/pong for y-webrtc
      if (data.type === 'ping') {
        ws.isAlive = true  // Mark as alive when receiving y-webrtc ping
        ws.send(JSON.stringify({ type: 'pong' }))
        return
      }

      // Fallback: broadcast any other message to room
      console.log(`🔄 Fallback broadcast for type: ${data.type}`)
      if (ws.room) {
        const room = getRoom(ws.room)
        room.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data))
          }
        })
      }

    } catch (err) {
      console.error('❌ Error processing message:', err)
      console.error('   Message:', message.toString().substring(0, 200))
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
// Note: y-webrtc uses JSON ping/pong, not WebSocket protocol ping/pong
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('⚠️ Terminating inactive connection (no response in 30s)')
      return ws.terminate()
    }
    ws.isAlive = false
    
    // Send both WebSocket ping AND y-webrtc JSON ping
    ws.ping()  // WebSocket protocol ping
    
    // y-webrtc JSON ping (for clients that only handle JSON messages)
    if (ws.readyState === 1) {  // OPEN
      ws.send(JSON.stringify({ type: 'ping' }))
    }
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
