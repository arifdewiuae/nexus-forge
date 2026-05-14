import { createServer } from 'http'
import { setupWSConnection } from 'y-websocket/bin/utils'
import { WebSocketServer } from 'ws'
import { WS_ROOM_PREFIX } from '../lib/config'

const PORT = Number(process.env.PORT ?? 1234)

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Nexus Forge — y-websocket relay')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const roomName = `${WS_ROOM_PREFIX}${url.pathname.slice(1)}`
  setupWSConnection(ws, req, { docName: roomName })
})

server.listen(PORT, () => {
  console.log(`[ws-server] Listening on ws://0.0.0.0:${PORT}`)
})
