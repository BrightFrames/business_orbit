import { NextResponse } from 'next/server';
import pool from '@/lib/config/database';

export async function GET() {
    try {
        // Add index on users(created_at) for faster sorting in members list
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_chapter_memberships_joined_at ON chapter_memberships(joined_at DESC);
    `);

        return NextResponse.json({ success: true, message: 'Database indexes created for performance' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
