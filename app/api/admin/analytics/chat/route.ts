import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'
import { proxyToBackend } from '@/lib/utils/proxy-api'

export async function GET(request: NextRequest) {
  // In production on Vercel, proxy to backend
  if (process.env.VERCEL || !pool) {
    const url = new URL(request.url);
    return proxyToBackend(request, `/api/admin/analytics/chat${url.search}`);
  }
  try {
    // Optional: Check if user is authenticated (but not required to be admin)
    const user = await getUserFromToken(request)

    // Proceed with analytics regardless of admin status

    // Get date range from query params (default to last 30 days)
    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '30')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Check database connection
    try {
      await pool.query('SELECT 1')
    } catch (dbError) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    // Execute all analytics queries in parallel for better performance
    const [
      totalMessagesResult,
      activeConversationsResult,
      peakUsageResult,
      messagesPerChapterResult,
      userEngagementResult,
      dailyActivityResult,
      performanceResult
    ] = await Promise.all([
      // Total messages count
      pool.query(
        'SELECT COUNT(*) as count FROM chapter_messages WHERE created_at >= $1',
        [startDate]
      ),
      // Active conversations (chapters with messages in date range)
      pool.query(
        'SELECT COUNT(DISTINCT chapter_id) as count FROM chapter_messages WHERE created_at >= $1',
        [startDate]
      ),
      // Peak usage times (hourly distribution)
      pool.query(`
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as message_count
        FROM chapter_messages 
        WHERE created_at >= $1
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `, [startDate]),
      // Messages per chapter (only chapters with messages)
      pool.query(`
        SELECT 
          c.name as chapter_name,
          c.location_city,
          COUNT(m.id) as message_count,
          COUNT(DISTINCT m.sender_id) as unique_senders
        FROM chapters c
        INNER JOIN chapter_messages m ON c.id = m.chapter_id AND m.created_at >= $1
        GROUP BY c.id, c.name, c.location_city
        HAVING COUNT(m.id) > 0
        ORDER BY message_count DESC
      `, [startDate]),
      // User engagement metrics
      pool.query(`
        SELECT 
          u.name as user_name,
          u.email,
          COUNT(m.id) as message_count,
          COUNT(DISTINCT m.chapter_id) as chapters_active
        FROM users u
        LEFT JOIN chapter_messages m ON u.id = m.sender_id AND m.created_at >= $1
        WHERE u.id IN (SELECT DISTINCT sender_id FROM chapter_messages WHERE created_at >= $1)
        GROUP BY u.id, u.name, u.email
        ORDER BY message_count DESC
        LIMIT 20
      `, [startDate]),
      // Daily activity for the last 30 days
      pool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as message_count,
          COUNT(DISTINCT sender_id) as unique_users,
          COUNT(DISTINCT chapter_id) as active_chapters
        FROM chapter_messages 
        WHERE created_at >= $1
        GROUP BY DATE(created_at)
        ORDER BY date
      `, [startDate]),
      // Performance metrics
      pool.query(`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(DISTINCT sender_id) as total_users,
          COUNT(DISTINCT chapter_id) as total_chapters,
          AVG(LENGTH(content)) as avg_message_length
        FROM chapter_messages 
        WHERE created_at >= $1
      `, [startDate])
    ]);

    const totalMessages = parseInt(totalMessagesResult.rows[0].count)
    const activeConversations = parseInt(activeConversationsResult.rows[0].count)

    const peakUsage = peakUsageResult.rows.map(row => ({
      hour: parseInt(row.hour),
      count: parseInt(row.message_count)
    }))

    const messagesPerChapter = messagesPerChapterResult.rows.map(row => ({
      chapterName: row.chapter_name,
      location: row.location_city,
      messageCount: parseInt(row.message_count),
      uniqueSenders: parseInt(row.unique_senders)
    }))

    const userEngagement = userEngagementResult.rows.map(row => ({
      userName: row.user_name,
      email: row.email,
      messageCount: parseInt(row.message_count),
      chaptersActive: parseInt(row.chapters_active)
    }))

    const dailyActivity = dailyActivityResult.rows.map(row => ({
      date: row.date,
      messageCount: parseInt(row.message_count),
      uniqueUsers: parseInt(row.unique_users),
      activeChapters: parseInt(row.active_chapters)
    }))

    const performance = performanceResult.rows[0] ? {
      totalMessages: parseInt(performanceResult.rows[0].total_messages),
      totalUsers: parseInt(performanceResult.rows[0].total_users),
      totalChapters: parseInt(performanceResult.rows[0].total_chapters),
      avgMessageLength: parseFloat(performanceResult.rows[0].avg_message_length || 0)
    } : {
      totalMessages: 0,
      totalUsers: 0,
      totalChapters: 0,
      avgMessageLength: 0
    }

    return NextResponse.json({
      success: true,
      data: {
        totalMessages,
        activeConversations,
        peakUsage,
        messagesPerChapter,
        userEngagement,
        dailyActivity,
        performance
      }
    })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
