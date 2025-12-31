import pool from '../config/database';

async function runMigration() {
  try {
    console.log('Running event_proposals table migration...');
    
    const sql = `
      CREATE TABLE IF NOT EXISTS event_proposals (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        event_title VARCHAR(255) NOT NULL,
        event_date TIMESTAMP NOT NULL,
        mode VARCHAR(50) NOT NULL CHECK (mode IN ('Online', 'Physical')),
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_event_proposals_status ON event_proposals(status);

      DROP TRIGGER IF EXISTS update_event_proposals_updated_at ON event_proposals;
      CREATE TRIGGER update_event_proposals_updated_at 
          BEFORE UPDATE ON event_proposals 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
    `;
    
    await pool.query(sql);
    
    console.log('✓ Migration completed successfully');
    console.log('✓ event_proposals table created');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('✗ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();

