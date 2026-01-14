import pool from '../lib/config/database';

async function main() {
    console.log('🚀 Starting Rewards Schema Update...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Update point_transactions table
        console.log('Updating point_transactions table...');
        await client.query(`
      ALTER TABLE point_transactions 
      ADD COLUMN IF NOT EXISTS source_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS category VARCHAR(50);
    `);

        // 2. Update reward_configurations table
        console.log('Updating reward_configurations table...');
        await client.query(`
      ALTER TABLE reward_configurations 
      ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'activity';
    `);

        // 3. Seed Reward Configurations
        console.log('Seeding reward configurations...');
        const configs = [
            // Onboarding
            { action: 'complete_profile', points: 100, limit: 1, category: 'activity', desc: 'Complete Profile' },
            { action: 'daily_login', points: 5, limit: 1, category: 'activity', desc: 'Daily Login' },

            // Community Contribution
            { action: 'chapter_chat_post', points: 10, limit: 5, category: 'contribution', desc: 'Post in Chapter Chat' },
            { action: 'reply_to_post', points: 5, limit: 10, category: 'contribution', desc: 'Reply to a Post or Request' },
            { action: 'secret_group_activity', points: 15, limit: 1, category: 'contribution', desc: 'Active in Secret Group Chat' },

            // Trust & Social Validation
            { action: 'send_thank_you', points: 20, limit: 3, category: 'outcome', desc: 'Send Thank You Note' },
            { action: 'receive_thank_you', points: 50, limit: 5, category: 'outcome', desc: 'Receive Thank You Note' },

            // Events & Outcome
            { action: 'event_feedback', points: 25, limit: null, category: 'outcome', desc: 'Fill Event Feedback Form' }, // Limit handled per event logic
            { action: 'consultation_complete', points: 0, limit: null, category: 'outcome', desc: 'Consultation Completed' } // Variable points
        ];

        for (const conf of configs) {
            // Use explicit NULL for limit if needed, otherwise value
            const limitVal = conf.limit === null ? 'NULL' : conf.limit;

            await client.query(`
        INSERT INTO reward_configurations (action_type, points, daily_limit, category, description, is_active)
        VALUES ($1, $2, ${limitVal}, $3, $4, true)
        ON CONFLICT (action_type) 
        DO UPDATE SET 
          points = EXCLUDED.points,
          daily_limit = EXCLUDED.daily_limit,
          category = EXCLUDED.category,
          description = EXCLUDED.description;
      `, [conf.action, conf.points, conf.category, conf.desc]);
        }

        await client.query('COMMIT');
        console.log('✅ Schema update and seeding completed successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

main();
