"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinary = void 0;
const cloudinary_1 = require("cloudinary");
Object.defineProperty(exports, "cloudinary", { enumerable: true, get: function () { return cloudinary_1.v2; } });
const dotenv_1 = __importDefault(require("dotenv"));
// Only load .env.local in local dev; Vercel injects env at runtime
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
    dotenv_1.default.config({ path: '.env.local' });
}
// Configure Cloudinary (prefer explicit vars; if missing, fall back to CLOUDINARY_URL string)
// Only log warnings in production runtime, not during build
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'production' && !process.env.PM2_HOME;
try {
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        cloudinary_1.v2.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true,
        });
        if (!isBuildTime) {
            console.log('Cloudinary configured with explicit credentials');
        }
    }
    else if (process.env.CLOUDINARY_URL) {
        cloudinary_1.v2.config(process.env.CLOUDINARY_URL);
        cloudinary_1.v2.config({ secure: true });
        if (!isBuildTime) {
            console.log('Cloudinary configured with CLOUDINARY_URL');
        }
    }
    else {
        // Only warn in runtime, not during build (build doesn't need Cloudinary)
        if (!isBuildTime) {
            console.warn('Cloudinary env vars are not set. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET or CLOUDINARY_URL');
        }
    }
}
catch (error) {
    // Only log errors in runtime, not during build
    if (!isBuildTime) {
        console.error('Error configuring Cloudinary:', error);
    }
    // Don't throw - let individual routes handle the error
}
