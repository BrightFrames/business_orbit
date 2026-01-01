import pool from '../config/database';

async function migratePosts() {
    try {
        console.log('Running posts table migration (adding status, scheduled_at, published_at)...');

        const sql = `
      -- Add status column if it doesn't exist
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='status') THEN
          ALTER TABLE posts ADD COLUMN status VARCHAR(20) DEFAULT 'published';
          -- Add check constraint for status
          ALTER TABLE posts ADD CONSTRAINT posts_status_check CHECK (status IN ('draft', 'scheduled', 'published', 'cancelled'));
        END IF;
      END $$;

      -- Add scheduled_at column if it doesn't exist
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='scheduled_at') THEN
          ALTER TABLE posts ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE;
        END IF;
      END $$;

      -- Add published_at column if it doesn't exist
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='published_at') THEN
          ALTER TABLE posts ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;
        END IF;
      END $$;
    `;

        await pool.query(sql);

        console.log('✓ Migration completed successfully');

        await pool.end();
        process.exit(0);
    } catch (error: any) {
        console.error('✗ Migration failed:', error.message);
        await pool.end();
        process.exit(1);
    }
}

migratePosts();
