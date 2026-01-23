import pool from '@/lib/config/database';

export async function runChatOptimizationMigration() {
    const client = await pool.connect();
    try {
        console.log('Starting chat storage optimization...');
        await client.query('BEGIN');

        // 1. Optimize direct_messages table
        console.log('Optimizing direct_messages...');
        await client.query(`
      ALTER TABLE direct_messages 
      ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text',
      ADD COLUMN IF NOT EXISTS media_url TEXT,
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

      -- Create optimized index for fetching recent history
      CREATE INDEX IF NOT EXISTS idx_dm_conversation_history 
      ON direct_messages(conversation_id, created_at DESC) 
      WHERE is_archived = FALSE;

      -- Index for unread counts (highly frequent query)
      CREATE INDEX IF NOT EXISTS idx_dm_unread_lookup
      ON direct_messages(conversation_id, sender_id, read_at)
      WHERE read_at IS NULL;
    `);

        // 2. Optimize secret_group_messages table
        console.log('Optimizing secret_group_messages...');
        await client.query(`
      ALTER TABLE secret_group_messages 
      ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text',
      ADD COLUMN IF NOT EXISTS media_url TEXT,
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

      -- Create optimized index for fetching recent history (Partial index for hot data)
      CREATE INDEX IF NOT EXISTS idx_group_msg_history 
      ON secret_group_messages(group_id, created_at DESC) 
      WHERE is_archived = FALSE;
    `);

        // 3. Create Archive Tables (Cold Storage)
        // We use separate tables instead of partitions for simplicity in this migration
        console.log('Creating archive tables...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS direct_messages_archive (
        LIKE direct_messages INCLUDING ALL
      );

      CREATE TABLE IF NOT EXISTS secret_group_messages_archive (
        LIKE secret_group_messages INCLUDING ALL
      );

      -- Index archives primarily by date for specific lookups
      CREATE INDEX IF NOT EXISTS idx_dm_archive_date ON direct_messages_archive(created_at);
      CREATE INDEX IF NOT EXISTS idx_group_archive_date ON secret_group_messages_archive(created_at);
    `);

        // 4. Create function to archive old messages (Data Lifecycle)
        // Moves messages older than 6 months to archive tables
        console.log('Creating archival functions...');
        await client.query(`
      CREATE OR REPLACE FUNCTION archive_old_messages() RETURNS void AS $$
      DECLARE
        cutoff_date TIMESTAMP;
        count_dm INTEGER;
        count_group INTEGER;
      BEGIN
        cutoff_date := NOW() - INTERVAL '6 months';
        
        -- Archive DMs
        WITH moved_rows AS (
          DELETE FROM direct_messages
          WHERE created_at < cutoff_date
          RETURNING *
        )
        INSERT INTO direct_messages_archive
        SELECT * FROM moved_rows;
        
        GET DIAGNOSTICS count_dm = ROW_COUNT;
        
        -- Archive Group Messages
        WITH moved_rows AS (
          DELETE FROM secret_group_messages
          WHERE created_at < cutoff_date
          RETURNING *
        )
        INSERT INTO secret_group_messages_archive
        SELECT * FROM moved_rows;
        
        GET DIAGNOSTICS count_group = ROW_COUNT;
        
        RAISE NOTICE 'Archived % DMs and % Group Messages', count_dm, count_group;
      END;
      $$ LANGUAGE plpgsql;
    `);

        await client.query('COMMIT');
        console.log('Optimization complete!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
        throw err;
    } finally {
        client.release();
    }
}

// Run if called directly
if (require.main === module) {
    runChatOptimizationMigration()
        .then(() => process.exit(0))
        .catch((e) => { console.error(e); process.exit(1); });
}
