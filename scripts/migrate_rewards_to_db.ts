
import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' }); // Fallback

// DB Config
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('render.com') || process.env.DATABASE_URL?.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : false,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
});

const DEFAULT_REWARDS = [
    { action: 'complete_profile', points: 100, desc: 'Complete your profile information', limit: null },
    { action: 'daily_login', points: 5, desc: 'Daily login bonus', limit: 1 },
    { action: 'chapter_chat_post', points: 10, desc: 'Start a discussion in Chapter Chat', limit: null },
    { action: 'reply_to_post', points: 5, desc: 'Helpful reply to a post', limit: null },
    { action: 'secret_group_activity', points: 15, desc: 'Active participation in Secret Group', limit: 1 }, // Per day limit enforced in code logic, but good to store here
    { action: 'send_thank_you', points: 20, desc: 'Express gratitude to a member', limit: null },
    { action: 'receive_thank_you', points: 50, desc: 'Receive gratitude from a member', limit: null },
    { action: 'event_feedback', points: 25, desc: 'Provide feedback after attending an event', limit: null },
];

async function deploy() {
    const client = await pool.connect();
    console.log('🔌 Connected to database...');

    try {
        await client.query('BEGIN');

        // 1. Create the table
        console.log('📦 Creating reward_configurations table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS reward_configurations (
        id SERIAL PRIMARY KEY,
        action_type VARCHAR(50) UNIQUE NOT NULL,
        description VARCHAR(255),
        points INTEGER NOT NULL DEFAULT 0,
        daily_limit INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // 2. Add trigger
        await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    `);

        // Check if trigger exists
        const triggerCheck = await client.query(`
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_reward_connfig_updated_at'
    `);

        if (triggerCheck.rowCount === 0) {
            await client.query(`
            CREATE TRIGGER update_reward_connfig_updated_at 
            BEFORE UPDATE ON reward_configurations 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        `);
        }

        // 3. Seed Data
        console.log('🌱 Seeding default reward configurations from current implementation...');

        for (const reward of DEFAULT_REWARDS) {
            await client.query(`
            INSERT INTO reward_configurations (action_type, points, description, daily_limit)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (action_type) 
            DO UPDATE SET 
                points = EXCLUDED.points,
                description = EXCLUDED.description,
                daily_limit = EXCLUDED.daily_limit;
        `, [reward.action, reward.points, reward.desc, reward.limit]);
        }

        await client.query('COMMIT');
        console.log('✅ Success! Reward configurations are live in the database.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Deployment failed:', e);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

deploy();
