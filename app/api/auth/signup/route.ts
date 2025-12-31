import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { cloudinary } from '@/lib/config/cloudinary';
import pool from '@/lib/config/database';
import { generateToken, setTokenCookie } from '@/lib/utils/auth';
import { proxyToBackend } from '@/lib/utils/proxy-api';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // In production on Vercel, proxy to backend (Vercel doesn't have database access)
  // Also proxy if database pool is not available
  if (process.env.VERCEL || !pool) {
    return proxyToBackend(request, '/api/auth/signup');
  }
  
  // Declare variables at function scope so they're accessible in catch block
  let name: string = '', email: string = '', phone: string = '', password: string = '', confirmPassword: string = '';
  let skills: string = '', description: string = '', profession: string = '', interest: string = '';
  let profilePhoto: File | null = null, banner: File | null = null;
  let skillsArray: string[] = [];
  let passwordHash: string = '';
  let profilePhotoUrl: string | null = null;
  let profilePhotoId: string | null = null;
  let bannerUrl: string | null = null;
  let bannerId: string | null = null;

  try {
    const formData = await request.formData();
    
    name = formData.get('name') as string;
    email = formData.get('email') as string;
    phone = formData.get('phone') as string;
    password = formData.get('password') as string;
    confirmPassword = formData.get('confirmPassword') as string;
    skills = formData.get('skills') as string;
    description = formData.get('description') as string;
    profession = formData.get('profession') as string;
    interest = formData.get('interest') as string;
    profilePhoto = formData.get('profilePhoto') as File;
    banner = formData.get('banner') as File;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Name, email, password, and confirm password are required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
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
    } catch (error) {
        skillsArray = [];
      }
    }

    // Handle file uploads with Cloudinary
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 4 * 1024 * 1024; // 4MB to align with serverless payload constraints

    // Upload helper: use base64 data URI (more reliable on serverless)
    const uploadImage = async (
      buffer: Buffer,
      options: { folder: string; transformation: any[]; resource_type?: 'image' | 'video' | 'raw' | 'auto' }
    ) => {
      const base64 = buffer.toString('base64')
      const dataUri = `data:image/jpeg;base64,${base64}`
      const result = await cloudinary.uploader.upload(dataUri, options as any)
      return result
    }

    // Upload profile photo to Cloudinary
    if (profilePhoto && profilePhoto.size > 0) {
      if (!allowedTypes.includes(profilePhoto.type)) {
        return NextResponse.json({ error: 'Invalid profile photo type. Only JPEG, PNG, GIF, and WebP are allowed' }, { status: 400 })
      }
      if (profilePhoto.size > maxSize) {
        return NextResponse.json({ error: 'Profile photo must be less than 4MB' }, { status: 400 })
      }
      try {
        // Check if Cloudinary is configured
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
          })
          
          profilePhotoUrl = profilePhotoResult.secure_url || profilePhotoResult.url;
          profilePhotoId = profilePhotoResult.public_id;
        } else {
          // Cloudinary not configured, skip photo upload
          profilePhotoUrl = null;
          profilePhotoId = null;
        }
      } catch (error: any) {
        // If upload fails, log and continue without photo
        console.error('Profile photo upload error:', error.message || error);
        profilePhotoUrl = null;
        profilePhotoId = null;
      }
    }

    // Upload banner to Cloudinary
    if (banner && banner.size > 0) {
      if (!allowedTypes.includes(banner.type)) {
        return NextResponse.json({ error: 'Invalid banner type. Only JPEG, PNG, GIF, and WebP are allowed' }, { status: 400 })
      }
      if (banner.size > maxSize) {
        return NextResponse.json({ error: 'Banner image must be less than 4MB' }, { status: 400 })
      }
      try {
        // Check if Cloudinary is configured
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
          })
          
          bannerUrl = bannerResult.secure_url || bannerResult.url;
          bannerId = bannerResult.public_id;
        } else {
          // Cloudinary not configured, skip banner upload
          bannerUrl = null;
          bannerId = null;
        }
      } catch (error: any) {
        // If upload fails, log and continue without banner
        console.error('Banner upload error:', error.message || error);
        bannerUrl = null;
        bannerId = null;
      }
    }

    // Insert user into database
    
    // First, try to add the profession column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS profession VARCHAR(255)
      `);
    } catch (columnError: any) {
      // Column might already exist, that's okay - ignore the error
    }

    // Try to add the interest column if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS interest VARCHAR(255)
      `);
    } catch (columnError: any) {
      // Column might already exist, that's okay - ignore the error
    }
    
    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, profile_photo_url, profile_photo_id, banner_url, banner_id, skills, description, profession, interest)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, name, email, phone, profile_photo_url, profile_photo_id, banner_url, banner_id, skills, description, profession, interest, created_at`,
      [name, email, phone, passwordHash, profilePhotoUrl, profilePhotoId, bannerUrl, bannerId, skillsArray, description, profession || null, interest || null]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken(user.id);

    // Create response
    const response = NextResponse.json({
      message: 'User created successfully',
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
        createdAt: user.created_at
      }
    }, { status: 201 });

    // Set cookie
    setTokenCookie(response, token);

    return response;

  } catch (error: any) {
    // Log error for debugging
    console.error('Signup error:', {
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      email: email || 'unknown'
    });
    
    // Provide more specific error messages
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    if (error.code === '42P01') {
      return NextResponse.json(
        { error: 'Database table not found. Please run the database setup.' },
        { status: 500 }
      );
    }
    
    if (error.code === '42703') {
      // Column doesn't exist - try to add it and retry
      // Only retry if we have all the required data
      if (!email || !passwordHash) {
        return NextResponse.json(
          { error: 'Database schema issue. Please try again.' },
          { status: 500 }
        );
      }
      
      try {
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profession VARCHAR(255)`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS interest VARCHAR(255)`);
        
        // Retry the insert with all fields
        const result = await pool.query(
          `INSERT INTO users (name, email, phone, password_hash, profile_photo_url, profile_photo_id, banner_url, banner_id, skills, description, profession, interest)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING id, name, email, phone, profile_photo_url, profile_photo_id, banner_url, banner_id, skills, description, profession, interest, created_at`,
          [name || '', email || '', phone || '', passwordHash, profilePhotoUrl, profilePhotoId, bannerUrl, bannerId, skillsArray, description || '', profession || null, interest || null]
        );
        
        const user = result.rows[0];
        const token = generateToken(user.id);
        
        const response = NextResponse.json({
          message: 'User created successfully',
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
            createdAt: user.created_at
          }
        }, { status: 201 });
        
        setTokenCookie(response, token);
        return response;
        
      } catch (retryError: any) {
        return NextResponse.json(
          { error: 'Database schema issue. Please contact support.' },
          { status: 500 }
        );
      }
    }
    
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'Database connection failed. Please check if PostgreSQL is running.' },
        { status: 500 }
      );
    }
    
    if (error.code === '28P01') {
      return NextResponse.json(
        { error: 'Database authentication failed. Please check your database credentials.' },
        { status: 500 }
      );
    }
    
    // Return detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Something went wrong. Please try again or contact support.';
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { code: error.code })
      },
      { status: 500 }
    );
  }
}
