import pool from '../config/database';

async function runMigration() {
  try {
    console.log('Adding host_id to events table and user_id to event_proposals...');
    
    const sql = `
      -- Add host_id to events table
      ALTER TABLE events ADD COLUMN IF NOT EXISTS host_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

      -- Add user_id to event_proposals table
      ALTER TABLE event_proposals ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

      -- Create index for faster lookups
      CREATE INDEX IF NOT EXISTS idx_events_host_id ON events(host_id);
      CREATE INDEX IF NOT EXISTS idx_event_proposals_user_id ON event_proposals(user_id);
    `;
    
    await pool.query(sql);
    
    console.log('✓ Migration completed successfully');
    console.log('✓ host_id added to events table');
    console.log('✓ user_id added to event_proposals table');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('✗ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();

