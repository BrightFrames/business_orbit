import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { verifyOTP, OTPPurpose } from '@/lib/services/otp-service';
import { sendEmailVerifiedConfirmation } from '@/lib/services/email-service';
import { generateToken, setTokenCookie } from '@/lib/utils/auth';

export const runtime = 'nodejs';

/**
 * POST /api/auth/verify-otp
 * 
 * Verify OTP for email verification or other purposes
 * 
 * Body: { email: string, otp: string, purpose: 'verify_email' | 'forgot_password' }
 * 
 * Security:
 * - Max 3 attempts per OTP
 * - OTP expires after 10 minutes
 * - Returns remaining attempts on failure
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, otp, purpose } = body;

        // Validate input
        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        if (!otp || typeof otp !== 'string') {
            return NextResponse.json(
                { error: 'OTP is required' },
                { status: 400 }
            );
        }

        if (!purpose || !['verify_email', 'forgot_password', 'sensitive_action'].includes(purpose)) {
            return NextResponse.json(
                { error: 'Invalid purpose' },
                { status: 400 }
            );
        }

        // Verify OTP
        const result = await verifyOTP(email, otp, purpose as OTPPurpose);

        if (!result.success) {
            return NextResponse.json(
                {
                    error: result.error || 'Verification failed',
                    remainingAttempts: result.remainingAttempts
                },
                { status: 400 }
            );
        }

        // Handle specific purposes
        if (purpose === 'verify_email') {
            // Mark email as verified in database
            if (pool) {
                await pool.query(`
                    UPDATE users 
                    SET email_verified = TRUE, email_verified_at = NOW()
                    WHERE LOWER(email) = LOWER($1)
                `, [email]);

                // Get user details for response
                const userResult = await pool.query(
                    'SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)',
                    [email]
                );

                if (userResult.rows.length > 0) {
                    const user = userResult.rows[0];

                    // Send confirmation email
                    await sendEmailVerifiedConfirmation(email, user.name);

                    // Generate new token with verified status
                    const token = generateToken(user.id);

                    const response = NextResponse.json({
                        success: true,
                        message: 'Email verified successfully!',
                        emailVerified: true
                    });

                    setTokenCookie(response, token);
                    return response;
                }
            }

            return NextResponse.json({
                success: true,
                message: 'Email verified successfully!',
                emailVerified: true
            });
        }

        if (purpose === 'forgot_password') {
            // Generate a temporary reset token (valid for 5 minutes)
            // This token allows the user to reset their password
            const resetToken = Buffer.from(`${email}:${Date.now() + 5 * 60 * 1000}`).toString('base64');

            return NextResponse.json({
                success: true,
                message: 'OTP verified. You can now reset your password.',
                resetToken,
                canResetPassword: true
            });
        }

        // Generic success for other purposes
        return NextResponse.json({
            success: true,
            message: 'OTP verified successfully'
        });

    } catch (error: any) {
        console.error('[VerifyOTP] Error:', error.message);
        return NextResponse.json(
            { error: 'Verification failed. Please try again.' },
            { status: 500 }
        );
    }
}
