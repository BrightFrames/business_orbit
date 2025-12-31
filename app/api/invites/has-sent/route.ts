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
      'SELECT COUNT(*) as count FROM invites WHERE sender_id = $1',
      [sender_id]
    );

    const hasSentInvites = parseInt(result.rows[0].count) > 0;

    return NextResponse.json({
      success: true,
      hasSentInvites: hasSentInvites
    });

  } catch (error: any) {
    console.error('Error checking if user has sent invites:', error);
    return NextResponse.json(
      { error: 'Failed to check invites' },
      { status: 500 }
    );
  }
}
