import pool from '../lib/config/database';

async function runDecay() {
    console.log('📉 Starting Orbit Point Decay Process...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Identify users inactive for 30 days
        // "Meaningful activity" = any point transaction in last 30 days?
        // Or specific types? Let's assume any point transaction resets the clock.

        const inactiveUsersQuery = `
            SELECT u.id, u.orbit_points 
            FROM users u
            WHERE NOT EXISTS (
                SELECT 1 FROM point_transactions pt 
                WHERE pt.user_id = u.id 
                AND pt.created_at > NOW() - INTERVAL '30 days'
            )
            AND u.orbit_points > 0
        `;

        const res = await client.query(inactiveUsersQuery);
        const inactiveUsers = res.rows;

        console.log(`Found ${inactiveUsers.length} inactive users.`);

        for (const user of inactiveUsers) {
            // 2. Calculate decayable points (Activity + Contribution)
            // Outcome points do NOT decay.

            const pointsQuery = `
                SELECT SUM(points) as total 
                FROM point_transactions 
                WHERE user_id = $1 
                AND category IN ('activity', 'contribution')
            `;

            const pointsRes = await client.query(pointsQuery, [user.id]);
            const decayablePoints = parseInt(pointsRes.rows[0]?.total || '0');

            if (decayablePoints <= 0) continue;

            // 3. Apply 5% decay
            const decayAmount = Math.floor(decayablePoints * 0.05);

            if (decayAmount > 0) {
                console.log(`User ${user.id}: Decaying ${decayAmount} points (from ${decayablePoints} decayable).`);

                // Insert transaction
                await client.query(`
                    INSERT INTO point_transactions (user_id, points, action_type, description, category)
                    VALUES ($1, $2, 'point_decay', 'Monthly decay for inactivity', 'system')
                `, [user.id, -decayAmount]);

                // Update Balance
                await client.query(`
                    UPDATE users SET orbit_points = orbit_points - $1 WHERE id = $2
                `, [decayAmount, user.id]);
            }
        }

        await client.query('COMMIT');
        console.log('✅ Decay process completed successfully.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Decay process failed:', error);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

runDecay();
