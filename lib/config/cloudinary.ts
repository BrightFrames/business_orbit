import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

// Only load .env.local in local dev; Vercel injects env at runtime
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}

// Configure Cloudinary (prefer explicit vars; if missing, fall back to CLOUDINARY_URL string)
// Only log warnings in production runtime, not during build
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'production' && !process.env.PM2_HOME;

try {
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    if (!isBuildTime) {
      console.log('Cloudinary configured with explicit credentials');
    }
  } else if (process.env.CLOUDINARY_URL) {
    cloudinary.config(process.env.CLOUDINARY_URL);
    cloudinary.config({ secure: true });
    if (!isBuildTime) {
      console.log('Cloudinary configured with CLOUDINARY_URL');
    }
  } else {
    // Only warn in runtime, not during build (build doesn't need Cloudinary)
    if (!isBuildTime) {
      console.warn('Cloudinary env vars are not set. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET or CLOUDINARY_URL');
    }
  }
} catch (error) {
  // Only log errors in runtime, not during build
  if (!isBuildTime) {
    console.error('Error configuring Cloudinary:', error);
  }
  // Don't throw - let individual routes handle the error
}

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary as any,
  params: {
    folder: 'business-orbit',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx'],
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' }, // Limit size for feed media
      { quality: 'auto' } // Auto optimize quality
    ],
    resource_type: 'auto', // Support both images and videos
  } as any,
});

// Configure multer with Cloudinary storage
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for feed media
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|pdf|doc|docx/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, video, and document files are allowed!'));
    }
  },
});

// Create separate upload configurations for different use cases
const uploadProfile = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary as any,
    params: {
      folder: 'business-orbit/profile',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto' }
      ],
      resource_type: 'image',
    } as any,
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for profile photos
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

const uploadFeed = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary as any,
    params: {
      folder: 'business-orbit/feed',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx'],
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' }
      ],
      resource_type: 'auto',
    } as any,
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for feed media
  },
  fileFilter: (req: any, file: any, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|pdf|doc|docx/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, video, and document files are allowed!'));
    }
  },
});

export {
  cloudinary,
  upload,
  uploadProfile,
  uploadFeed,
};
