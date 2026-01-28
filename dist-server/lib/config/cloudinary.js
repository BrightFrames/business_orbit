"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFeed = exports.uploadProfile = exports.upload = exports.cloudinary = void 0;
const cloudinary_client_1 = require("./cloudinary-client");
Object.defineProperty(exports, "cloudinary", { enumerable: true, get: function () { return cloudinary_client_1.cloudinary; } });
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const multer_1 = __importDefault(require("multer"));
// Configure Cloudinary storage for multer
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_client_1.cloudinary,
    params: {
        folder: 'business-orbit',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx'],
        transformation: [
            { width: 1200, height: 1200, crop: 'limit' }, // Limit size for feed media
            { quality: 'auto' } // Auto optimize quality
        ],
        resource_type: 'auto', // Support both images and videos
    },
});
// Configure multer with Cloudinary storage
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for feed media
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|pdf|doc|docx/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error('Only image, video, and document files are allowed!'));
        }
    },
});
exports.upload = upload;
// Create separate upload configurations for different use cases
const uploadProfile = (0, multer_1.default)({
    storage: new multer_storage_cloudinary_1.CloudinaryStorage({
        cloudinary: cloudinary_client_1.cloudinary,
        params: {
            folder: 'business-orbit/profile',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            transformation: [
                { width: 800, height: 800, crop: 'limit' },
                { quality: 'auto' }
            ],
            resource_type: 'image',
        },
    }),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit for profile photos
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed!'));
        }
    },
});
exports.uploadProfile = uploadProfile;
const uploadFeed = (0, multer_1.default)({
    storage: new multer_storage_cloudinary_1.CloudinaryStorage({
        cloudinary: cloudinary_client_1.cloudinary,
        params: {
            folder: 'business-orbit/feed',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx'],
            transformation: [
                { width: 1200, height: 1200, crop: 'limit' },
                { quality: 'auto' }
            ],
            resource_type: 'auto',
        },
    }),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for feed media
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|pdf|doc|docx/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error('Only image, video, and document files are allowed!'));
        }
    },
});
exports.uploadFeed = uploadFeed;
