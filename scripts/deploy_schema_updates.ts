import pool from '../lib/config/database';

async function migrate() {
    console.log('Starting migration...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Add orbit_points to users
        console.log('Adding orbit_points to users table...');
        await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS orbit_points INTEGER DEFAULT 0;
    `);

        // 2. Create point_transactions
        console.log('Creating point_transactions table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS point_transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          points INTEGER NOT NULL,
          action_type VARCHAR(50) NOT NULL,
          description VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at DESC);
    `);

        // 3. Create thank_you_notes
        console.log('Creating thank_you_notes table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS thank_you_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          message TEXT NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 1000),
          is_public BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_thank_you_notes_sender ON thank_you_notes(sender_id);
      CREATE INDEX IF NOT EXISTS idx_thank_you_notes_receiver ON thank_you_notes(receiver_id);
    `);

        // 4. Create event_feedback
        console.log('Creating event_feedback table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS event_feedback (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          feedback TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(event_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_event_feedback_event_id ON event_feedback(event_id);
    `);

        // 5. Create secret_group_messages
        console.log('Creating secret_group_messages table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS secret_group_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          group_id UUID NOT NULL REFERENCES secret_groups(id) ON DELETE CASCADE,
          sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 4000),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_secret_group_messages_group_id ON secret_group_messages(group_id, created_at DESC);
    `);

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
