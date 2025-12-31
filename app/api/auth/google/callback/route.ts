import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { generateToken, setTokenCookie } from '@/lib/utils/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/product/auth?error=oauth_error', request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/product/auth?error=no_code', request.url));
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.CLIENT_URL || 'http://localhost:3000'}/api/auth/google/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(new URL('/product/auth?error=token_exchange_failed', request.url));
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(new URL('/product/auth?error=user_info_failed', request.url));
    }

    const googleUser = await userResponse.json();
    const { id: googleId, email, name, picture } = googleUser;

    if (!email) {
      return NextResponse.redirect(new URL('/product/auth?error=no_email', request.url));
    }

    // Check if user exists by Google ID first, then by email
    let user = await pool.query(
      'SELECT id, name, email, phone, profile_photo_url, profile_photo_id, banner_url, banner_id, skills, description, profession, interest, created_at FROM users WHERE google_id = $1',
      [googleId]
    );

    if (user.rows.length === 0) {
      // Check by email for existing users without Google ID
      user = await pool.query(
        'SELECT id, name, email, phone, profile_photo_url, profile_photo_id, banner_url, banner_id, skills, description, profession, interest, created_at FROM users WHERE email = $1',
        [email]
      );

      if (user.rows.length === 0) {
        // Create new user
        const newUser = await pool.query(
          `INSERT INTO users (name, email, google_id, profile_photo_url, created_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
           RETURNING id, name, email, phone, profile_photo_url, profile_photo_id, banner_url, banner_id, skills, description, profession, interest, created_at`,
          [name, email, googleId, picture]
        );
        user = newUser;
      } else {
        // Update existing user with Google ID
        await pool.query(
          'UPDATE users SET google_id = $1, profile_photo_url = COALESCE(profile_photo_url, $2) WHERE email = $3',
          [googleId, picture, email]
        );
      }
    }

    const userData = user.rows[0];

    // Generate JWT token
    const token = generateToken(userData.id);

    // Check user's onboarding and invite status to determine redirect
    let redirectUrl = '/product/auth';
    
    try {
      // Check if user has sent invites first
      const invitesResponse = await pool.query(
        'SELECT COUNT(*) as invite_count FROM invites WHERE sender_id = $1',
        [userData.id]
      );
      
      const hasSentInvites = invitesResponse.rows.length > 0 && parseInt(invitesResponse.rows[0].invite_count) > 0;
      
      if (!hasSentInvites) {
        // User hasn't sent invites, go to invite page first
        redirectUrl = '/product/invite';
      } else {
        // Check if user has completed onboarding
        const prefsResponse = await pool.query(
          'SELECT onboarding_completed FROM user_preferences WHERE user_id = $1',
          [userData.id]
        );
        
        const hasCompletedOnboarding = prefsResponse.rows.length > 0 && prefsResponse.rows[0].onboarding_completed;
        
        if (!hasCompletedOnboarding) {
          // User sent invites but hasn't completed onboarding
          redirectUrl = '/product/onboarding';
        } else {
          // User has completed everything
          redirectUrl = '/product/profile';
        }
      }
    } catch (error) {
      // Default to invite page if we can't determine state
      redirectUrl = '/product/invite';
    }

    // Create response with redirect
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));
    
    // Set cookie
    setTokenCookie(response, token);

    return response;

  } catch (error: any) {
    return NextResponse.redirect(new URL('/product/auth?error=server_error', request.url));
  }
}
