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

    const recipient_email = user.email;
    
    const result = await pool.query(
      `SELECT i.id, i.status, i.message, i.created_at, 
              u.name as sender_name, u.email as sender_email, u.profile_photo_url as sender_photo
       FROM invites i 
       JOIN users u ON i.sender_id = u.id 
       WHERE i.recipient_email = $1 
       ORDER BY i.created_at DESC`,
      [recipient_email]
    );

    return NextResponse.json({
      success: true,
      invites: result.rows
    });

  } catch (error: any) {
    console.error('Error fetching received invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}









