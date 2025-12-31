import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { getUserFromToken } from '@/lib/utils/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    const sender_id = user.id;
    
    const result = await pool.query(
      'SELECT id, recipient_email, status, message, created_at FROM invites WHERE sender_id = $1 ORDER BY created_at DESC',
      [sender_id]
    );

    return NextResponse.json({
      success: true,
      invites: result.rows
    });

  } catch (error: any) {
    console.error('Error fetching sent invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}









