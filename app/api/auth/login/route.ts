import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/config/database';
import { generateToken, setTokenCookie } from '@/lib/utils/auth';

export async function POST(request: NextRequest) {
  try {
    // Check if pool is available
    if (!pool) {
      return NextResponse.json(
        { error: 'Database connection not available. Please check server configuration.' },
        { status: 503 }
      );
    }

    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const result = await pool.query(
      'SELECT id, name, email, phone, password_hash, profile_photo_url, profile_photo_id, banner_url, banner_id, skills, description, profession, interest, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'EMAIL_NOT_REGISTERED', message: 'Email not registered. Please create a new account.' },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    // Check if user has password (not OAuth only)
    if (!user.password_hash) {
      return NextResponse.json(
        { error: 'Please use OAuth login or reset your password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Create response
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profilePhotoUrl: user.profile_photo_url,
        profilePhotoId: user.profile_photo_id,
        bannerUrl: user.banner_url,
        bannerId: user.banner_id,
        skills: user.skills,
        description: user.description,
        profession: user.profession,
        interest: user.interest,
        createdAt: user.created_at
      }
    });

    // Set cookie
    setTokenCookie(response, token);

    return response;

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
