"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatService = void 0;
const database_1 = __importDefault(require("../config/database"));
const rewards_1 = require("../utils/rewards");
class ChatService {
    /**
     * Store a new message in PostgreSQL
     */
    async storeMessage(message) {
        try {
            const result = await database_1.default.query(`INSERT INTO chapter_messages (chapter_id, sender_id, content) 
         VALUES ($1, $2, $3) 
         RETURNING id, created_at`, [message.chapterId, message.senderId, message.content]);
            const row = result.rows[0];
            const fullMessage = {
                ...message,
                id: row.id.toString(),
                timestamp: new Date(row.created_at).toISOString(),
            };
            // Award points
            try {
                await (0, rewards_1.awardOrbitPoints)(parseInt(message.senderId), 'chapter_chat_post', 'Posted in chapter chat');
            }
            catch (err) {
                console.error('Failed to award points for chat message:', err);
            }
            return fullMessage;
        }
        catch (error) {
            console.error('Error storing message:', error);
            throw new Error('Failed to store message');
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
            params.push(limit + 1); // Get one extra to check if there are more
            const result = await database_1.default.query(queryText, params);
            const messages = result.rows.map((row) => ({
                id: row.id.toString(),
                chapterId: row.chapterId.toString(),
                senderId: row.senderId.toString(),
                senderName: row.senderName || 'Unknown User',
                senderAvatarUrl: row.senderAvatarUrl,
                content: row.content,
                timestamp: new Date(row.timestamp).toISOString(),
            }));
            const hasMore = messages.length > limit;
            if (hasMore) {
                messages.pop(); // Remove the extra message
            }
            const nextCursor = hasMore && messages.length > 0
                ? messages[messages.length - 1].timestamp
                : null;
            return {
                messages: messages.reverse(), // Reverse to get chronological order
                nextCursor,
                hasMore,
            };
        }
        catch (error) {
            console.error('Error getting messages:', error);
            throw new Error('Failed to retrieve messages');
        }
    }
    /**
     * Get recent messages for a chapter
     */
    async getRecentMessages(chapterId, limit = 20) {
        try {
            const result = await database_1.default.query(`SELECT 
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
        LIMIT $2`, [chapterId, limit]);
            return result.rows.map((row) => ({
                id: row.id.toString(),
                chapterId: row.chapterId.toString(),
                senderId: row.senderId.toString(),
                senderName: row.senderName || 'Unknown User',
                senderAvatarUrl: row.senderAvatarUrl,
                content: row.content,
                timestamp: new Date(row.timestamp).toISOString(),
            })).reverse(); // Reverse to get chronological order
        }
        catch (error) {
            console.error('Error getting recent messages:', error);
            throw new Error('Failed to retrieve recent messages');
        }
    }
    /**
     * Get message count for a chapter
     */
    async getMessageCount(chapterId) {
        try {
            const result = await database_1.default.query('SELECT COUNT(*) as count FROM chapter_messages WHERE chapter_id = $1', [chapterId]);
            return parseInt(result.rows[0].count, 10);
        }
        catch (error) {
            console.error('Error getting message count:', error);
            return 0;
        }
    }
    /**
     * Get last activity timestamp for a chapter
     */
    async getLastActivity(chapterId) {
        try {
            const result = await database_1.default.query('SELECT MAX(created_at) as last_activity FROM chapter_messages WHERE chapter_id = $1', [chapterId]);
            const lastActivity = result.rows[0].last_activity;
            return lastActivity ? new Date(lastActivity).toISOString() : null;
        }
        catch (error) {
            console.error('Error getting last activity:', error);
            return null;
        }
    }
    /**
     * Delete all messages for a chapter
     */
    async deleteChapterMessages(chapterId) {
        try {
            await database_1.default.query('DELETE FROM chapter_messages WHERE chapter_id = $1', [chapterId]);
        }
        catch (error) {
            console.error('Error deleting chapter messages:', error);
            throw new Error('Failed to delete chapter messages');
        }
    }
    /**
     * Clean up old messages (keep only recent ones)
     */
    async cleanupOldMessages(chapterId, keepCount = 1000) {
        try {
            await database_1.default.query(`DELETE FROM chapter_messages 
         WHERE chapter_id = $1 
         AND id NOT IN (
           SELECT id FROM chapter_messages 
           WHERE chapter_id = $1 
           ORDER BY created_at DESC 
           LIMIT $2
         )`, [chapterId, keepCount]);
        }
        catch (error) {
            console.error('Error cleaning up old messages:', error);
            throw new Error('Failed to cleanup old messages');
        }
    }
    /**
     * Health check - always returns true for PostgreSQL
     */
    async healthCheck() {
        try {
            await database_1.default.query('SELECT 1');
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
// Export singleton instance
exports.chatService = new ChatService();
exports.default = exports.chatService;
