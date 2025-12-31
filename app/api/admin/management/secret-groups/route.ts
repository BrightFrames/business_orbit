import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import { getUserFromToken } from '@/lib/utils/auth'

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS secret_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      admin_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
  await pool.query(`
    ALTER TABLE secret_groups 
    ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  `)
  await pool.query(`
    ALTER TABLE secret_groups 
    ADD COLUMN IF NOT EXISTS admin_name VARCHAR(255);
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS secret_group_memberships (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      group_id UUID NOT NULL REFERENCES secret_groups(id) ON DELETE CASCADE,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, group_id)
    );
  `)
}

export async function GET(request: NextRequest) {
  try {
    await ensureTables()
    
    // Get authenticated user
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // If user is admin, show all groups
    if (user.is_admin) {
      const res = await pool.query(
        `SELECT g.id, g.name, g.description, g.admin_id, g.admin_name, g.created_at, COUNT(m.user_id)::int AS member_count
         FROM secret_groups g
         LEFT JOIN secret_group_memberships m ON m.group_id = g.id
         GROUP BY g.id, g.admin_id, g.admin_name
         ORDER BY g.created_at DESC`
      )
      return NextResponse.json({ groups: res.rows }, { status: 200 })
    }

    // If not admin, only show groups where user is a member or is the admin
    const res = await pool.query(
      `SELECT DISTINCT g.id, g.name, g.description, g.admin_id, g.admin_name, g.created_at, 
              (SELECT COUNT(m2.user_id)::int FROM secret_group_memberships m2 WHERE m2.group_id = g.id) AS member_count
       FROM secret_groups g
       LEFT JOIN secret_group_memberships m ON m.group_id = g.id AND m.user_id = $1
       WHERE g.admin_id = $1 OR m.user_id = $1
       GROUP BY g.id, g.admin_id, g.admin_name
       ORDER BY g.created_at DESC`,
      [user.id]
    )
    return NextResponse.json({ groups: res.rows }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to load groups', details: e?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTables()
    const body = await req.json().catch(() => ({}))
    const name = String(body?.name || '').trim()
    const description = body?.description ? String(body.description) : null
    if (!name) return NextResponse.json({ success: false, message: 'Group name is required' }, { status: 400 })

    // Set admin as Business Orbit Admin for admin-created groups
    const adminName = 'Business Orbit Admin'

    const ins = await pool.query(
      `INSERT INTO secret_groups (name, description, admin_name) VALUES ($1, $2, $3)
       RETURNING id, name, description, admin_id, admin_name, created_at`,
      [name, description, adminName]
    )
    const group = { ...ins.rows[0], member_count: 0 }
    return NextResponse.json({ success: true, group }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'Failed to create group', details: e?.message }, { status: 500 })
  }
}
