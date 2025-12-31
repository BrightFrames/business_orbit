import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { getUserFromToken } from '@/lib/utils/auth';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    const { recipient_email, message } = await request.json();
    const sender_id = user.id;

    console.log('📧 Sending invite:', { sender_id, recipient_email, message });

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient_email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Check if user is trying to invite themselves
    if (recipient_email === user.email) {
      return NextResponse.json(
        { error: 'You cannot invite yourself' },
        { status: 400 }
      );
    }

    // Check if invite already exists
    const existingInvite = await pool.query(
      'SELECT * FROM invites WHERE sender_id = $1 AND recipient_email = $2 AND status = $3',
      [sender_id, recipient_email, 'pending']
    );

    if (existingInvite.rows.length > 0) {
      return NextResponse.json(
        { error: 'Invite already sent to this email' },
        { status: 400 }
      );
    }

    // Get sender's name
    const senderResult = await pool.query('SELECT name FROM users WHERE id = $1', [sender_id]);
    if (senderResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Sender not found' },
        { status: 404 }
      );
    }
    const senderName = senderResult.rows[0].name;

    // Create invite in database
    const inviteResult = await pool.query(
      'INSERT INTO invites (sender_id, recipient_email, message) VALUES ($1, $2, $3) RETURNING *',
      [sender_id, recipient_email, message]
    );

    const invite = inviteResult.rows[0];
    console.log('✅ Invite created:', invite);

    // Send email using nodemailer
    try {
      // Create transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Email content
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Business Orbit Invitation</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">You've been invited to join our professional network!</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; margin-top: 0;">Hello!</h2>
            
            <p style="color: #666; line-height: 1.6;">
              <strong>${senderName}</strong> has invited you to join Business Orbit, a professional networking platform where you can connect with other professionals, share your expertise, and grow your career.
            </p>
            
            ${message ? `<blockquote style="border-left: 4px solid #667eea; padding-left: 20px; margin: 20px 0; color: #666; font-style: italic;">
              "${message}"
            </blockquote>` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                Join Business Orbit
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
              This invitation will expire in 7 days.<br>
              If you have any questions, please contact us.
            </p>
          </div>
        </div>
      `;

      // Send email
      await transporter.sendMail({
        from: `"Business Orbit" <${process.env.EMAIL_USER}>`,
        to: recipient_email,
        subject: `${senderName} invited you to join Business Orbit`,
        html: emailContent,
      });

      console.log('📧 Email sent successfully to:', recipient_email);
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      // Don't fail the entire request if email fails
      console.log('📧 Email sending failed, but invite was saved to database');
    }

    return NextResponse.json({
      success: true,
      message: 'Invite sent successfully',
      invite: {
        id: invite.id,
        recipient_email: invite.recipient_email,
        status: invite.status,
        created_at: invite.created_at
      }
    });

  } catch (error: any) {
    console.error('❌ Error sending invite:', error);
    return NextResponse.json(
      { error: 'Failed to send invite: ' + error.message },
      { status: 500 }
    );
  }
}
