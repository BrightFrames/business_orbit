import pool from '@/lib/config/database';
import { compressMessage, decompressMessage } from '@/lib/utils/compression';

export interface DirectMessage {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    createdAt: string;
    readAt: string | null;
    messageType?: 'text' | 'audio' | 'image' | 'video';
    mediaUrl?: string;
    metadata?: any;
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
    async getConversation(conversationId: string, userId: number): Promise<Conversation | null> {
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

        const res = await pool.query(query, [conversationId, userId]);

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
            } : undefined,
            unreadCount: row.unreadCount,
            updatedAt: row.updatedAt.toISOString()
        };
    }

    /**
     * Get or create a conversation between two users
     */
    async getOrCreateConversation(userA: number, userB: number): Promise<string> {
        if (Number(userA) === Number(userB)) {
            throw new Error("Cannot create conversation with yourself");
        }

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

        return res.rows.map((row: any) => ({
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
            } : undefined,
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
    async getMessages(conversationId: string, limit: number = 50, cursor?: string): Promise<{ messages: DirectMessage[], hasMore: boolean }> {
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
        const params: any[] = [conversationId];

        if (cursor) {
            query += ` AND created_at < $2`;
            params.push(cursor);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit + 1);

        const res = await pool.query(query, params);
        const messages = res.rows.map((row: any) => ({
            ...row,
            senderId: row.senderId.toString(),
            content: decompressMessage(row.content),
            createdAt: row.createdAt.toISOString(),
            readAt: row.readAt ? row.readAt.toISOString() : null,
            messageType: row.messageType || 'text',
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
    async storeMessage(
        conversationId: string,
        senderId: number,
        content: string,
        type: 'text' | 'audio' | 'image' | 'video' = 'text',
        mediaUrl?: string,
        metadata: any = {}
    ): Promise<DirectMessage> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Compress the message content before storing (only if text is huge, but util handles it)
            const compressedContent = compressMessage(content || '');

            const res = await client.query(
                `INSERT INTO direct_messages (conversation_id, sender_id, content, message_type, media_url, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, created_at`,
                [conversationId, senderId, compressedContent, type, mediaUrl, metadata]
            );

            // Update conversation last_message snippet (text only for snippet)
            // If audio/image, we show a placeholder text
            const snippet = type === 'text' ? content : `[${type}]`;

            await client.query(
                'UPDATE conversations SET last_message_at = $1 WHERE id = $2',
                [res.rows[0].created_at, conversationId]
            );

            // Get recipient ID to send notification
            const convRes = await client.query(
                'SELECT user1_id, user2_id FROM conversations WHERE id = $1',
                [conversationId]
            );

            if (convRes.rows.length > 0) {
                const { user1_id, user2_id } = convRes.rows[0];
                const recipientId = user1_id === senderId ? user2_id : user1_id;

                // Check for sender name
                const senderRes = await client.query('SELECT name FROM users WHERE id = $1', [senderId]);
                const senderName = senderRes.rows[0]?.name || 'Someone';

                const notifMsg = type === 'text' ? 'sent you a message' : `sent a ${type} message`;

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

            await client.query('COMMIT');

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
