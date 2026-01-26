import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { cloudinary } from '@/lib/config/cloudinary';
import pool from '@/lib/config/database';
import {
    storePendingSignup,
    generateSessionToken,
    getPendingSignupByEmail
} from '@/lib/stores/pending-signup-store';
import { createOTP } from '@/lib/services/otp-service';
import { sendOTPEmail } from '@/lib/services/email-service';

export const runtime = 'nodejs';

/**
 * POST /api/auth/initiate-signup
 * 
 * Step 1 of the signup process:
 * 1. Validate all signup fields
 * 2. Check if email already exists
 * 3. Store signup data temporarily
 * 4. Send OTP to email
 * 5. Return session token
 * 
 * The actual account creation happens after OTP verification.
 */
export async function POST(request: NextRequest) {
    let name = '', email = '', phone = '', password = '', confirmPassword = '';
    let skills = '', description = '', profession = '', interest = '';
    let gender: 'male' | 'female' | 'other' | null = null;
    let profilePhoto: File | null = null, banner: File | null = null;
    let skillsArray: string[] = [];
    let passwordHash = '';
    let profilePhotoUrl: string | null = null;
    let profilePhotoId: string | null = null;
    let bannerUrl: string | null = null;
    let bannerId: string | null = null;

    try {
        const formData = await request.formData();

        name = (formData.get('name') as string)?.trim();
        email = (formData.get('email') as string)?.trim();
        phone = (formData.get('phone') as string)?.trim();
        password = formData.get('password') as string;
        confirmPassword = formData.get('confirmPassword') as string;
        skills = formData.get('skills') as string;
        description = formData.get('description') as string;
        profession = formData.get('profession') as string;
        interest = formData.get('interest') as string;
        const genderInput = formData.get('gender') as string;
        gender = (genderInput === 'male' || genderInput === 'female' || genderInput === 'other') ? genderInput : null;
        profilePhoto = formData.get('profilePhoto') as File;
        banner = formData.get('banner') as File;

        // Validation
        console.log('[InitiateSignup] Received:', { name, email: email?.substring(0, 5) + '***', phone: phone?.substring(0, 4) + '***' });

        if (!name || !email || !password || !confirmPassword) {
            console.log('[InitiateSignup] Missing required fields:', { name: !!name, email: !!email, password: !!password, confirmPassword: !!confirmPassword });
            return NextResponse.json(
                { error: 'Name, email, password, and confirm password are required' },
                { status: 400 }
            );
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('[InitiateSignup] Invalid email format:', email);
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            console.log('[InitiateSignup] Passwords do not match');
            return NextResponse.json(
                { error: 'Passwords do not match' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            console.log('[InitiateSignup] Password too short:', password.length);
            return NextResponse.json(
                { error: 'Password must be at least 6 characters long' },
                { status: 400 }
            );
        }

        // Check if user already exists in database
        if (pool) {
            const existingUser = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
            if (existingUser.rows.length > 0) {
                console.log('[InitiateSignup] User already exists:', email);
                return NextResponse.json(
                    { error: 'User with this email already exists' },
                    { status: 400 }
                );
            }
        }

        // Check if there's already a pending signup for this email
        const existingPending = getPendingSignupByEmail(email);
        if (existingPending) {
            // Allow re-initiating signup (resend OTP)
            console.log(`[InitiateSignup] Re-initiating signup for ${email}`);
        }

        // Hash password
        const saltRounds = 12;
        passwordHash = await bcrypt.hash(password, saltRounds);

        // Parse skills array
        if (skills) {
            try {
                skillsArray = JSON.parse(skills);
                if (!Array.isArray(skillsArray)) {
                    skillsArray = [];
                }
            } catch {
                skillsArray = [];
            }
        }

        // Handle file uploads with Cloudinary
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 4 * 1024 * 1024; // 4MB

        const uploadImage = async (
            buffer: Buffer,
            options: { folder: string; transformation: any[]; resource_type?: 'image' | 'video' | 'raw' | 'auto' }
        ) => {
            const base64 = buffer.toString('base64');
            const dataUri = `data:image/jpeg;base64,${base64}`;
            const result = await cloudinary.uploader.upload(dataUri, options as any);
            return result;
        };

        // Upload profile photo to Cloudinary
        if (profilePhoto && profilePhoto.size > 0) {
            if (!allowedTypes.includes(profilePhoto.type)) {
                return NextResponse.json({ error: 'Invalid profile photo type. Only JPEG, PNG, GIF, and WebP are allowed' }, { status: 400 });
            }
            if (profilePhoto.size > maxSize) {
                return NextResponse.json({ error: 'Profile photo must be less than 4MB' }, { status: 400 });
            }
            try {
                if ((process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) || process.env.CLOUDINARY_URL) {
                    const arrayBuffer = await profilePhoto.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const profilePhotoResult = await uploadImage(buffer, {
                        folder: 'business-orbit/profile-photos',
                        transformation: [
                            { width: 800, height: 800, crop: 'limit' },
                            { quality: 'auto:good' },
                            { fetch_format: 'auto' }
                        ],
                        resource_type: 'image'
                    });
                    profilePhotoUrl = profilePhotoResult.secure_url || profilePhotoResult.url;
                    profilePhotoId = profilePhotoResult.public_id;
                }
            } catch (error: any) {
                console.error('Profile photo upload error:', error.message || error);
            }
        }

        // Upload banner to Cloudinary
        if (banner && banner.size > 0) {
            if (!allowedTypes.includes(banner.type)) {
                return NextResponse.json({ error: 'Invalid banner type. Only JPEG, PNG, GIF, and WebP are allowed' }, { status: 400 });
            }
            if (banner.size > maxSize) {
                return NextResponse.json({ error: 'Banner image must be less than 4MB' }, { status: 400 });
            }
            try {
                if ((process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) || process.env.CLOUDINARY_URL) {
                    const arrayBuffer = await banner.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const bannerResult = await uploadImage(buffer, {
                        folder: 'business-orbit/banners',
                        transformation: [
                            { width: 1200, height: 400, crop: 'limit' },
                            { quality: 'auto:good' },
                            { fetch_format: 'auto' }
                        ],
                        resource_type: 'image'
                    });
                    bannerUrl = bannerResult.secure_url || bannerResult.url;
                    bannerId = bannerResult.public_id;
                }
            } catch (error: any) {
                console.error('Banner upload error:', error.message || error);
            }
        }

        // Generate session token
        const sessionToken = generateSessionToken();

        // Store pending signup data
        storePendingSignup(sessionToken, {
            name,
            email,
            phone,
            passwordHash,
            skills: skillsArray,
            description,
            profession,
            interest,
            gender,
            profilePhotoUrl,
            profilePhotoId,
            bannerUrl,
            bannerId,
        });

        // Get IP address for rate limiting
        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            'unknown';

        // Create and send OTP
        const otpResult = await createOTP(email, 'signup_verification', undefined, ipAddress);

        if (!otpResult.success) {
            return NextResponse.json(
                { error: otpResult.error || 'Failed to send verification code' },
                { status: 429 }
            );
        }

        // Send OTP via email
        const emailResult = await sendOTPEmail(
            email,
            name,
            otpResult.otp!,
            'signup_verification'
        );

        if (!emailResult.success) {
            console.error(`[InitiateSignup] Failed to send OTP email to ${email}:`, emailResult.error);
        }

        return NextResponse.json({
            success: true,
            message: 'Verification code sent to your email',
            sessionToken,
            email,
            expiresInMinutes: 10
        });

    } catch (error: any) {
        console.error('Initiate signup error:', {
            message: error.message,
            code: error.code,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });

        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}
