import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { getUserFromToken } from '@/lib/utils/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    const { inviteId } = await params;
    const recipient_email = user.email;

    const result = await pool.query(
      'UPDATE invites SET status = $1 WHERE id = $2 AND recipient_email = $3 AND status = $4 RETURNING *',
      ['accepted', inviteId, recipient_email, 'pending']
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invite not found or already processed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invite accepted successfully',
      invite: result.rows[0]
    });

  } catch (error: any) {
    console.error('Error accepting invite:', error);
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    );
  }
}









