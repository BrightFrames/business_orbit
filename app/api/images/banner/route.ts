import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs'
import { cloudinary } from '@/lib/config/cloudinary';
import pool from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/auth';

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = verifyToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const formData = await request.formData();
    const banner = formData.get('banner') as File;

    if (!banner || banner.size === 0) {
      return NextResponse.json(
        { error: 'No banner image provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(banner.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (4MB limit to fit Vercel payload constraints)
    const maxSize = 4 * 1024 * 1024; // 4MB
    if (banner.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Get current user data to delete old image
    const currentUser = await pool.query(
      'SELECT banner_id FROM users WHERE id = $1',
      [userId]
    );

    if (currentUser.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete old banner from Cloudinary if it exists
    if (currentUser.rows[0].banner_id) {
      try {
        await cloudinary.uploader.destroy(currentUser.rows[0].banner_id);
      } catch (error) {
        console.error('Error deleting old banner:', error);
        // Continue with upload even if deletion fails
      }
    }

    // Upload new banner to Cloudinary
    let bannerUrl: string | null = null;
    let bannerId: string | null = null;

    try {
      const arrayBuffer = await banner.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'business-orbit/banners',
            transformation: [
              { width: 1200, height: 400, crop: 'limit' },
              { quality: 'auto:good' },
              { fetch_format: 'auto' }
            ]
          },
          (error, result) => {
            if (error) {
              console.error('Banner upload error:', error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        uploadStream.end(buffer);
      });
      
      bannerUrl = uploadResult.secure_url || uploadResult.url;
      bannerId = uploadResult.public_id;
    } catch (error) {
      console.error('Banner upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload image to Cloudinary' },
        { status: 500 }
      );
    }

    // Update database with new image info
    const result = await pool.query(
      `UPDATE users 
       SET banner_url = $1, banner_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, name, email, profile_photo_url, profile_photo_id, banner_url, banner_id`,
      [bannerUrl, bannerId, userId]
    );

    return NextResponse.json({
      message: 'Banner updated successfully',
      user: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        email: result.rows[0].email,
        profilePhotoUrl: result.rows[0].profile_photo_url,
        profilePhotoId: result.rows[0].profile_photo_id,
        bannerUrl: result.rows[0].banner_url,
        bannerId: result.rows[0].banner_id
      }
    });

  } catch (error: any) {
    console.error('Update banner error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = verifyToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get current user data
    const currentUser = await pool.query(
      'SELECT banner_id FROM users WHERE id = $1',
      [userId]
    );

    if (currentUser.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete banner from Cloudinary if it exists
    if (currentUser.rows[0].banner_id) {
      try {
        await cloudinary.uploader.destroy(currentUser.rows[0].banner_id);
      } catch (error) {
        console.error('Error deleting banner:', error);
        // Continue with database update even if deletion fails
      }
    }

    // Update database to remove image info
    const result = await pool.query(
      `UPDATE users 
       SET banner_url = NULL, banner_id = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, email, profile_photo_url, profile_photo_id, banner_url, banner_id`,
      [userId]
    );

    return NextResponse.json({
      message: 'Banner deleted successfully',
      user: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        email: result.rows[0].email,
        profilePhotoUrl: result.rows[0].profile_photo_url,
        profilePhotoId: result.rows[0].profile_photo_id,
        bannerUrl: result.rows[0].banner_url,
        bannerId: result.rows[0].banner_id
      }
    });

  } catch (error: any) {
    console.error('Delete banner error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
