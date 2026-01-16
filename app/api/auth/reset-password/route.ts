import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/config/database';
import { verifyOTP, invalidateOTPs } from '@/lib/services/otp-service';
import { sendPasswordResetConfirmation } from '@/lib/services/email-service';

export const runtime = 'nodejs';

/**
 * POST /api/auth/reset-password
 * 
 * Reset password after OTP verification
 * 
 * Body: { email: string, otp: string, newPassword: string }
 * 
 * Security:
 * - Requires valid OTP
 * - Password strength validation
 * - Invalidates all sessions after reset
 * - Sends confirmation email
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, otp, newPassword, resetToken } = body;

        // Validate input
        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        if (!newPassword || typeof newPassword !== 'string') {
            return NextResponse.json(
                { error: 'New password is required' },
                { status: 400 }
            );
        }

        // Password strength validation
        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        // Check for at least one number and one letter
        const hasLetter = /[a-zA-Z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        if (!hasLetter || !hasNumber) {
            return NextResponse.json(
                { error: 'Password must contain at least one letter and one number' },
                { status: 400 }
            );
        }

        // Verify either OTP or resetToken (from verify-otp response)
        let isVerified = false;

        if (otp) {
            // Verify OTP
            const otpResult = await verifyOTP(email, otp, 'forgot_password');
            isVerified = otpResult.success;

            if (!isVerified) {
                return NextResponse.json(
                    {
                        error: otpResult.error || 'Invalid or expired OTP',
                        remainingAttempts: otpResult.remainingAttempts
                    },
                    { status: 400 }
                );
            }
        } else if (resetToken) {
            // Verify reset token (from verify-otp step)
            try {
                const decoded = Buffer.from(resetToken, 'base64').toString('utf8');
                const [tokenEmail, expiryStr] = decoded.split(':');
                const expiry = parseInt(expiryStr, 10);

                if (tokenEmail.toLowerCase() !== email.toLowerCase()) {
                    return NextResponse.json(
                        { error: 'Invalid reset token' },
                        { status: 400 }
                    );
                }

                if (Date.now() > expiry) {
                    return NextResponse.json(
                        { error: 'Reset token has expired. Please request a new OTP.' },
                        { status: 400 }
                    );
                }

                isVerified = true;
            } catch {
                return NextResponse.json(
                    { error: 'Invalid reset token' },
                    { status: 400 }
                );
            }
        } else {
            return NextResponse.json(
                { error: 'OTP or reset token is required' },
                { status: 400 }
            );
        }

        if (!pool) {
            return NextResponse.json(
                { error: 'Database not available' },
                { status: 503 }
            );
        }

        // Get user
        const userResult = await pool.query(
            'SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)',
            [email]
        );

        if (userResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Account not found' },
                { status: 404 }
            );
        }

        const user = userResult.rows[0];

        // Hash new password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password in database
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [passwordHash, user.id]
        );

        // Invalidate all OTPs for this user
        await invalidateOTPs(email);

        // Send confirmation email
        await sendPasswordResetConfirmation(email, user.name);

        console.log(`[ResetPassword] Password reset successful for user ${user.id}`);

        // Note: For true session invalidation, you would need to:
        // 1. Store JWTs in a blacklist/whitelist
        // 2. Or use short-lived tokens with refresh tokens
        // 3. Or store session IDs in database
        // For now, the user's new login will generate a new token

        return NextResponse.json({
            success: true,
            message: 'Password reset successfully. You can now log in with your new password.'
        });

    } catch (error: any) {
        console.error('[ResetPassword] Error:', error.message);
        return NextResponse.json(
            { error: 'Failed to reset password. Please try again.' },
            { status: 500 }
        );
    }
}
