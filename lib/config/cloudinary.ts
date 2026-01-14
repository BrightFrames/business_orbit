import { cloudinary } from './cloudinary-client';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

export { cloudinary };

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
  upload,
  uploadProfile,
  uploadFeed,
};
