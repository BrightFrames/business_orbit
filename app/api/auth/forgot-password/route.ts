import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { createOTP } from '@/lib/services/otp-service';
import { sendOTPEmail } from '@/lib/services/email-service';

export const runtime = 'nodejs';

/**
 * POST /api/auth/forgot-password
 * 
 * Initiate password reset flow by sending OTP
 * 
 * Body: { email: string }
 * 
 * Security:
 * - Does NOT reveal if email exists (prevents enumeration)
 * - Rate limited per email and IP
 * - Same response for existing and non-existing emails
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        // Validate input
        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Get IP address for rate limiting
        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            'unknown';

        // Check if user exists (but don't reveal this to client)
        let user = null;
        if (pool) {
            const userResult = await pool.query(
                'SELECT id, name, email, password_hash FROM users WHERE LOWER(email) = LOWER($1)',
                [email]
            );
            user = userResult.rows[0] || null;
        }

        // Generic response message (same for all cases)
        const genericResponse = {
            success: true,
            message: 'If an account exists with this email, you will receive a password reset code shortly.'
        };

        // If user doesn't exist, return success (prevent enumeration)
        if (!user) {
            console.log(`[ForgotPassword] Request for non-existent email: ${email.substring(0, 3)}***`);
            return NextResponse.json(genericResponse);
        }

        // Check if user has password (OAuth-only users can't reset)
        if (!user.password_hash) {
            console.log(`[ForgotPassword] OAuth-only user attempted password reset: ${user.id}`);
            // Still return generic response to prevent enumeration
            return NextResponse.json(genericResponse);
        }

        // Create OTP
        const otpResult = await createOTP(email, 'forgot_password', user.id, ipAddress);

        if (!otpResult.success) {
            // Rate limited
            return NextResponse.json(
                { error: otpResult.error || 'Too many requests. Please try again later.' },
                { status: 429 }
            );
        }

        // Send OTP email
        const emailResult = await sendOTPEmail(
            email,
            user.name || 'User',
            otpResult.otp!,
            'forgot_password'
        );

        if (!emailResult.success) {
            console.error(`[ForgotPassword] Failed to send email:`, emailResult.error);
            // Still return success to prevent enumeration
        }

        return NextResponse.json(genericResponse);

    } catch (error: any) {
        console.error('[ForgotPassword] Error:', error.message);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}
