import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { verifyOTP, OTPPurpose } from '@/lib/services/otp-service';
import { sendEmailVerifiedConfirmation, sendWelcomeEmail } from '@/lib/services/email-service';
import { generateToken, setTokenCookie } from '@/lib/utils/auth';
import {
    getPendingSignup,
    removePendingSignup,
    getSessionTokenByEmail
} from '@/lib/stores/pending-signup-store';
import { generateAvatarUrl } from '@/lib/utils/avatar';

export const runtime = 'nodejs';

/**
 * POST /api/auth/verify-otp
 * 
 * Verify OTP for email verification, password reset, or signup verification
 * 
 * Body: { email: string, otp: string, purpose: 'verify_email' | 'forgot_password' | 'signup_verification', sessionToken?: string }
 * 
 * Security:
 * - Max 3 attempts per OTP
 * - OTP expires after 10 minutes
 * - Returns remaining attempts on failure
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, otp, purpose, sessionToken } = body;

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

        if (!purpose || !['verify_email', 'forgot_password', 'sensitive_action', 'signup_verification'].includes(purpose)) {
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

        // Handle signup_verification - CREATE THE ACCOUNT
        if (purpose === 'signup_verification') {
            // Get session token from request or find by email
            const token = sessionToken || getSessionTokenByEmail(email);

            if (!token) {
                return NextResponse.json(
                    { error: 'Signup session expired. Please start over.' },
                    { status: 400 }
                );
            }

            const pendingData = getPendingSignup(token);

            if (!pendingData) {
                return NextResponse.json(
                    { error: 'Signup data expired. Please start over.' },
                    { status: 400 }
                );
            }

            // Verify email matches
            if (pendingData.email.toLowerCase() !== email.toLowerCase()) {
                return NextResponse.json(
                    { error: 'Email mismatch. Please start over.' },
                    { status: 400 }
                );
            }

            // Create the user account now that email is verified
            if (!pool) {
                return NextResponse.json(
                    { error: 'Database not available' },
                    { status: 500 }
                );
            }

            try {
                // Ensure required columns exist
                await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profession VARCHAR(255)`);
                await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS interest VARCHAR(255)`);
                await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)`);
                await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`);
                await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP`);

                // Insert the user with email already verified
                const userResult = await pool.query(
                    `INSERT INTO users (name, email, phone, password_hash, profile_photo_url, profile_photo_id, banner_url, banner_id, skills, description, profession, interest, gender, email_verified, email_verified_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, NOW())
                     RETURNING id, name, email, phone, profile_photo_url, profile_photo_id, banner_url, banner_id, skills, description, profession, interest, gender, email_verified, created_at`,
                    [
                        pendingData.name,
                        pendingData.email,
                        pendingData.phone,
                        pendingData.passwordHash,
                        pendingData.profilePhotoUrl,
                        pendingData.profilePhotoId,
                        pendingData.bannerUrl,
                        pendingData.bannerId,
                        pendingData.skills,
                        pendingData.description,
                        pendingData.profession || null,
                        pendingData.interest || null,
                        pendingData.gender
                    ]
                );

                const user = userResult.rows[0];

                // Generate DiceBear avatar if no profile photo was uploaded
                if (!pendingData.profilePhotoUrl) {
                    try {
                        const avatarUrl = generateAvatarUrl(user.id, pendingData.gender);
                        await pool.query(
                            'UPDATE users SET profile_photo_url = $1 WHERE id = $2',
                            [avatarUrl, user.id]
                        );
                        user.profile_photo_url = avatarUrl;
                    } catch (avatarError) {
                        console.error('[VerifyOTP] Failed to generate avatar:', avatarError);
                    }
                }

                // Remove pending signup data
                removePendingSignup(token);

                // Generate JWT token
                const jwtToken = generateToken(user.id);

                // Send welcome email (async, don't block)
                sendWelcomeEmail(email, pendingData.name).catch(err => {
                    console.error('[VerifyOTP] Failed to send welcome email:', err);
                });

                const response = NextResponse.json({
                    success: true,
                    message: 'Account created successfully!',
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        profilePhotoUrl: user.profile_photo_url,
                        bannerUrl: user.banner_url,
                        skills: user.skills,
                        description: user.description,
                        profession: user.profession,
                        interest: user.interest,
                        createdAt: user.created_at,
                        emailVerified: true,
                        location: 'Not specified',
                        rewardScore: 0,
                        mutualConnections: 0,
                        isPremium: false
                    }
                }, { status: 201 });

                setTokenCookie(response, jwtToken);
                return response;

            } catch (dbError: any) {
                console.error('[VerifyOTP] Database error creating user:', dbError);

                if (dbError.code === '23505') {
                    return NextResponse.json(
                        { error: 'User with this email already exists' },
                        { status: 400 }
                    );
                }

                return NextResponse.json(
                    { error: 'Failed to create account. Please try again.' },
                    { status: 500 }
                );
            }
        }

        // Handle verify_email - for existing users
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
