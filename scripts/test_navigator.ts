import { NavigatorService } from '../lib/services/navigator-service';
import pool from '../lib/config/database';

async function testNavigator() {
    console.log('🤖 Testing Navigator AI...');

    // 1. Setup Mock User
    const client = await pool.connect();
    let testUserId;

    try {
        const userRes = await client.query(`SELECT id FROM users LIMIT 1`);
        if (userRes.rowCount === 0) {
            console.log('No users found. Needs seeding.');
            return;
        }
        testUserId = userRes.rows[0].id;

        // Update last_active_at for a few users to ensure they are discovered
        await client.query(`UPDATE users SET last_active_at = NOW(), is_discoverable = TRUE WHERE id != $1`, [testUserId]);

    } finally {
        client.release();
    }

    // 2. Test Search
    const request = {
        search_intent: "I need a developer for a freelance project",
        requesting_user_id: testUserId, // Use the real ID
        limit: 5,
        custom_message_template: "Hi {{name}}, I saw your profile and..."
    };

    console.log(`🔎 Searching for: "${request.search_intent}"`);

    try {
        const result = await NavigatorService.search(request);

        console.log('--- Result Summary ---');
        console.log('Role:', result.search_summary.interpreted_role);
        console.log('Context:', result.search_summary.context);
        console.log('Results Found:', result.results.length);

        if (result.results.length > 0) {
            console.log('\n--- Top Match ---');
            console.log(JSON.stringify(result.results[0], null, 2));
            console.log('\n--- Message Preview ---');
            console.log(result.quick_message_preview);
        } else {
            console.log('No matches found. Check data seeding.');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        process.exit(0);
    }
}

testNavigator();
