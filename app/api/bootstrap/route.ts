import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { verifyToken } from '@/lib/utils/auth';

export async function GET(request: NextRequest) {
    const token = request.cookies.get('token')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = verifyToken(token);
    if (!userId) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }


    try {
        const start = Date.now();

        // Execute all queries in parallel using pool.query (auto-managed connections)
        const [userRes, prefsRes, invitesRes, notifsRes] = await Promise.all([
            // 1. User Profile
            pool.query(
                `SELECT id, name, email, phone, profile_photo_url, profile_photo_id, banner_url, banner_id, 
         skills, description, profession, interest, orbit_points, last_active_at, created_at, is_admin 
         FROM users WHERE id = $1`,
                [userId]
            ),
            // 2. User Preferences (Onboarding)
            pool.query(
                `SELECT onboarding_completed FROM user_preferences WHERE user_id = $1`,
                [userId]
            ),
            // 3. Invites Sent Check
            pool.query(
                `SELECT 1 FROM invites WHERE sender_id = $1 LIMIT 1`,
                [userId]
            ),
            // 4. Notifications (Unread Count & Latest 20)
            pool.query(
                `SELECT 
           (SELECT COUNT(*)::int FROM notifications WHERE user_id = $1 AND is_read = false) as unread_count,
           (SELECT json_agg(n) FROM (
              SELECT id, type, title, message, link, is_read, created_at 
              FROM notifications 
              WHERE user_id = $1 
              ORDER BY created_at DESC 
              LIMIT 20
           ) n) as latest_notifications`,
                [userId]
            )
        ]);

        if (userRes.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = userRes.rows[0];
        const preferences = prefsRes.rows[0] || { onboarding_completed: false };
        const hasSentInvites = invitesRes.rows.length > 0;
        const notifications = {
            unreadCount: notifsRes.rows[0]?.unread_count || 0,
            items: notifsRes.rows[0]?.latest_notifications || []
        };

        // Update last_active_at efficiently (fire and forget)
        // Use pool.query directly - safe as it manages its own connection
        pool.query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [userId])
            .catch((err: any) => console.error('Failed to update activity', err));

        console.log(`[Bootstrap] Loaded data for user ${userId} in ${Date.now() - start}ms`);

        const response = NextResponse.json({
            success: true,
            data: {
                user: {
                    ...user,
                    // Normalize camelCase for frontend
                    profilePhotoUrl: user.profile_photo_url,
                    profilePhotoId: user.profile_photo_id,
                    bannerUrl: user.banner_url,
                    bannerId: user.banner_id,
                    orbitPoints: user.orbit_points,
                    isAdmin: user.is_admin,
                    rewardScore: user.orbit_points || 0,
                },
                preferences: {
                    onboardingCompleted: preferences.onboarding_completed
                },
                features: {
                    inviteSent: hasSentInvites
                },
                notifications
            }
        });

        // Add cache headers for performance (private cache only)
        response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');

        return response;

    } catch (error) {
        console.error('Bootstrap API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
