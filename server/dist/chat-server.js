"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/chat-server.ts
var import_express = __toESM(require("express"));
var import_http = __toESM(require("http"));
var import_socket = require("socket.io");
var import_cors = __toESM(require("cors"));

// lib/config/database.ts
var import_pg = require("pg");
var import_dotenv = __toESM(require("dotenv"));
if (process.env.VERCEL !== "1" && process.env.NODE_ENV !== "production") {
  import_dotenv.default.config({ path: ".env.local" });
  import_dotenv.default.config({ path: ".env" });
}
if (!process.env.DATABASE_URL && process.env.NODE_ENV === "development") {
}
var databaseUrl = process.env.DATABASE_URL;
var shouldUseSsl = Boolean(
  databaseUrl && (databaseUrl.includes("render.com") || databaseUrl.includes("neon.tech") || databaseUrl.includes("supabase") || databaseUrl.includes("railway") || /[?&]sslmode=require/.test(databaseUrl))
);
var isBuildTime = process.env.NEXT_PHASE === "phase-production-build" || process.env.NEXT_PHASE === "phase-development-build" || process.env.NEXT_PHASE?.includes("build") || process.env.npm_lifecycle_event === "build" || process.env.NEXT_BUILD === "1" || // Check if we're running next build command (most reliable)
typeof process !== "undefined" && process.argv && (process.argv.some((arg) => arg.includes("next") && arg.includes("build")) || process.argv.some((arg) => arg === "build") || process.argv.some((arg) => arg.includes("next") && (arg.includes("build") || arg.includes("export")))) || // CI environment during build (GitHub Actions sets this)
process.env.CI === "true" && process.env.npm_lifecycle_event === "build";
var isLocalDb = databaseUrl && (databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1"));
var pool = global.__PG_POOL__ ?? (!isBuildTime && databaseUrl ? new import_pg.Pool({
  connectionString: databaseUrl,
  // Only use SSL if explicitly required by URL (cloud providers) or if production AND NOT local
  ssl: shouldUseSsl || process.env.NODE_ENV === "production" && !isLocalDb ? { rejectUnauthorized: false } : false,
  // Increased dev/prod limit to 10 to allow parallel queries (Bootstrap uses 4 alone)
  max: 10,
  application_name: "business_orbit",
  min: 0,
  idleTimeoutMillis: 6e4,
  connectionTimeoutMillis: 6e4,
  // Increased from 30s to 60s
  maxUses: 7500,
  keepAlive: true,
  keepAliveInitialDelayMillis: 3e4
}) : null);
if (process.env.NODE_ENV !== "production" && isBuildTime) {
  console.log("[Database] Build time detected - pool will be null");
}
if (!global.__PG_POOL__) {
  global.__PG_POOL__ = pool;
}
if (pool) {
  pool.on("error", (err) => {
  });
}
var testConnection = async (retries = process.env.NODE_ENV === "production" ? 3 : 1) => {
  if (!pool) {
    return;
  }
  for (let i = 0; i < retries; i++) {
    try {
      const result = await pool.query("SELECT NOW() as current_time, version() as version");
      return;
    } catch (err) {
      if (i === retries - 1) {
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1e3));
      }
    }
  }
};
var shouldTestConnection = !isBuildTime && process.env.NODE_ENV !== "test" && process.env.VERCEL !== "1" && process.env.CI !== "true" && process.env.NODE_ENV === "development";
if (shouldTestConnection) {
  testConnection();
}
process.on("SIGINT", async () => {
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});
process.on("SIGTERM", async () => {
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});
var database_default = pool;

// lib/utils/rewards.ts
var configCache = /* @__PURE__ */ new Map();
var CACHE_DURATION = 5 * 60 * 1e3;
async function getRewardConfig(action) {
  const cached = configCache.get(action);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.config;
  }
  try {
    const res = await database_default.query(
      "SELECT points, daily_limit, is_active, category FROM reward_configurations WHERE action_type = $1",
      [action]
    );
    if (res.rows.length === 0) return null;
    const config = {
      points: res.rows[0].points,
      daily_limit: res.rows[0].daily_limit,
      is_active: res.rows[0].is_active,
      category: res.rows[0].category
    };
    configCache.set(action, {
      config,
      expiresAt: Date.now() + CACHE_DURATION
    });
    return config;
  } catch (error) {
    console.error(`[Rewards] Failed to fetch config for ${action}:`, error);
    return null;
  }
}
async function awardOrbitPoints(userId, action, description = "", sourceId = null, client = null) {
  try {
    const config = await getRewardConfig(action);
    if (!config || !config.is_active || config.points <= 0) {
      const currentPoints = await getUserPoints(userId);
      return { awarded: false, points: 0, newTotal: currentPoints };
    }
    const points = config.points;
    if (config.daily_limit !== null) {
      if (await isDailyLimitReached(userId, action, config.daily_limit)) {
        const currentPoints = await getUserPoints(userId);
        return { awarded: false, points: 0, newTotal: currentPoints };
      }
    }
    const dbClient = client || await database_default.connect();
    const shouldRelease = !client;
    try {
      if (shouldRelease) {
        await dbClient.query("BEGIN");
      }
      await dbClient.query(
        `INSERT INTO point_transactions (user_id, points, action_type, description, source_id, category) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, points, action, description, sourceId, config.category]
      );
      const res = await dbClient.query(
        `UPDATE users 
                 SET orbit_points = COALESCE(orbit_points, 0) + $1 
                 WHERE id = $2 
                 RETURNING orbit_points`,
        [points, userId]
      );
      if (shouldRelease) {
        await dbClient.query("COMMIT");
      }
      const newTotal = res.rows[0]?.orbit_points || 0;
      return { awarded: true, points, newTotal };
    } catch (e) {
      if (shouldRelease) {
        await dbClient.query("ROLLBACK");
      }
      throw e;
    } finally {
      if (shouldRelease) {
        dbClient.release();
      }
    }
  } catch (error) {
    console.error("[Rewards] Failed to award points:", error);
    const currentPoints = await getUserPoints(userId);
    return { awarded: false, points: 0, newTotal: currentPoints };
  }
}
async function isDailyLimitReached(userId, action, limit) {
  const res = await database_default.query(
    `SELECT COUNT(*) as count FROM point_transactions 
         WHERE user_id = $1 AND action_type = $2 
         AND created_at > CURRENT_DATE`,
    [userId, action]
  );
  const count = parseInt(res.rows[0]?.count || "0");
  return count >= limit;
}
async function getUserPoints(userId) {
  const res = await database_default.query("SELECT orbit_points FROM users WHERE id = $1", [userId]);
  return res.rows[0]?.orbit_points || 0;
}

// lib/services/chat-service.ts
var ChatService = class {
  /**
   * Store a new message in PostgreSQL
   */
  async storeMessage(message) {
    try {
      const result = await database_default.query(
        `INSERT INTO chapter_messages (chapter_id, sender_id, content) 
         VALUES ($1, $2, $3) 
         RETURNING id, created_at`,
        [message.chapterId, message.senderId, message.content]
      );
      const row = result.rows[0];
      const fullMessage = {
        ...message,
        id: row.id.toString(),
        timestamp: new Date(row.created_at).toISOString()
      };
      try {
        await awardOrbitPoints(parseInt(message.senderId), "chapter_chat_post", "Posted in chapter chat");
      } catch (err) {
        console.error("Failed to award points for chat message:", err);
      }
      return fullMessage;
    } catch (error) {
      console.error("Error storing message:", error);
      throw new Error("Failed to store message");
    }
  }
  /**
   * Get messages for a chapter with pagination
   */
  async getMessages(chapterId, limit = 50, cursor) {
    try {
      let queryText = `
        SELECT 
          cm.id,
          cm.chapter_id as "chapterId",
          cm.sender_id as "senderId",
          u.name as "senderName",
          u.profile_photo_url as "senderAvatarUrl",
          cm.content,
          cm.created_at as timestamp
        FROM chapter_messages cm
        JOIN users u ON cm.sender_id = u.id
        WHERE cm.chapter_id = $1
      `;
      const params = [chapterId];
      if (cursor) {
        queryText += ` AND cm.created_at < $2`;
        params.push(cursor);
      }
      queryText += ` ORDER BY cm.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit + 1);
      const result = await database_default.query(queryText, params);
      const messages = result.rows.map((row) => ({
        id: row.id.toString(),
        chapterId: row.chapterId.toString(),
        senderId: row.senderId.toString(),
        senderName: row.senderName || "Unknown User",
        senderAvatarUrl: row.senderAvatarUrl,
        content: row.content,
        timestamp: new Date(row.timestamp).toISOString()
      }));
      const hasMore = messages.length > limit;
      if (hasMore) {
        messages.pop();
      }
      const nextCursor = hasMore && messages.length > 0 ? messages[messages.length - 1].timestamp : null;
      return {
        messages: messages.reverse(),
        // Reverse to get chronological order
        nextCursor,
        hasMore
      };
    } catch (error) {
      console.error("Error getting messages:", error);
      throw new Error("Failed to retrieve messages");
    }
  }
  /**
   * Get recent messages for a chapter
   */
  async getRecentMessages(chapterId, limit = 20) {
    try {
      const result = await database_default.query(
        `SELECT 
          cm.id,
          cm.chapter_id as "chapterId",
          cm.sender_id as "senderId",
          u.name as "senderName",
          u.profile_photo_url as "senderAvatarUrl",
          cm.content,
          cm.created_at as timestamp
        FROM chapter_messages cm
        JOIN users u ON cm.sender_id = u.id
        WHERE cm.chapter_id = $1
        ORDER BY cm.created_at DESC
        LIMIT $2`,
        [chapterId, limit]
      );
      return result.rows.map((row) => ({
        id: row.id.toString(),
        chapterId: row.chapterId.toString(),
        senderId: row.senderId.toString(),
        senderName: row.senderName || "Unknown User",
        senderAvatarUrl: row.senderAvatarUrl,
        content: row.content,
        timestamp: new Date(row.timestamp).toISOString()
      })).reverse();
    } catch (error) {
      console.error("Error getting recent messages:", error);
      throw new Error("Failed to retrieve recent messages");
    }
  }
  /**
   * Get message count for a chapter
   */
  async getMessageCount(chapterId) {
    try {
      const result = await database_default.query(
        "SELECT COUNT(*) as count FROM chapter_messages WHERE chapter_id = $1",
        [chapterId]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error("Error getting message count:", error);
      return 0;
    }
  }
  /**
   * Get last activity timestamp for a chapter
   */
  async getLastActivity(chapterId) {
    try {
      const result = await database_default.query(
        "SELECT MAX(created_at) as last_activity FROM chapter_messages WHERE chapter_id = $1",
        [chapterId]
      );
      const lastActivity = result.rows[0].last_activity;
      return lastActivity ? new Date(lastActivity).toISOString() : null;
    } catch (error) {
      console.error("Error getting last activity:", error);
      return null;
    }
  }
  /**
   * Delete all messages for a chapter
   */
  async deleteChapterMessages(chapterId) {
    try {
      await database_default.query(
        "DELETE FROM chapter_messages WHERE chapter_id = $1",
        [chapterId]
      );
    } catch (error) {
      console.error("Error deleting chapter messages:", error);
      throw new Error("Failed to delete chapter messages");
    }
  }
  /**
   * Clean up old messages (keep only recent ones)
   */
  async cleanupOldMessages(chapterId, keepCount = 1e3) {
    try {
      await database_default.query(
        `DELETE FROM chapter_messages 
         WHERE chapter_id = $1 
         AND id NOT IN (
           SELECT id FROM chapter_messages 
           WHERE chapter_id = $1 
           ORDER BY created_at DESC 
           LIMIT $2
         )`,
        [chapterId, keepCount]
      );
    } catch (error) {
      console.error("Error cleaning up old messages:", error);
      throw new Error("Failed to cleanup old messages");
    }
  }
  /**
   * Health check - always returns true for PostgreSQL
   */
  async healthCheck() {
    try {
      await database_default.query("SELECT 1");
      return true;
    } catch (error) {
      return false;
    }
  }
};
var chatService = new ChatService();

// lib/services/group-chat-service.ts
var GroupChatService = class {
  async ensureTable() {
    await database_default.query(`
      CREATE TABLE IF NOT EXISTS secret_group_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES secret_groups(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 4000),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        edited_at TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS idx_secret_group_messages_group_created_at_desc ON secret_group_messages(group_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_secret_group_messages_sender ON secret_group_messages(sender_id);
    `);
  }
  async storeMessage(message) {
    const type = message.messageType || "text";
    const mediaUrl = message.mediaUrl || null;
    const metadata = message.metadata || {};
    const result = await database_default.query(
      `INSERT INTO secret_group_messages (group_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [message.groupId, message.senderId, message.content]
    );
    const meta = await database_default.query("SELECT name, profile_photo_url FROM users WHERE id = $1", [message.senderId]);
    const row = result.rows[0];
    try {
      await awardOrbitPoints(Number(message.senderId), "secret_group_activity", "Active in Secret Group");
    } catch (err) {
      console.error("Failed to award points for secret group message:", err);
    }
    return {
      id: String(row.id),
      groupId: String(message.groupId),
      senderId: String(message.senderId),
      senderName: meta.rows[0]?.name || "User",
      senderAvatarUrl: meta.rows[0]?.profile_photo_url || null,
      content: message.content,
      timestamp: new Date(row.created_at).toISOString(),
      messageType: type,
      mediaUrl: mediaUrl || void 0,
      metadata
    };
  }
  async getMessages(groupId, limit = 50, cursor) {
    let query = `
      SELECT
        gm.id,
        gm.group_id as "groupId",
        gm.sender_id as "senderId",
        u.name as "senderName",
        u.profile_photo_url as "senderAvatarUrl",
        gm.content,
        gm.created_at as timestamp
      FROM secret_group_messages gm
      JOIN users u ON u.id = gm.sender_id
      WHERE gm.group_id = $1
    `;
    const params = [groupId];
    if (cursor) {
      query += ` AND gm.created_at < $2`;
      params.push(cursor);
    }
    query += ` ORDER BY gm.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit + 1);
    const res = await database_default.query(query, params);
    const messages = res.rows.map((r) => ({
      id: String(r.id),
      groupId: String(r.groupId),
      senderId: String(r.senderId),
      senderName: r.senderName || "Unknown User",
      senderAvatarUrl: r.senderAvatarUrl,
      content: r.content,
      timestamp: new Date(r.timestamp).toISOString(),
      messageType: r.messageType || "text",
      mediaUrl: r.mediaUrl,
      metadata: r.metadata || {}
    }));
    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();
    const nextCursor = hasMore && messages.length > 0 ? messages[messages.length - 1].timestamp : null;
    return { messages: messages.reverse(), nextCursor, hasMore };
  }
};
var groupChatService = new GroupChatService();

// lib/utils/compression.ts
var import_zlib = require("zlib");
var COMPRESSED_PREFIX = "GZ:";
function compressMessage(content) {
  if (content.length < 100) {
    return content;
  }
  try {
    const compressed = (0, import_zlib.gzipSync)(Buffer.from(content, "utf-8"));
    const base64 = compressed.toString("base64");
    const compressedWithPrefix = COMPRESSED_PREFIX + base64;
    if (compressedWithPrefix.length < content.length) {
      return compressedWithPrefix;
    }
    return content;
  } catch (error) {
    console.error("Compression error:", error);
    return content;
  }
}
function decompressMessage(content) {
  if (!content.startsWith(COMPRESSED_PREFIX)) {
    return content;
  }
  try {
    const base64Data = content.slice(COMPRESSED_PREFIX.length);
    const compressed = Buffer.from(base64Data, "base64");
    const decompressed = (0, import_zlib.gunzipSync)(compressed);
    return decompressed.toString("utf-8");
  } catch (error) {
    console.error("Decompression error:", error);
    return content;
  }
}

// lib/services/dm-service.ts
var DMService = class {
  /**
   * Get or create a conversation between two users
   */
  async getConversation(conversationId, userId) {
    const query = `
      SELECT 
        c.id,
        c.last_message_at as "updatedAt",
        CASE WHEN c.user1_id = $2 THEN c.user2_id ELSE c.user1_id END as "otherUserId",
        u.name as "otherUserName",
        u.profile_photo_url as "otherUserProfilePhoto",
        dm.content as "lastMessageContent",
        dm.created_at as "lastMessageCreatedAt",
        dm.sender_id as "lastMessageSenderId",
        (
          SELECT COUNT(*)::int 
          FROM direct_messages 
          WHERE conversation_id = c.id 
          AND sender_id != $2 
          AND read_at IS NULL
        ) as "unreadCount"
      FROM conversations c
      JOIN users u ON (CASE WHEN c.user1_id = $2 THEN c.user2_id ELSE c.user1_id END) = u.id
      LEFT JOIN LATERAL (
        SELECT content, created_at, sender_id
        FROM direct_messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) dm ON true
      WHERE c.id = $1 AND (c.user1_id = $2 OR c.user2_id = $2)
    `;
    const res = await database_default.query(query, [conversationId, userId]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      otherUser: {
        id: row.otherUserId,
        name: row.otherUserName,
        profilePhotoUrl: row.otherUserProfilePhoto
      },
      lastMessage: row.lastMessageContent ? {
        content: decompressMessage(row.lastMessageContent),
        createdAt: row.lastMessageCreatedAt.toISOString(),
        senderId: row.lastMessageSenderId.toString()
      } : void 0,
      unreadCount: row.unreadCount,
      updatedAt: row.updatedAt.toISOString()
    };
  }
  /**
   * Get or create a conversation between two users
   */
  async getOrCreateConversation(userA, userB) {
    if (Number(userA) === Number(userB)) {
      throw new Error("Cannot create conversation with yourself");
    }
    const [u1, u2] = userA < userB ? [userA, userB] : [userB, userA];
    const existing = await database_default.query(
      "SELECT id FROM conversations WHERE user1_id = $1 AND user2_id = $2",
      [u1, u2]
    );
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }
    const created = await database_default.query(
      "INSERT INTO conversations (user1_id, user2_id) VALUES ($1, $2) RETURNING id",
      [u1, u2]
    );
    return created.rows[0].id;
  }
  /**
   * Get all conversations for a user
   */
  async getConversations(userId) {
    const query = `
      SELECT 
        c.id,
        c.last_message_at as "updatedAt",
        u.id as "otherUserId",
        u.name as "otherUserName",
        u.profile_photo_url as "otherUserProfilePhoto",
        dm.content as "lastMessageContent",
        dm.created_at as "lastMessageCreatedAt",
        dm.sender_id as "lastMessageSenderId",
        (
          SELECT COUNT(*)::int 
          FROM direct_messages 
          WHERE conversation_id = c.id 
          AND sender_id != $1 
          AND read_at IS NULL
        ) as "unreadCount"
      FROM conversations c
      JOIN users u ON (CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END) = u.id
      LEFT JOIN LATERAL (
        SELECT content, created_at, sender_id
        FROM direct_messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) dm ON true
      WHERE c.user1_id = $1 OR c.user2_id = $1
      ORDER BY c.last_message_at DESC
    `;
    const res = await database_default.query(query, [userId]);
    return res.rows.map((row) => ({
      id: row.id,
      otherUser: {
        id: row.otherUserId,
        name: row.otherUserName,
        profilePhotoUrl: row.otherUserProfilePhoto
      },
      lastMessage: row.lastMessageContent ? {
        content: decompressMessage(row.lastMessageContent),
        createdAt: row.lastMessageCreatedAt.toISOString(),
        senderId: row.lastMessageSenderId.toString()
      } : void 0,
      unreadCount: row.unreadCount,
      updatedAt: row.updatedAt.toISOString()
    }));
  }
  /**
   * Get message history for a conversation
   */
  /**
   * Get message history for a conversation
   */
  async getMessages(conversationId, limit = 50, cursor) {
    let query = `
      SELECT 
        id, 
        conversation_id as "conversationId", 
        sender_id as "senderId", 
        content, 
        message_type as "messageType",
        media_url as "mediaUrl",
        metadata,
        created_at as "createdAt", 
        read_at as "readAt"
      FROM direct_messages
      WHERE conversation_id = $1 AND is_archived = FALSE
    `;
    const params = [conversationId];
    if (cursor) {
      query += ` AND created_at < $2`;
      params.push(cursor);
    }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit + 1);
    const res = await database_default.query(query, params);
    const messages = res.rows.map((row) => ({
      ...row,
      senderId: row.senderId.toString(),
      content: decompressMessage(row.content),
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt ? row.readAt.toISOString() : null,
      messageType: row.messageType || "text",
      mediaUrl: row.mediaUrl,
      metadata: row.metadata || {}
    }));
    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();
    return {
      messages: messages.reverse(),
      hasMore
    };
  }
  /**
   * Store a new direct message
   */
  async storeMessage(conversationId, senderId, content, type = "text", mediaUrl, metadata = {}) {
    const client = await database_default.connect();
    try {
      await client.query("BEGIN");
      const compressedContent = compressMessage(content || "");
      const res = await client.query(
        `INSERT INTO direct_messages (conversation_id, sender_id, content, message_type, media_url, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, created_at`,
        [conversationId, senderId, compressedContent, type, mediaUrl, metadata]
      );
      const snippet = type === "text" ? content : `[${type}]`;
      await client.query(
        "UPDATE conversations SET last_message_at = $1 WHERE id = $2",
        [res.rows[0].created_at, conversationId]
      );
      const convRes = await client.query(
        "SELECT user1_id, user2_id FROM conversations WHERE id = $1",
        [conversationId]
      );
      if (convRes.rows.length > 0) {
        const { user1_id, user2_id } = convRes.rows[0];
        const recipientId = user1_id === senderId ? user2_id : user1_id;
        const senderRes = await client.query("SELECT name FROM users WHERE id = $1", [senderId]);
        const senderName = senderRes.rows[0]?.name || "Someone";
        const notifMsg = type === "text" ? "sent you a message" : `sent a ${type} message`;
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message, link, metadata)
                     VALUES ($1, 'message', 'New Message', $2, $3, $4)`,
          [
            recipientId,
            `${senderName} ${notifMsg}`,
            `/product/messages?conversationId=${conversationId}`,
            { senderId, type }
          ]
        );
      }
      await client.query("COMMIT");
      const row = res.rows[0];
      return {
        id: row.id,
        conversationId,
        senderId: senderId.toString(),
        content,
        createdAt: row.created_at.toISOString(),
        readAt: null,
        // @ts-ignore - Extension for frontend interface if needed
        messageType: type,
        mediaUrl,
        metadata
      };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
  /**
   * Mark all messages in a conversation as read by the recipient
   */
  async markAsRead(conversationId, userId) {
    await database_default.query(
      `UPDATE direct_messages 
       SET read_at = NOW() 
       WHERE conversation_id = $1 
       AND sender_id != $2 
       AND read_at IS NULL`,
      [conversationId, userId]
    );
  }
  /**
   * Get total unread message count for a user
   */
  async getUnreadCount(userId) {
    const res = await database_default.query(
      `SELECT COUNT(*)::int as count 
       FROM direct_messages dm
       JOIN conversations c ON dm.conversation_id = c.id
       WHERE (c.user1_id = $1 OR c.user2_id = $1)
       AND dm.sender_id != $1
       AND dm.read_at IS NULL`,
      [userId]
    );
    return res.rows[0].count;
  }
};
var dmService = new DMService();

// server/chat-server.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var import_cookie = __toESM(require("cookie"));
var app = (0, import_express.default)();
app.use((0, import_cors.default)({ origin: true, credentials: true }));
app.use(import_express.default.json());
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.post("/messages/:chapterId", async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { userId, content } = req.body;
    const senderIdNum = Number(userId);
    const text = String(content || "").trim();
    if (!chapterId || !senderIdNum) return res.status(400).json({ success: false, error: "chapterId and userId required" });
    if (!text) return res.status(400).json({ success: false, error: "Message cannot be empty" });
    if (text.length > 4e3) return res.status(400).json({ success: false, error: "Message too long" });
    const client = await database_default.connect();
    try {
      const mem = await client.query("SELECT 1 FROM chapter_memberships WHERE user_id = $1 AND chapter_id = $2 LIMIT 1", [senderIdNum, chapterId]);
      if (mem.rowCount === 0) return res.status(403).json({ success: false, error: "not a member of this chapter" });
      const userRes = await client.query("SELECT name, profile_photo_url FROM users WHERE id = $1", [senderIdNum]);
      const senderName = userRes.rows[0]?.name || "User";
      const senderAvatarUrl = userRes.rows[0]?.profile_photo_url || null;
      const saved = await chatService.storeMessage({
        chapterId: String(chapterId),
        senderId: String(senderIdNum),
        senderName,
        senderAvatarUrl,
        content: text
      });
      const room = `chapter-${chapterId}`;
      io.to(room).emit("newMessage", saved);
      res.json({ success: true, message: saved });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("HTTP /messages error", e);
    res.status(500).json({ success: false, error: "internal error" });
  }
});
app.get("/messages/:chapterId", async (req, res) => {
  try {
    const { chapterId } = req.params;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    if (!chapterId) return res.status(400).json({ success: false, error: "chapterId required" });
    const result = await chatService.getMessages(chapterId, limit);
    res.json({ success: true, messages: result.messages });
  } catch (e) {
    console.error("HTTP GET /messages error", e);
    res.status(500).json({ success: false, error: "internal error" });
  }
});
app.post("/groups/:groupId/messages", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, content } = req.body;
    const senderIdNum = Number(userId);
    const text = String(content || "").trim();
    if (!groupId || !senderIdNum) return res.status(400).json({ success: false, error: "groupId and userId required" });
    if (!text) return res.status(400).json({ success: false, error: "Message cannot be empty" });
    if (text.length > 4e3) return res.status(400).json({ success: false, error: "Message too long" });
    const client = await database_default.connect();
    try {
      const mem = await client.query("SELECT 1 FROM secret_group_memberships WHERE user_id = $1 AND group_id = $2 LIMIT 1", [senderIdNum, groupId]);
      if (mem.rowCount === 0) return res.status(403).json({ success: false, error: "not a member of this group" });
      await groupChatService.ensureTable();
      const saved = await groupChatService.storeMessage({ groupId: String(groupId), senderId: String(senderIdNum), content: text });
      const room = `group-${groupId}`;
      io.to(room).emit("group:newMessage", saved);
      res.json({ success: true, message: saved });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("HTTP /groups/:groupId/messages error", e);
    res.status(500).json({ success: false, error: "internal error" });
  }
});
app.get("/groups/:groupId/messages", async (req, res) => {
  try {
    const { groupId } = req.params;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    if (!groupId) return res.status(400).json({ success: false, error: "groupId required" });
    await groupChatService.ensureTable();
    const result = await groupChatService.getMessages(groupId, limit);
    res.json({ success: true, messages: result.messages });
  } catch (e) {
    console.error("HTTP GET /groups/:groupId/messages error", e);
    res.status(500).json({ success: false, error: "internal error" });
  }
});
var server = import_http.default.createServer(app);
var io = new import_socket.Server(server, {
  cors: { origin: true, credentials: true },
  pingInterval: 2e4,
  pingTimeout: 25e3,
  maxHttpBufferSize: 1e6
  // 1MB payload cap
});
if (database_default) {
  database_default.on("error", (err) => {
    console.error("Database pool error:", err);
  });
} else {
  console.error("Database pool is not initialized.");
}
io.use(async (socket, next) => {
  try {
    let token = socket.handshake.auth?.token;
    if (!token && socket.handshake.headers.cookie) {
      const cookies = import_cookie.default.parse(socket.handshake.headers.cookie);
      token = cookies.token;
    }
    if (!token) {
      console.log("Socket connection rejected: No token provided");
      return next(new Error("Authentication error: Token required"));
    }
    if (!process.env.JWT_SECRET) {
      return next(new Error("Server configuration error: JWT_SECRET missing"));
    }
    const decoded = import_jsonwebtoken.default.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.userId) {
      return next(new Error("Authentication error: Invalid token"));
    }
    const userIdStr = String(decoded.userId);
    socket.data.userId = userIdStr;
    console.log(`Socket authenticated for User ID: ${userIdStr}`);
    next();
  } catch (err) {
    console.error("Socket auth failure:", err);
    next(new Error("Authentication error"));
  }
});
var socketSession = {};
io.on("connection", async (socket) => {
  const userId = socket.data.userId;
  if (!userId) {
    socket.disconnect(true);
    return;
  }
  const userRoom = `user-${userId}`;
  await socket.join(userRoom);
  console.log(`Socket ${socket.id} joined private room ${userRoom}`);
  try {
    const client = await database_default.connect();
    try {
      const groupsRes = await client.query("SELECT group_id FROM secret_group_memberships WHERE user_id = $1", [Number(userId)]);
      const groups = groupsRes.rows;
      if (groups.length > 0) {
        const rooms = groups.map((g) => `group-${g.group_id}`);
        await socket.join(rooms);
        console.log(`Socket ${socket.id} (User ${userId}) auto-joined ${groups.length} group rooms`);
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(`Error auto-joining groups for user ${userId}:`, err);
  }
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", socket.id, "reason:", reason);
    delete socketSession[socket.id];
  });
  socket.on("joinRoom", async ({ chapterId }, ack) => {
    try {
      if (!chapterId) {
        ack?.({ ok: false, error: "chapterId required" });
        return;
      }
      const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
      const res = await fetch(`${appBaseUrl}/api/users/${encodeURIComponent(userId)}/chapters`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!res.ok) {
        ack?.({ ok: false, error: `membership check failed` });
        return;
      }
      const data = await res.json();
      const isMember = !!data?.success && Array.isArray(data.chapters) && data.chapters.some((c) => String(c.id) === String(chapterId));
      if (!isMember) {
        ack?.({ ok: false, error: "not a member of this chapter" });
        return;
      }
      const room = `chapter-${chapterId}`;
      socket.join(room);
      socketSession[socket.id] = { userId, chapterId };
      const count = io.sockets.adapter.rooms.get(room)?.size || 0;
      io.to(room).emit("presence", { count });
      ack?.({ ok: true });
    } catch (e) {
      console.error("joinRoom error", e);
      ack?.({ ok: false, error: "internal join error" });
    }
  });
  socket.on("sendMessage", async (message, ack) => {
    const session = socketSession[socket.id];
    if (!session || String(session.chapterId) !== String(message.chapterId) || String(session.userId) !== String(userId)) {
      ack?.({ ok: false, error: "unauthorized or not joined" });
      return;
    }
    const chapterId = String(message.chapterId);
    const senderIdNum = Number(userId);
    const content = (message.content || "").trim();
    if (!content) {
      ack?.({ ok: false, error: "Message empty" });
      return;
    }
    try {
      const client = await database_default.connect();
      try {
        const userRes = await client.query("SELECT name, profile_photo_url FROM users WHERE id = $1", [senderIdNum]);
        const senderName = userRes.rows[0]?.name || "User";
        const senderAvatarUrl = userRes.rows[0]?.profile_photo_url || null;
        const saved = await chatService.storeMessage({
          chapterId,
          senderId: String(senderIdNum),
          senderName,
          senderAvatarUrl,
          content
        });
        const room = `chapter-${chapterId}`;
        io.to(room).emit("newMessage", saved);
        awardOrbitPoints(senderIdNum, "chapter_chat_post", "Posted in chapter chat").catch(console.error);
        ack?.({ ok: true, message: saved });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error storing message:", error);
      ack?.({ ok: false, error: "failed to save message" });
    }
  });
  const rateLimitMap = /* @__PURE__ */ new Map();
  socket.on("send_message", async (payload, ack) => {
    try {
      const { conversationId, content, recipientId } = payload;
      const senderId = userId;
      if (!conversationId || !content || !recipientId) {
        ack?.({ ok: false, error: "missing parameters" });
        return;
      }
      const now = Date.now();
      const timestamps = rateLimitMap.get(senderId) || [];
      const recentTimestamps = timestamps.filter((t) => now - t < 6e4);
      if (recentTimestamps.length >= 30) {
        ack?.({ ok: false, error: "Rate limit exceeded. Please wait." });
        return;
      }
      recentTimestamps.push(now);
      rateLimitMap.set(senderId, recentTimestamps);
      const saved = await dmService.storeMessage(conversationId, Number(senderId), content);
      const recipientRoom = `user-${recipientId}`;
      io.to(recipientRoom).emit("receive_message", saved);
      const notificationPayload = {
        type: "message",
        sourceId: saved.id,
        title: "New Message",
        message: "You have a new message",
        link: `/product/messages?conversationId=${conversationId}`
      };
      io.to(recipientRoom).emit("new_notification", notificationPayload);
      const senderRoom = `user-${senderId}`;
      socket.to(senderRoom).emit("receive_message", saved);
      ack?.({ ok: true, message: saved });
    } catch (e) {
      console.error("send_message error", e);
      ack?.({ ok: false, error: "failed to send message" });
    }
  });
  socket.on("dm:read", async ({ conversationId }, ack) => {
    try {
      const uId = Number(userId);
      await dmService.markAsRead(conversationId, uId);
      ack?.({ ok: true });
    } catch (e) {
      console.error("dm:read error", e);
      ack?.({ ok: false, error: "internal error" });
    }
  });
  socket.on("group:join", async ({ groupId }, ack) => {
    try {
      if (!groupId) {
        ack?.({ ok: false, error: "groupId required" });
        return;
      }
      const mem = await database_default.query("SELECT 1 FROM secret_group_memberships WHERE user_id = $1 AND group_id = $2 LIMIT 1", [Number(userId), groupId]);
      if (mem.rowCount === 0) {
        ack?.({ ok: false, error: "not a member of this group" });
        return;
      }
      const room = `group-${groupId}`;
      socket.join(room);
      ack?.({ ok: true });
    } catch (e) {
      ack?.({ ok: false, error: "internal join error" });
    }
  });
  socket.on("group:send", async (payload, ack) => {
    try {
      const { groupId, content } = payload;
      const senderId = userId;
      const mem = await database_default.query("SELECT 1 FROM secret_group_memberships WHERE user_id = $1 AND group_id = $2 LIMIT 1", [Number(senderId), groupId]);
      if (mem.rowCount === 0) {
        ack?.({ ok: false, error: "not a member of this group" });
        return;
      }
      await groupChatService.ensureTable();
      const saved = await groupChatService.storeMessage({ groupId: String(groupId), senderId: String(senderId), content: String(content || "").trim() });
      const room = `group-${groupId}`;
      io.to(room).emit("group:newMessage", saved);
      awardOrbitPoints(Number(senderId), "secret_group_activity", "Active in secret group").catch(console.error);
      ack?.({ ok: true, message: saved });
    } catch (e) {
      ack?.({ ok: false, error: "internal error" });
    }
  });
  socket.on("joinAllRooms", async () => {
    try {
      const client = await database_default.connect();
      try {
        const userRes = await client.query("SELECT is_admin FROM users WHERE id = $1", [Number(userId)]);
        if (!userRes.rows[0]?.is_admin) return;
        const result = await client.query("SELECT id, name FROM chapters");
        const chapters = result.rows;
        chapters.forEach((chapter) => {
          socket.join(`chapter-${chapter.id}`);
        });
      } finally {
        client.release();
      }
    } catch (e) {
      console.error(e);
    }
  });
});
var basePort = Number(process.env.CHAT_SERVER_PORT || process.env.PORT || 4e3);
var strictPort = String(process.env.CHAT_SERVER_PORT_STRICT || "").toLowerCase() === "true";
function listenWithRetry(startPort, maxAttempts) {
  let attempt = 0;
  let currentPort = startPort;
  const tryListen = () => {
    attempt += 1;
    server.once("listening", () => {
      console.log(`Chat server listening on http://localhost:${currentPort}`);
      process.env.CHAT_SERVER_PORT = String(currentPort);
    });
    server.once("error", (err) => {
      if (err?.code === "EADDRINUSE") {
        if (strictPort) process.exit(1);
        if (attempt >= maxAttempts) process.exit(1);
        currentPort += 1;
        setTimeout(() => server.listen(currentPort), 50);
      } else {
        process.exit(1);
      }
    });
    server.listen(currentPort);
  };
  tryListen();
}
listenWithRetry(basePort, 10);
