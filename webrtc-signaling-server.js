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
  const url = new URL(req.url, `http://${req.headers.host}`)
  const roomName = url.searchParams.get('room') || 'default'

  ws.room = roomName
  ws.isAlive = true

  const room = getRoom(roomName)
  room.add(ws)

  console.log(`✅ Client connected to signaling room: ${roomName} (Total in room: ${room.size})`)

  // Send current room members to the new client
  ws.send(JSON.stringify({
    type: 'peers',
    peers: Array.from(room).filter(client => client !== ws).map((_, index) => index)
  }))

  ws.on('pong', () => {
    ws.isAlive = true
  })

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message)

      // Broadcast signaling messages to all peers in the same room
      room.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data))
        }
      })
    } catch (err) {
      console.error('Error processing message:', err)
    }
  })

  ws.on('close', () => {
    room.delete(ws)
    console.log(`❌ Client disconnected from room: ${roomName} (Remaining: ${room.size})`)

    // Clean up empty rooms
    if (room.size === 0) {
      rooms.delete(roomName)
      console.log(`🗑️  Room ${roomName} cleaned up`)
    } else {
      // Notify remaining clients about peer leaving
      room.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'peer-left'
          }))
        }
      })
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
