import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/config/database';
import { getUserFromToken } from '@/lib/utils/auth';

export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromToken(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const client = await pool.connect();
        try {
            // 1. Get User Total Points & Rank info (mocking rank for now as it requires complex query against all users)
            const userRes = await client.query(
                'SELECT orbit_points, (SELECT COUNT(*) FROM users WHERE orbit_points > u.orbit_points) + 1 as rank FROM users u WHERE id = $1',
                [user.id]
            );
            const orbitPoints = userRes.rows[0]?.orbit_points || 0;
            const rank = parseInt(userRes.rows[0]?.rank || '1');

            // 2. Get Recent Activity
            const activityRes = await client.query(
                `SELECT action_type, description, points, created_at 
         FROM point_transactions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 10`,
                [user.id]
            );

            // 3. Calculate Breakdown Stats (aggregating by type)
            const statsRes = await client.query(
                `SELECT action_type, SUM(points) as total_points, COUNT(*) as count
         FROM point_transactions
         WHERE user_id = $1
         GROUP BY action_type`,
                [user.id]
            );

            const stats = statsRes.rows;

            // Helper to find stat
            const getStat = (types: string[]) => {
                const relevant = stats.filter(s => types.includes(s.action_type));
                return {
                    points: relevant.reduce((sum, s) => sum + (parseInt(s.total_points) || 0), 0),
                    count: relevant.reduce((sum, s) => sum + (parseInt(s.count) || 0), 0)
                };
            };

            const activityStats = getStat(['chapter_chat_post', 'reply_to_post', 'secret_group_activity']);
            const reliabilityStats = getStat(['daily_login', 'event_feedback']); // Mapping loosely to reliability
            const thanksStats = getStat(['receive_thank_you']);

            return NextResponse.json({
                success: true,
                data: {
                    currentScore: orbitPoints,
                    rank: `Top ${rank}`, // Simplified rank
                    level: orbitPoints > 1000 ? 'Expert' : orbitPoints > 500 ? 'Advanced' : 'Member',
                    nextMilestone: Math.ceil((orbitPoints + 1) / 100) * 100, // Next 100
                    breakdown: {
                        activity: {
                            score: activityStats.points,
                            maxScore: 100, // Arbitrary cap for progress bar
                            details: {
                                totalEvents: activityStats.count
                            }
                        },
                        reliability: {
                            score: reliabilityStats.points,
                            maxScore: 100,
                            details: {
                                totalLogins: reliabilityStats.count // Simplified
                            }
                        },
                        thankYouNotes: {
                            score: thanksStats.points,
                            maxScore: 100,
                            details: {
                                received: { count: thanksStats.count, points: thanksStats.points }
                            }
                        }
                    },
                    recentActivity: activityRes.rows.map(row => ({
                        type: row.action_type,
                        description: row.description || formatActionType(row.action_type),
                        points: row.points,
                        date: new Date(row.created_at).toLocaleDateString()
                    }))
                }
            });

        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error('[RewardsSummary] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

function formatActionType(type: string): string {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
