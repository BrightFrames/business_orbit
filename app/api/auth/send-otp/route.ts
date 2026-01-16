import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { createOTP, OTPPurpose } from '@/lib/services/otp-service';
import { sendOTPEmail } from '@/lib/services/email-service';

export const runtime = 'nodejs';

/**
 * POST /api/auth/send-otp
 * 
 * Send OTP for email verification or password reset
 * 
 * Body: { email: string, purpose: 'verify_email' | 'forgot_password' }
 * 
 * Security:
 * - Rate limited per email and IP
 * - Does NOT reveal if email exists (for forgot_password)
 * - OTP is hashed before storage
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, purpose } = body;

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

        if (!purpose || !['verify_email', 'forgot_password', 'sensitive_action'].includes(purpose)) {
            return NextResponse.json(
                { error: 'Invalid purpose. Must be verify_email, forgot_password, or sensitive_action' },
                { status: 400 }
            );
        }

        // Get IP address for rate limiting
        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            'unknown';

        // Check if email exists in database
        let user = null;
        if (pool) {
            const userResult = await pool.query(
                'SELECT id, name, email, email_verified FROM users WHERE LOWER(email) = LOWER($1)',
                [email]
            );
            user = userResult.rows[0] || null;
        }

        // For verify_email, user must exist
        if (purpose === 'verify_email') {
            if (!user) {
                return NextResponse.json(
                    { error: 'No account found with this email' },
                    { status: 404 }
                );
            }

            if (user.email_verified) {
                return NextResponse.json(
                    { error: 'Email is already verified' },
                    { status: 400 }
                );
            }
        }

        // For forgot_password, we return success even if email doesn't exist (security)
        // This prevents email enumeration attacks
        if (purpose === 'forgot_password' && !user) {
            // Log this attempt for monitoring
            console.log(`[SendOTP] Password reset requested for non-existent email: ${email.substring(0, 3)}***`);

            // Return success to prevent email enumeration
            return NextResponse.json({
                success: true,
                message: 'If an account exists with this email, you will receive an OTP shortly.'
            });
        }

        // Create OTP
        const otpResult = await createOTP(
            email,
            purpose as OTPPurpose,
            user?.id,
            ipAddress
        );

        if (!otpResult.success) {
            // Rate limit or other error
            return NextResponse.json(
                { error: otpResult.error || 'Failed to generate OTP' },
                { status: 429 }
            );
        }

        // Send OTP via email
        const emailResult = await sendOTPEmail(
            email,
            user?.name || 'User',
            otpResult.otp!,
            purpose as OTPPurpose
        );

        if (!emailResult.success) {
            console.error(`[SendOTP] Failed to send email to ${email}:`, emailResult.error);
            // Don't fail the request if email fails - user can retry
            // But log it for monitoring
        }

        // Generic success response (no data leakage)
        return NextResponse.json({
            success: true,
            message: purpose === 'forgot_password'
                ? 'If an account exists with this email, you will receive an OTP shortly.'
                : 'OTP sent successfully. Please check your email.',
            expiresInMinutes: 10
        });

    } catch (error: any) {
        console.error('[SendOTP] Error:', error.message);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}
