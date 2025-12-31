import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'

function token() { return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) }

export async function POST(req: NextRequest, ctx: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const emails: string[] = Array.isArray(body?.emails) ? body.emails : []
    if (!emails.length) return NextResponse.json({ success: false, message: 'emails[] required' }, { status: 400 })

    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_invites (
        token TEXT PRIMARY KEY,
        group_id UUID NOT NULL REFERENCES secret_groups(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    const created: Array<{ token: string; email: string }> = []
    for (const email of emails) {
      const t = token()
      await pool.query(
        `INSERT INTO group_invites (token, group_id, email, status) VALUES ($1, $2, $3, 'pending')`,
        [t, groupId, String(email)]
      )
      created.push({ token: t, email: String(email) })
    }
    return NextResponse.json({ success: true, invites: created }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'Failed to create invites', details: e?.message }, { status: 500 })
  }
}
