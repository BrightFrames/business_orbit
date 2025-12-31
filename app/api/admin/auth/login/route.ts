import { NextRequest, NextResponse } from 'next/server';
import { generateToken, setTokenCookie } from '@/lib/utils/auth';
import pool from '@/lib/config/database';
import { proxyToBackend } from '@/lib/utils/proxy-api';

// Admin credentials from environment variables with fallback
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(request: NextRequest) {
  // In production on Vercel, proxy to backend (Vercel doesn't have database access)
  // Also proxy if database pool is not available
  if (process.env.VERCEL || !pool) {
    return proxyToBackend(request, '/api/admin/auth/login');
  }
  
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const isValid = email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    }

    // Get or create admin user in database
    let adminUser;
    try {
      // First, try to find existing admin user
      const existingUser = await pool.query(
        'SELECT id, name, email, is_admin FROM users WHERE email = $1 AND is_admin = true',
        [ADMIN_EMAIL]
      );

      if (existingUser.rows.length > 0) {
        adminUser = existingUser.rows[0];
      } else {
        // Create admin user if doesn't exist
        const newUser = await pool.query(
          'INSERT INTO users (name, email, is_admin, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, name, email, is_admin',
          ['Admin User', ADMIN_EMAIL, true]
        );
        adminUser = newUser.rows[0];
      }
      
      // Ensure is_admin is true
      if (!adminUser.is_admin) {
        await pool.query(
          'UPDATE users SET is_admin = true WHERE id = $1',
          [adminUser.id]
        );
        adminUser.is_admin = true;
      }
    } catch (dbError) {
      console.error('Database error during admin login:', dbError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Generate JWT token for admin user
    const token = generateToken(adminUser.id);

    // Create response with success
    const response = NextResponse.json({ 
      success: true, 
      isAdmin: true,
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        is_admin: adminUser.is_admin
      }
    });

    // Set the JWT token cookie (same as regular user auth)
    setTokenCookie(response, token);

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


