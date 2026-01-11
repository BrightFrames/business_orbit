import { NextResponse } from 'next/server'
import pool from '@/lib/config/database'

// Idempotent endpoint to publish any scheduled posts whose time has arrived.
// Safe to call periodically (e.g., on feed load or via cron).
// Supports both GET (for cron services) and POST methods.
async function publishScheduledPosts() {
  const now = new Date()
  const query = `
    UPDATE posts
    SET status = 'published',
        published_at = COALESCE(published_at, NOW())
    WHERE status = 'scheduled'
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= $1
    RETURNING id
  `
  // Use pool.query directly for single queries - it handles connect/release automatically
  const result = await pool.query(query, [now])
  return { success: true, published: result.rows.length }
}

export async function GET() {
  try {
    const result = await publishScheduledPosts()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[PublishScheduled] GET Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to publish scheduled posts', details: error.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const result = await publishScheduledPosts()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[PublishScheduled] POST Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to publish scheduled posts', details: error.message }, { status: 500 })
  }
}


