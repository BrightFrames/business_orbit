import { v2 as cloudinary } from 'cloudinary';
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

export { cloudinary };
