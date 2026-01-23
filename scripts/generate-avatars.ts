/**
 * Generate Avatars for Existing Users
 * 
 * This script generates DiceBear avatars for existing users who:
 * 1. Have NULL profile_photo_url (no custom photo)
 * 2. Have never had an avatar generated
 * 
 * It does NOT overwrite user-uploaded photos.
 * 
 * Usage: npx ts-node scripts/generate-avatars.ts
 */

import pool from '../lib/config/database';
import { generateAvatarUrl, type Gender } from '../lib/utils/avatar';

async function generateAvatarsForExistingUsers() {
    console.log('Starting avatar generation for existing users...\n');

    try {
        // First, ensure the gender column exists
        await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)
    `);
        console.log('✓ Gender column verified\n');

        // Find users without profile photos
        const usersResult = await pool.query(`
      SELECT id, name, gender, profile_photo_url 
      FROM users 
      WHERE profile_photo_url IS NULL 
         OR profile_photo_url = ''
      ORDER BY id
    `);

        const users = usersResult.rows;
        console.log(`Found ${users.length} users without profile photos\n`);

        if (users.length === 0) {
            console.log('No users need avatars. Exiting.');
            return;
        }

        let updated = 0;
        let skipped = 0;

        for (const user of users) {
            try {
                const avatarUrl = generateAvatarUrl(user.id, user.gender as Gender);

                await pool.query(
                    'UPDATE users SET profile_photo_url = $1 WHERE id = $2',
                    [avatarUrl, user.id]
                );

                updated++;
                console.log(`✓ Generated avatar for user ${user.id} (${user.name})`);
            } catch (error) {
                skipped++;
                console.error(`✗ Failed for user ${user.id}:`, error);
            }
        }

        console.log(`\n=== Summary ===`);
        console.log(`Updated: ${updated} users`);
        console.log(`Skipped: ${skipped} users`);
        console.log(`Total: ${users.length} users processed`);

    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the script
generateAvatarsForExistingUsers()
    .then(() => {
        console.log('\nAvatar generation complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
