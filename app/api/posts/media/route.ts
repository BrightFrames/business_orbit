import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/auth';
import { cloudinary } from '@/lib/config/cloudinary';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    if (files.length > 2) {
      return NextResponse.json(
        { success: false, error: 'Maximum 2 files allowed' },
        { status: 400 }
      );
    }

    const uploadedMedia = [];

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        return NextResponse.json(
          { success: false, error: 'File size too large (max 10MB)' },
          { status: 400 }
        );
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: `Invalid file type: ${file.type}. Only images and videos are allowed.` },
          { status: 400 }
        );
      }

      try {
        // Convert File to Buffer for Cloudinary (same as profile upload)
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Upload to Cloudinary (same pattern as profile upload)
        const uploadResult = await new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'business-orbit/feed',
              resource_type: 'auto',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit' },
                { quality: 'auto' }
              ]
            },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error:', error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          );
          uploadStream.end(buffer);
        });
        
        if (!uploadResult || !uploadResult.secure_url) {
          throw new Error('Cloudinary upload failed: No URL returned');
        }

        uploadedMedia.push({
          media_type: uploadResult.resource_type === 'video' ? 'video' : 'image',
          cloudinary_public_id: uploadResult.public_id,
          cloudinary_url: uploadResult.secure_url,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        });
      } catch (uploadError: any) {
        console.error('Error uploading file to Cloudinary:', uploadError);
        return NextResponse.json(
          { 
            success: false, 
            error: `Failed to upload ${file.name}: ${uploadError.message || 'Unknown error'}` 
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: uploadedMedia
    });
  } catch (error: any) {
    console.error('Error uploading media:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to upload media' 
      },
      { status: 500 }
    );
  }
}
