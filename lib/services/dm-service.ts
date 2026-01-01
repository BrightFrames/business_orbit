import pool from '@/lib/config/database';

export interface DirectMessage {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    createdAt: string;
    readAt: string | null;
}

export interface Conversation {
    id: string;
    otherUser: {
        id: number;
        name: string;
        profilePhotoUrl: string | null;
    };
    lastMessage?: {
        content: string;
        createdAt: string;
        senderId: string;
    };
    unreadCount: number;
    updatedAt: string;
}

class DMService {
    /**
     * Get or create a conversation between two users
     */
    async getOrCreateConversation(userA: number, userB: number): Promise<string> {
        const [u1, u2] = userA < userB ? [userA, userB] : [userB, userA];

        const existing = await pool.query(
            'SELECT id FROM conversations WHERE user1_id = $1 AND user2_id = $2',
            [u1, u2]
        );

        if (existing.rows.length > 0) {
            return existing.rows[0].id;
        }

        const created = await pool.query(
            'INSERT INTO conversations (user1_id, user2_id) VALUES ($1, $2) RETURNING id',
            [u1, u2]
        );

        return created.rows[0].id;
    }

    /**
     * Get all conversations for a user
     */
    async getConversations(userId: number): Promise<Conversation[]> {
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

        const res = await pool.query(query, [userId]);

        return res.rows.map(row => ({
            id: row.id,
            otherUser: {
                id: row.otherUserId,
                name: row.otherUserName,
                profilePhotoUrl: row.otherUserProfilePhoto
            },
            lastMessage: row.lastMessageContent ? {
                content: row.lastMessageContent,
                createdAt: row.lastMessageCreatedAt.toISOString(),
                senderId: row.lastMessageSenderId.toString()
            } : undefined,
            unreadCount: row.unreadCount,
            updatedAt: row.updatedAt.toISOString()
        }));
    }

    /**
     * Get message history for a conversation
     */
    async getMessages(conversationId: string, limit: number = 50, cursor?: string): Promise<{ messages: DirectMessage[], hasMore: boolean }> {
        let query = `
      SELECT id, conversation_id as "conversationId", sender_id as "senderId", content, created_at as "createdAt", read_at as "readAt"
      FROM direct_messages
      WHERE conversation_id = $1
    `;
        const params: any[] = [conversationId];

        if (cursor) {
            query += ` AND created_at < $2`;
            params.push(cursor);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit + 1);

        const res = await pool.query(query, params);
        const messages = res.rows.map(row => ({
            ...row,
            senderId: row.senderId.toString(),
            createdAt: row.createdAt.toISOString(),
            readAt: row.readAt ? row.readAt.toISOString() : null
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
    async storeMessage(conversationId: string, senderId: number, content: string): Promise<DirectMessage> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const res = await client.query(
                `INSERT INTO direct_messages (conversation_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING id, created_at`,
                [conversationId, senderId, content]
            );

            await client.query(
                'UPDATE conversations SET last_message_at = $1 WHERE id = $2',
                [res.rows[0].created_at, conversationId]
            );

            await client.query('COMMIT');

            const row = res.rows[0];
            return {
                id: row.id,
                conversationId,
                senderId: senderId.toString(),
                content,
                createdAt: row.created_at.toISOString(),
                readAt: null
            };
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    /**
     * Mark all messages in a conversation as read by the recipient
     */
    async markAsRead(conversationId: string, userId: number): Promise<void> {
        await pool.query(
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
    async getUnreadCount(userId: number): Promise<number> {
        const res = await pool.query(
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
}

export const dmService = new DMService();
export default dmService;
