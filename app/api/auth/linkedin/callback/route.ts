import { NextRequest, NextResponse } from 'next/server';

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
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.CLIENT_URL || 'http://localhost:3000'}/api/auth/linkedin/callback`,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('LinkedIn token exchange failed:', errorText);
      return NextResponse.redirect(new URL('/product/auth?error=token_exchange_failed', request.url));
    }

    const { access_token } = await tokenResponse.json();

    // Get user profile (Lite Profile)
    const profileResponse = await fetch('https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    // Get email address
    const emailResponse = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileResponse.ok || !emailResponse.ok) {
      return NextResponse.redirect(new URL('/product/auth?error=user_info_failed', request.url));
    }

    const profileData = await profileResponse.json();
    const emailData = await emailResponse.json();

    const linkedinId = profileData.id;
    const name = `${profileData.firstName.localized.en_US} ${profileData.lastName.localized.en_US}`;
    const email = emailData.elements[0]['handle~'].emailAddress;

    // Extract profile picture
    let picture = null;
    try {
      const displayImage = profileData.profilePicture?.['displayImage~']?.elements;
      if (displayImage && displayImage.length > 0) {
        picture = displayImage[displayImage.length - 1].identifiers[0].identifier;
      }
    } catch (e) {
      console.warn('Failed to extract LinkedIn profile picture');
    }

    if (!email) {
      return NextResponse.redirect(new URL('/product/auth?error=no_email', request.url));
    }

    // Database operations (Sync with users table)
    const { pool } = await import('@/lib/config/database');
    const { generateToken, setTokenCookie } = await import('@/lib/utils/auth');

    // Check if user exists
    let userResult = await pool.query('SELECT * FROM users WHERE linkedin_id = $1 OR email = $2', [linkedinId, email]);
    let userData;

    if (userResult.rows.length === 0) {
      // Create new user
      const newUser = await pool.query(
        `INSERT INTO users (name, email, linkedin_id, profile_photo_url, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         RETURNING *`,
        [name, email, linkedinId, picture]
      );
      userData = newUser.rows[0];
    } else {
      userData = userResult.rows[0];
      // Update existing user with LinkedIn ID if missing
      if (!userData.linkedin_id) {
        await pool.query('UPDATE users SET linkedin_id = $1, profile_photo_url = COALESCE(profile_photo_url, $2) WHERE id = $3', [linkedinId, picture, userData.id]);
      }
    }

    const token = generateToken(userData.id);
    const response = NextResponse.redirect(new URL('/product/profile', request.url));
    setTokenCookie(response, token);
    return response;

  } catch (error: any) {
    console.error('LinkedIn OAuth callback error:', error);
    return NextResponse.redirect(new URL('/product/auth?error=server_error', request.url));
  }
}



