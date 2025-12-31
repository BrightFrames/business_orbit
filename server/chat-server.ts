import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import pool from '../lib/config/database'
import { chatService } from '../lib/services/chat-service'
import { groupChatService } from '../lib/services/group-chat-service'

type ChatMessage = {
  id: string
  chapterId: string
  senderId: string
  senderName: string
  senderAvatarUrl?: string | null
  content: string
  timestamp: string
}

// Simple in-memory store; replace with DB layer for production
const messagesByChapter: Record<string, ChatMessage[]> = {}

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

// Health endpoint
app.get('/health', (_req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// HTTP send fallback: persist to PostgreSQL and broadcast
app.post('/messages/:chapterId', async (req: any, res: any) => {
  try {
    const { chapterId } = req.params as { chapterId: string }
    const { userId, content } = req.body as { userId?: string | number; content?: string }
    const senderIdNum = Number(userId)
    const text = String(content || '').trim()
    if (!chapterId || !senderIdNum) return res.status(400).json({ success: false, error: 'chapterId and userId required' })
    if (!text) return res.status(400).json({ success: false, error: 'Message cannot be empty' })
    if (text.length > 4000) return res.status(400).json({ success: false, error: 'Message too long' })

    const client = await pool.connect()
    try {
      const mem = await client.query('SELECT 1 FROM chapter_memberships WHERE user_id = $1 AND chapter_id = $2 LIMIT 1', [senderIdNum, chapterId])
      if (mem.rowCount === 0) return res.status(403).json({ success: false, error: 'not a member of this chapter' })

      const userRes = await client.query('SELECT name, profile_photo_url FROM users WHERE id = $1', [senderIdNum])
      const senderName = userRes.rows[0]?.name || 'User'
      const senderAvatarUrl = userRes.rows[0]?.profile_photo_url || null

      // Store message in PostgreSQL
      const saved = await chatService.storeMessage({
        chapterId: String(chapterId),
        senderId: String(senderIdNum),
        senderName,
        senderAvatarUrl,
        content: text,
      })

      const room = `chapter-${chapterId}`
      io.to(room).emit('newMessage', saved)
      res.json({ success: true, message: saved })
    } finally {
      client.release()
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('HTTP /messages error', e)
    res.status(500).json({ success: false, error: 'internal error' })
  }
})

// HTTP history: fetch recent messages for a chapter (no auth at this layer; rely on app API for gated views)
app.get('/messages/:chapterId', async (req: any, res: any) => {
  try {
    const { chapterId } = req.params as { chapterId: string }
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)
    if (!chapterId) return res.status(400).json({ success: false, error: 'chapterId required' })
    
    // Get messages from PostgreSQL
    const result = await chatService.getMessages(chapterId, limit)
    res.json({ success: true, messages: result.messages })
  } catch (e) {
    console.error('HTTP GET /messages error', e)
    res.status(500).json({ success: false, error: 'internal error' })
  }
})

// ----- Secret Group Chat (mirrors chapter chat flow) -----

// HTTP send for groups
app.post('/groups/:groupId/messages', async (req: any, res: any) => {
  try {
    const { groupId } = req.params as { groupId: string }
    const { userId, content } = req.body as { userId?: string | number; content?: string }
    const senderIdNum = Number(userId)
    const text = String(content || '').trim()
    if (!groupId || !senderIdNum) return res.status(400).json({ success: false, error: 'groupId and userId required' })
    if (!text) return res.status(400).json({ success: false, error: 'Message cannot be empty' })
    if (text.length > 4000) return res.status(400).json({ success: false, error: 'Message too long' })

    const client = await pool.connect()
    try {
      const mem = await client.query('SELECT 1 FROM secret_group_memberships WHERE user_id = $1 AND group_id = $2 LIMIT 1', [senderIdNum, groupId])
      if (mem.rowCount === 0) return res.status(403).json({ success: false, error: 'not a member of this group' })

      await groupChatService.ensureTable()
      const saved = await groupChatService.storeMessage({ groupId: String(groupId), senderId: String(senderIdNum), content: text })
      const room = `group-${groupId}`
      io.to(room).emit('group:newMessage', saved)
      res.json({ success: true, message: saved })
    } finally {
      client.release()
    }
  } catch (e) {
    console.error('HTTP /groups/:groupId/messages error', e)
    res.status(500).json({ success: false, error: 'internal error' })
  }
})

// HTTP history for groups
app.get('/groups/:groupId/messages', async (req: any, res: any) => {
  try {
    const { groupId } = req.params as { groupId: string }
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)
    if (!groupId) return res.status(400).json({ success: false, error: 'groupId required' })
    await groupChatService.ensureTable()
    const result = await groupChatService.getMessages(groupId, limit)
    res.json({ success: true, messages: result.messages })
  } catch (e) {
    console.error('HTTP GET /groups/:groupId/messages error', e)
    res.status(500).json({ success: false, error: 'internal error' })
  }
})

const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: true, credentials: true },
  // Hardening timeouts and pings
  pingInterval: 20000,
  pingTimeout: 25000,
  maxHttpBufferSize: 1e6, // 1MB payload cap
})

// Add error handling for database connection
pool.on('error', (err: any) => {
  console.error('Database pool error:', err)
})

type Session = { userId: string; chapterId: string }
const socketSession: Record<string, { userId: string | number; chapterId: string; isAdmin?: boolean }> = {}

io.on('connection', (socket) => {
  // eslint-disable-next-line no-console
  console.log('Socket connected', socket.id)
  console.log('Socket transport:', socket.conn.transport.name)
  console.log('Socket ready state:', socket.conn.readyState)
  
  socket.on('error', (error) => {
    console.error('Socket error:', error)
  })
  
  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', socket.id, 'reason:', reason)
    delete socketSession[socket.id]
  })

  socket.on('joinRoom', async ({ chapterId, userId }: { chapterId: string; userId: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      if (!chapterId || !userId) {
        ack?.({ ok: false, error: 'chapterId and userId required' })
        return
      }
      const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'
      // Validate membership by calling existing API
      const res = await fetch(`${appBaseUrl}/api/users/${encodeURIComponent(userId)}/chapters`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        ack?.({ ok: false, error: `membership check failed (${res.status})` })
        return
      }
      const data = await res.json() as { success: boolean; chapters?: Array<{ id: string }> }
      const isMember = !!data?.success && Array.isArray(data.chapters) && data.chapters.some(c => String(c.id) === String(chapterId))
      if (!isMember) {
        ack?.({ ok: false, error: 'not a member of this chapter' })
        return
      }
      const room = `chapter-${chapterId}`
      socket.join(room)
      socketSession[socket.id] = { userId, chapterId }
      // eslint-disable-next-line no-console
      console.log(`Socket ${socket.id} joined ${room} as user ${userId}`)
      // Presence: broadcast count
      const count = io.sockets.adapter.rooms.get(room)?.size || 0
      io.to(room).emit('presence', { count })
      ack?.({ ok: true })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('joinRoom error', e)
      ack?.({ ok: false, error: 'internal join error' })
    }
  })

  socket.on('sendMessage', async (message: ChatMessage, ack?: (res: { ok: boolean; message?: ChatMessage; error?: string }) => void) => {
    const session = socketSession[socket.id]
    if (!session || String(session.chapterId) !== String(message.chapterId) || String(session.userId) !== String(message.senderId)) {
      ack?.({ ok: false, error: 'unauthorized or not joined' })
      return
    }

    const chapterId = String(message.chapterId)
    const senderIdNum = Number(message.senderId)
    const content = (message.content || '').trim()

    // Validate content
    if (!content || content.length === 0) {
      ack?.({ ok: false, error: 'Message cannot be empty' })
      return
    }
    if (content.length > 4000) {
      ack?.({ ok: false, error: 'Message too long' })
      return
    }

    // Insert into PostgreSQL
    try {
      const client = await pool.connect()
      try {
        // Optional: verify membership server-side quickly
        const mem = await client.query(
          'SELECT 1 FROM chapter_memberships WHERE user_id = $1 AND chapter_id = $2 LIMIT 1',
          [senderIdNum, chapterId]
        )
        if (mem.rowCount === 0) {
          ack?.({ ok: false, error: 'not a member of this chapter' })
          return
        }

        const userRes = await client.query('SELECT name, profile_photo_url FROM users WHERE id = $1', [senderIdNum])
        const senderName = userRes.rows[0]?.name || message.senderName || 'User'
        const senderAvatarUrl = userRes.rows[0]?.profile_photo_url || message.senderAvatarUrl || null

        // Store message in PostgreSQL
        const saved = await chatService.storeMessage({
          chapterId,
          senderId: String(senderIdNum),
          senderName,
          senderAvatarUrl,
          content,
        })

        const room = `chapter-${chapterId}`
        io.to(room).emit('newMessage', saved)
        ack?.({ ok: true, message: saved })
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error storing message:', error)
      ack?.({ ok: false, error: 'failed to save message' })
    }
  })

  // Group join
  socket.on('group:join', async ({ groupId, userId }: { groupId: string; userId: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      if (!groupId || !userId) { ack?.({ ok: false, error: 'groupId and userId required' }); return }
      const mem = await pool.query('SELECT 1 FROM secret_group_memberships WHERE user_id = $1 AND group_id = $2 LIMIT 1', [Number(userId), groupId])
      if (mem.rowCount === 0) { ack?.({ ok: false, error: 'not a member of this group' }); return }
      const room = `group-${groupId}`
      socket.join(room)
      ack?.({ ok: true })
    } catch (e) {
      console.error('group:join error', e)
      ack?.({ ok: false, error: 'internal join error' })
    }
  })

  // Group send message
  socket.on('group:send', async (payload: { id: string; groupId: string; senderId: string; content: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      const { groupId, senderId, content } = payload
      const mem = await pool.query('SELECT 1 FROM secret_group_memberships WHERE user_id = $1 AND group_id = $2 LIMIT 1', [Number(senderId), groupId])
      if (mem.rowCount === 0) { ack?.({ ok: false, error: 'not a member of this group' }); return }
      await groupChatService.ensureTable()
      const saved = await groupChatService.storeMessage({ groupId: String(groupId), senderId: String(senderId), content: String(content || '').trim() })
      const room = `group-${groupId}`
      io.to(room).emit('group:newMessage', saved)
      ack?.({ ok: true })
    } catch (e) {
      console.error('group:send error', e)
      ack?.({ ok: false, error: 'internal error' })
    }
  })

  // Typing indicators (throttled client-side recommended)
  socket.on('typing', () => {
    const session = socketSession[socket.id]
    if (!session) return
    const room = `chapter-${session.chapterId}`
    socket.to(room).emit('typing', { userId: session.userId })
  })
  socket.on('stopTyping', () => {
    const session = socketSession[socket.id]
    if (!session) return
    const room = `chapter-${session.chapterId}`
    socket.to(room).emit('stopTyping', { userId: session.userId })
  })

  // Admin monitoring - join all chapter rooms
  socket.on('joinAllRooms', async () => {
    try {
      // Get all chapter IDs from database
      const client = await pool.connect()
      try {
        const result = await client.query('SELECT id, name FROM chapters')
        const chapters = result.rows
        
        // Join all chapter rooms
        chapters.forEach((chapter: any) => {
          const room = `chapter-${chapter.id}`
          socket.join(room)
          socketSession[socket.id] = { 
            userId: 'admin', 
            chapterId: 'all',
            isAdmin: true 
          }
        })
        
        console.log(`Admin socket ${socket.id} joined all ${chapters.length} chapter rooms`)
        
        // Send current online users for all chapters
        const onlineUsers: Array<{userId: string, userName: string, chapterId: string, chapterName: string}> = []
        for (const chapter of chapters) {
          const room = `chapter-${chapter.id}`
          const roomSockets = io.sockets.adapter.rooms.get(room)
          if (roomSockets) {
            for (const socketId of roomSockets) {
              const session = socketSession[socketId]
              if (session && !session.isAdmin) {
                onlineUsers.push({
                  userId: String(session.userId),
                  userName: `User ${session.userId}`,
                  chapterId: chapter.id,
                  chapterName: chapter.name
                })
              }
            }
          }
        }
        
        socket.emit('presence', { 
          onlineCount: onlineUsers.length, 
          users: onlineUsers 
        })
      } finally {
        client.release()
      }
    } catch (e) {
      console.error('joinAllRooms error', e)
    }
  })

  // Admin monitoring - leave all rooms
  socket.on('leaveAllRooms', () => {
    const session = socketSession[socket.id]
    if (session?.isAdmin) {
      // Get all chapter rooms and leave them
      const rooms = Array.from(socket.rooms).filter(room => room.startsWith('chapter-'))
      rooms.forEach(room => socket.leave(room))
      delete socketSession[socket.id]
      console.log(`Admin socket ${socket.id} left all rooms`)
    }
  })

  socket.on('disconnect', () => {
    // eslint-disable-next-line no-console
    console.log('Socket disconnected', socket.id)
    const session = socketSession[socket.id]
    delete socketSession[socket.id]
    if (session && !session.isAdmin) {
      const room = `chapter-${session.chapterId}`
      const count = io.sockets.adapter.rooms.get(room)?.size || 0
      io.to(room).emit('presence', { count })
    }
  })
})

// Prefer platform-provided PORT (Render/Railway), fallback to custom var, then 4000 locally
const basePort = Number(process.env.PORT || process.env.CHAT_SERVER_PORT || 4000)
const strictPort = String(process.env.CHAT_SERVER_PORT_STRICT || '').toLowerCase() === 'true'

function listenWithRetry(startPort: number, maxAttempts: number): void {
  let attempt = 0
  let currentPort = startPort

  const tryListen = () => {
    attempt += 1
    server.once('listening', () => {
      // eslint-disable-next-line no-console
      console.log(`Chat server listening on http://localhost:${currentPort}`)
      process.env.CHAT_SERVER_PORT = String(currentPort)
    })
    server.once('error', (err: any) => {
      if (err?.code === 'EADDRINUSE') {
        if (strictPort) {
          console.error(`Port ${currentPort} is in use and strict mode is enabled. Exiting.`)
          process.exit(1)
        }
        if (attempt >= maxAttempts) {
          console.error(`All ${maxAttempts} port attempts exhausted starting from ${startPort}. Exiting.`)
          process.exit(1)
        }
        // eslint-disable-next-line no-console
        console.warn(`Port ${currentPort} in use. Trying ${currentPort + 1} ...`)
        currentPort += 1
        setTimeout(() => server.listen(currentPort), 50)
      } else {
        console.error('Server listen error:', err)
        process.exit(1)
      }
    })
    server.listen(currentPort)
  }

  tryListen()
}

listenWithRetry(basePort, 10)


