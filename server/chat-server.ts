import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import pool from '../lib/config/database'
import { chatService } from '../lib/services/chat-service'
import { groupChatService } from '../lib/services/group-chat-service'
import { dmService } from '../lib/services/dm-service'
import { awardOrbitPoints } from '../lib/utils/rewards'
import jwt from 'jsonwebtoken'
import cookie from 'cookie'

// Augmented SocketData interface
declare module 'socket.io' {
  interface SocketData {
    userId: string;
    userName?: string;
  }
}

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
  pingInterval: 20000,
  pingTimeout: 25000,
  maxHttpBufferSize: 1e6, // 1MB payload cap
})

// Database error handling
if (pool) {
  pool.on('error', (err: any) => {
    console.error('Database pool error:', err)
  })
} else {
  console.error('Database pool is not initialized.')
}

// ----------------------------------------------------------------------
// STEP 2: SOCKET.IO AUTHENTICATION & STEP 3: USER MAPPING
// ----------------------------------------------------------------------

io.use(async (socket, next) => {
  try {
    // 1. Check for token in handshake auth object (client manual send) or cookies (browser auto send)
    let token = socket.handshake.auth?.token;

    if (!token && socket.handshake.headers.cookie) {
      const cookies = cookie.parse(socket.handshake.headers.cookie);
      token = cookies.token;
    }

    if (!token) {
      console.log('Socket connection rejected: No token provided');
      return next(new Error('Authentication error: Token required'));
    }

    // 2. Verify token
    if (!process.env.JWT_SECRET) {
      return next(new Error('Server configuration error: JWT_SECRET missing'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
    if (!decoded || !decoded.userId) {
      return next(new Error('Authentication error: Invalid token'));
    }

    // 3. Attach strict user ID to socket
    const userIdStr = String(decoded.userId);
    socket.data.userId = userIdStr;

    // Optional: Fetch user details for presence/logging if needed
    // const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [decoded.userId]);
    // socket.data.userName = userRes.rows[0]?.name;

    console.log(`Socket authenticated for User ID: ${userIdStr}`);
    next();
  } catch (err) {
    console.error('Socket auth failure:', err);
    next(new Error('Authentication error'));
  }
});

type Session = { userId: string; chapterId: string }
const socketSession: Record<string, { userId: string | number; chapterId: string; isAdmin?: boolean }> = {}

io.on('connection', async (socket) => {
  const userId = socket.data.userId;
  if (!userId) {
    socket.disconnect(true);
    return;
  }

  // STEP 3: USER <-> SOCKET MAPPING (Using Rooms)
  // Join the user's private room automatically strictly based on auth
  const userRoom = `user-${userId}`;
  await socket.join(userRoom);
  console.log(`Socket ${socket.id} joined private room ${userRoom}`);


  socket.on('error', (error) => {
    console.error('Socket error:', error)
  })

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', socket.id, 'reason:', reason)
    delete socketSession[socket.id]
  })

  // ----------------------------------------------------------------------
  // CHAPTER & GROUP LOGIC (Legacy / Existing)
  // ----------------------------------------------------------------------

  socket.on('joinRoom', async ({ chapterId }: { chapterId: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      if (!chapterId) {
        ack?.({ ok: false, error: 'chapterId required' })
        return
      }

      const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'
      const res = await fetch(`${appBaseUrl}/api/users/${encodeURIComponent(userId)}/chapters`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        ack?.({ ok: false, error: `membership check failed` })
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

      const count = io.sockets.adapter.rooms.get(room)?.size || 0
      io.to(room).emit('presence', { count })
      ack?.({ ok: true })
    } catch (e) {
      console.error('joinRoom error', e)
      ack?.({ ok: false, error: 'internal join error' })
    }
  })

  // Legacy messaging for chapters - Ensure it uses authenticated userId
  socket.on('sendMessage', async (message: ChatMessage, ack?: (res: { ok: boolean; message?: ChatMessage; error?: string }) => void) => {
    const session = socketSession[socket.id]
    // Strict check: User must be joined and match the authenticated user
    if (!session || String(session.chapterId) !== String(message.chapterId) || String(session.userId) !== String(userId)) {
      ack?.({ ok: false, error: 'unauthorized or not joined' })
      return
    }

    const chapterId = String(message.chapterId)
    const senderIdNum = Number(userId)
    const content = (message.content || '').trim()

    if (!content) { ack?.({ ok: false, error: 'Message empty' }); return }

    try {
      const client = await pool.connect()
      try {
        const userRes = await client.query('SELECT name, profile_photo_url FROM users WHERE id = $1', [senderIdNum])
        const senderName = userRes.rows[0]?.name || 'User'
        const senderAvatarUrl = userRes.rows[0]?.profile_photo_url || null

        const saved = await chatService.storeMessage({
          chapterId,
          senderId: String(senderIdNum),
          senderName,
          senderAvatarUrl,
          content,
        })

        const room = `chapter-${chapterId}`
        io.to(room).emit('newMessage', saved)

        // Reward
        awardOrbitPoints(senderIdNum, 'chapter_chat_post', 'Posted in chapter chat').catch(console.error)

        ack?.({ ok: true, message: saved })
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error storing message:', error)
      ack?.({ ok: false, error: 'failed to save message' })
    }
  })

  // ----------------------------------------------------------------------
  // STEP 4 & 5 & 6: DIRECT MESSAGE & NOTIFICATIONS
  // ----------------------------------------------------------------------

  // Simple in-memory rate limiter: Map<userId, timestamp[]>
  const rateLimitMap = new Map<string, number[]>();

  socket.on('send_message', async (payload: { conversationId: string; content: string; recipientId: string }, ack?: (res: { ok: boolean; message?: any; error?: string }) => void) => {
    try {
      const { conversationId, content, recipientId } = payload;
      const senderId = userId;

      if (!conversationId || !content || !recipientId) {
        ack?.({ ok: false, error: 'missing parameters' });
        return;
      }

      // RATE LIMIT CHECK
      const now = Date.now();
      const timestamps = rateLimitMap.get(senderId) || [];
      // Filter out timestamps older than 1 minute
      const recentTimestamps = timestamps.filter(t => now - t < 60000);

      if (recentTimestamps.length >= 30) { // Max 30 messages per minute
        ack?.({ ok: false, error: 'Rate limit exceeded. Please wait.' });
        return;
      }

      recentTimestamps.push(now);
      rateLimitMap.set(senderId, recentTimestamps);

      // 1. Persist Message (Step 4.3) include Notification Record creation
      const saved = await dmService.storeMessage(conversationId, Number(senderId), content);

      // 2. Emit to Receiver (Step 4.4) - Event Name: receive_message
      const recipientRoom = `user-${recipientId}`;
      io.to(recipientRoom).emit('receive_message', saved);

      // 3. Emit Real-time Notification (Step 6)
      const notificationPayload = {
        type: 'message',
        sourceId: saved.id,
        title: 'New Message',
        message: 'You have a new message',
        link: `/product/messages?conversationId=${conversationId}`
      };

      io.to(recipientRoom).emit('new_notification', notificationPayload);

      // 4. Sync sender's other tabs
      const senderRoom = `user-${senderId}`;
      socket.to(senderRoom).emit('receive_message', saved);

      ack?.({ ok: true, message: saved });
    } catch (e) {
      console.error('send_message error', e);
      ack?.({ ok: false, error: 'failed to send message' });
    }
  });

  // STEP 7: READ RECEIPTS
  socket.on('dm:read', async ({ conversationId }: { conversationId: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      const uId = Number(userId);
      await dmService.markAsRead(conversationId, uId);

      // Optional: Emit to sender that messages were read
      // We need to know who the other user is to emit to them. 
      // For now, just acknowledged. 
      ack?.({ ok: true });
    } catch (e) {
      console.error('dm:read error', e);
      ack?.({ ok: false, error: 'internal error' });
    }
  });

  // Group handlers... (restoring previous group logic but utilizing secure userId)
  socket.on('group:join', async ({ groupId }: { groupId: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      if (!groupId) { ack?.({ ok: false, error: 'groupId required' }); return }
      const mem = await pool.query('SELECT 1 FROM secret_group_memberships WHERE user_id = $1 AND group_id = $2 LIMIT 1', [Number(userId), groupId])
      if (mem.rowCount === 0) { ack?.({ ok: false, error: 'not a member of this group' }); return }
      const room = `group-${groupId}`
      socket.join(room)
      ack?.({ ok: true })
    } catch (e) {
      ack?.({ ok: false, error: 'internal join error' })
    }
  })

  socket.on('group:send', async (payload: { id: string; groupId: string; senderId: string; content: string }, ack?: (res: { ok: boolean; message?: any; error?: string }) => void) => {
    try {
      const { groupId, content } = payload
      const senderId = userId;

      const mem = await pool.query('SELECT 1 FROM secret_group_memberships WHERE user_id = $1 AND group_id = $2 LIMIT 1', [Number(senderId), groupId])
      if (mem.rowCount === 0) { ack?.({ ok: false, error: 'not a member of this group' }); return }

      await groupChatService.ensureTable()
      const saved = await groupChatService.storeMessage({ groupId: String(groupId), senderId: String(senderId), content: String(content || '').trim() })
      const room = `group-${groupId}`
      io.to(room).emit('group:newMessage', saved)

      awardOrbitPoints(Number(senderId), 'secret_group_activity', 'Active in secret group').catch(console.error)

      ack?.({ ok: true, message: saved })
    } catch (e) {
      ack?.({ ok: false, error: 'internal error' })
    }
  })

  // Admin monitoring
  socket.on('joinAllRooms', async () => {
    // Basic admin check - ideally verify DB isAdmin status for strictness
    // For now assuming if they know to call this they might be admin, but better to check DB.
    // skipping rigorous DB check for brevity unless requested, but reusing `userId` from token.
    try {
      const client = await pool.connect()
      try {
        // Verify admin status
        const userRes = await client.query('SELECT is_admin FROM users WHERE id = $1', [Number(userId)])
        if (!userRes.rows[0]?.is_admin) return;

        const result = await client.query('SELECT id, name FROM chapters')
        const chapters = result.rows
        chapters.forEach((chapter: any) => {
          socket.join(`chapter-${chapter.id}`)
        })
        // ... rest of admin logic ...
      } finally {
        client.release()
      }
    } catch (e) { console.error(e) }
  })
})

const basePort = Number(process.env.CHAT_SERVER_PORT || process.env.PORT || 3001)
const strictPort = String(process.env.CHAT_SERVER_PORT_STRICT || '').toLowerCase() === 'true'

function listenWithRetry(startPort: number, maxAttempts: number): void {
  let attempt = 0
  let currentPort = startPort

  const tryListen = () => {
    attempt += 1
    server.once('listening', () => {
      console.log(`Chat server listening on http://localhost:${currentPort}`)
      process.env.CHAT_SERVER_PORT = String(currentPort)
    })
    server.once('error', (err: any) => {
      if (err?.code === 'EADDRINUSE') {
        if (strictPort) process.exit(1)
        if (attempt >= maxAttempts) process.exit(1)
        currentPort += 1
        setTimeout(() => server.listen(currentPort), 50)
      } else {
        process.exit(1)
      }
    })
    server.listen(currentPort)
  }
  tryListen()
}

listenWithRetry(basePort, 10)


