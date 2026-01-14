import pool from '../lib/config/database';

async function migrateNavigatorSchema() {
    console.log('🚀 Starting Navigator AI Schema Migration...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Add fields to Users table
        console.log('Adding specific Navigator fields to users...');
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_discoverable BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            ADD COLUMN IF NOT EXISTS response_rate_score INTEGER DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS avg_response_time_minutes INTEGER DEFAULT NULL;
        `);

        // Index for performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_is_discoverable ON users(is_discoverable);
            CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON users(last_active_at DESC);
        `);

        // 2. Create Search Logs table for limits/auditing
        console.log('Creating navigator_search_logs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS navigator_search_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                search_intent TEXT,
                filters JSONB,
                results_count INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_navigator_logs_user_id ON navigator_search_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_navigator_logs_created_at ON navigator_search_logs(created_at DESC);
        `);

        // 3. Create Outreach Logs table (for cooldowns)
        console.log('Creating navigator_outreach_logs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS navigator_outreach_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                context_type VARCHAR(50), -- 'navigator_outreach'
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_outreach_sender_recipient ON navigator_outreach_logs(sender_id, recipient_id);
            CREATE INDEX IF NOT EXISTS idx_outreach_created_at ON navigator_outreach_logs(created_at DESC);
        `);

        await client.query('COMMIT');
        console.log('✅ Navigator AI Schema setup completed.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrateNavigatorSchema();
