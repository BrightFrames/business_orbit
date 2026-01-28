"use strict";
/**
 * DiceBear Avatar Utility
 *
 * Generates deterministic avatars based on user ID and gender.
 * Uses DiceBear CDN URLs for efficient avatar delivery.
 *
 * Gender → Style Mapping:
 * - male → avataaars (masculine style)
 * - female → lorelei (feminine style)
 * - other/null → bottts (neutral robot style)
 *
 * Seed: Uses user.id for stable, deterministic avatars
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAvatarUrl = generateAvatarUrl;
exports.getAvatarUrl = getAvatarUrl;
exports.hasCustomProfilePhoto = hasCustomProfilePhoto;
exports.generateAvatarForStorage = generateAvatarForStorage;
/**
 * Avatar style configuration based on gender
 */
const AVATAR_STYLES = {
    male: 'avataaars',
    female: 'lorelei',
    other: 'bottts',
    default: 'bottts'
};
/**
 * Generate a DiceBear avatar URL for a user
 *
 * @param userId - The user's unique ID (used as seed for determinism)
 * @param gender - The user's gender (male, female, other, or null)
 * @returns DiceBear CDN URL for the avatar
 *
 * @example
 * generateAvatarUrl(123, 'male')   // Returns avataaars style avatar
 * generateAvatarUrl(123, 'female') // Returns lorelei style avatar
 * generateAvatarUrl(123, null)     // Returns bottts style avatar
 */
function generateAvatarUrl(userId, gender) {
    // Determine style based on gender
    const style = gender && AVATAR_STYLES[gender]
        ? AVATAR_STYLES[gender]
        : AVATAR_STYLES.default;
    // Use user ID as seed for deterministic avatar generation
    // Same user → same avatar forever
    const seed = `user-${userId}`;
    // Generate DiceBear CDN URL
    // API v7 format: https://api.dicebear.com/7.x/{style}/svg?seed={seed}
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}
/**
 * Get avatar URL for a user, prioritizing user-uploaded photos
 *
 * @param user - User object with optional profile_photo_url, id, and gender
 * @returns The appropriate avatar URL (uploaded photo or DiceBear)
 *
 * @example
 * getAvatarUrl({ id: 123, profile_photo_url: 'https://...', gender: 'male' })
 * // Returns 'https://...' (user-uploaded)
 *
 * getAvatarUrl({ id: 123, profile_photo_url: null, gender: 'female' })
 * // Returns DiceBear URL with lorelei style
 */
function getAvatarUrl(user) {
    // Prioritize user-uploaded photo
    const uploadedPhoto = user.profile_photo_url || user.profilePhotoUrl;
    if (uploadedPhoto) {
        return uploadedPhoto;
    }
    // Fall back to DiceBear avatar
    return generateAvatarUrl(user.id, user.gender || null);
}
/**
 * Check if a user has a custom (uploaded) profile photo
 */
function hasCustomProfilePhoto(user) {
    const uploadedPhoto = user.profile_photo_url || user.profilePhotoUrl;
    return !!uploadedPhoto && uploadedPhoto.length > 0;
}
/**
 * Generate avatar URL for use in database (only if no custom photo exists)
 * Returns null if user already has a custom photo (to avoid overwriting)
 */
function generateAvatarForStorage(user) {
    if (hasCustomProfilePhoto(user)) {
        return null; // Don't overwrite user-uploaded photos
    }
    return generateAvatarUrl(user.id, user.gender || null);
}
