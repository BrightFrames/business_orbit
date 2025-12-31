import pool from '@/lib/config/database';

export interface GroupChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  content: string;
  timestamp: string;
}

export interface GroupChatPaginationResult {
  messages: GroupChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

class GroupChatService {
  async ensureTable(): Promise<void> {
    await pool.query(`
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
    `)
  }

  async storeMessage(message: Omit<GroupChatMessage, 'id' | 'timestamp' | 'senderName' | 'senderAvatarUrl'>): Promise<GroupChatMessage> {
    const result = await pool.query(
      `INSERT INTO secret_group_messages (group_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [message.groupId, message.senderId, message.content]
    )

    const meta = await pool.query('SELECT name, profile_photo_url FROM users WHERE id = $1', [message.senderId])
    const row = result.rows[0]
    return {
      id: String(row.id),
      groupId: String(message.groupId),
      senderId: String(message.senderId),
      senderName: meta.rows[0]?.name || 'User',
      senderAvatarUrl: meta.rows[0]?.profile_photo_url || null,
      content: message.content,
      timestamp: new Date(row.created_at).toISOString(),
    }
  }

  async getMessages(groupId: string, limit: number = 50, cursor?: string): Promise<GroupChatPaginationResult> {
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
    `
    const params: any[] = [groupId]
    if (cursor) { query += ` AND gm.created_at < $2`; params.push(cursor) }
    query += ` ORDER BY gm.created_at DESC LIMIT $${params.length + 1}`
    params.push(limit + 1)

    const res = await pool.query(query, params)
    const messages = res.rows.map((r: any) => ({
      id: String(r.id),
      groupId: String(r.groupId),
      senderId: String(r.senderId),
      senderName: r.senderName || 'Unknown User',
      senderAvatarUrl: r.senderAvatarUrl,
      content: r.content,
      timestamp: new Date(r.timestamp).toISOString(),
    }))
    const hasMore = messages.length > limit
    if (hasMore) messages.pop()
    const nextCursor = hasMore && messages.length > 0 ? messages[messages.length - 1].timestamp : null
    return { messages: messages.reverse(), nextCursor, hasMore }
  }
}

export const groupChatService = new GroupChatService()




