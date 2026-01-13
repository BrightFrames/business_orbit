import pool from '../lib/config/database';
import { awardOrbitPoints } from '../lib/utils/rewards';

async function verifyRewards() {
    console.log('Starting Reward System Verification...');
    const client = await pool.connect();

    try {
        // 1. Setup Test User
        const testEmail = 'test_reward_user_' + Date.now() + '@example.com';
        const res = await client.query(
            `INSERT INTO users (name, email, password_hash, orbit_points) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, orbit_points`,
            ['Test Reward User', testEmail, 'hash', 0]
        );
        const user = res.rows[0];
        const userId = user.id;
        console.log(`Created test user ${userId} with ${user.orbit_points} points.`);

        // 2. Test Daily Login (5 pts)
        console.log('\nTesting Daily Login...');
        const login1 = await awardOrbitPoints(userId, 'daily_login', 'Test Login 1');
        console.log(`Login 1: Awarded=${login1.awarded}, Points=${login1.points}, Total=${login1.newTotal}`);

        // Test Daily Limit
        const login2 = await awardOrbitPoints(userId, 'daily_login', 'Test Login 2');
        console.log(`Login 2 (Limit Check): Awarded=${login2.awarded}, Points=${login2.points}, Total=${login2.newTotal}`);

        if (login1.points === 5 && login2.points === 0) {
            console.log('PASS: Daily Login Limit works.');
        } else {
            console.error('FAIL: Daily Login Limit check failed.');
        }

        // 3. Test Chapter Chat Post (10 pts)
        console.log('\nTesting Chapter Chat Post...');
        const chat1 = await awardOrbitPoints(userId, 'chapter_chat_post', 'Chat 1');
        console.log(`Chat 1: Awarded=${chat1.awarded}, Points=${chat1.points}, Total=${chat1.newTotal}`);

        if (chat1.points === 10) {
            console.log('PASS: Chapter Chat Post works.');
        } else {
            console.error('FAIL: Chapter Chat Post failed.');
        }

        // 4. Test Thank You Note (Send 20 / Receive 50)
        console.log('\nTesting Thank You Note...');
        const sendTy = await awardOrbitPoints(userId, 'send_thank_you', 'Sent TY');
        const recvTy = await awardOrbitPoints(userId, 'receive_thank_you', 'Received TY');
        console.log(`Send TY: ${sendTy.points}, Recv TY: ${recvTy.points}`);

        if (sendTy.points === 20 && recvTy.points === 50) {
            console.log('PASS: Thank You Note points work.');
        } else {
            console.error('FAIL: Thank You Note points failed.');
        }

        // 5. Verify Database State
        console.log('\nVerifying Database State...');
        const pointsRes = await client.query('SELECT orbit_points FROM users WHERE id = $1', [userId]);
        const finalPoints = pointsRes.rows[0].orbit_points;
        const txRes = await client.query('SELECT COUNT(*) as count FROM point_transactions WHERE user_id = $1', [userId]);
        const txCount = txRes.rows[0].count; // Login1, Chat1, SendTY, RecvTY = 4 transactions (Login2 blocked)

        console.log(`Final Database Points: ${finalPoints}`);
        console.log(`Transaction Count: ${txCount}`);

        const expectedPoints = 5 + 10 + 20 + 50; // 85
        if (finalPoints === expectedPoints) {
            console.log('PASS: Final point balance matches expected.');
        } else {
            console.error(`FAIL: Balance mismatch. Expected ${expectedPoints}, got ${finalPoints}`);
        }

        // Cleanup
        await client.query('DELETE FROM users WHERE id = $1', [userId]);
        console.log('\nCleanup completed.');

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

verifyRewards();
