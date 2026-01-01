import pool from '../config/database';

async function addIndexes() {
    const client = await pool.connect();
    try {
        console.log('Starting index migration...');

        // Users table indexes
        await client.query('CREATE INDEX IF NOT EXISTS idx_users_name_lower ON users (LOWER(name))');
        await client.query('CREATE INDEX IF NOT EXISTS idx_users_profession_lower ON users (LOWER(profession))');

        // Chapters table indexes
        await client.query('CREATE INDEX IF NOT EXISTS idx_chapters_location_city_lower ON chapters (LOWER(location_city))');

        // Events table indexes
        await client.query('CREATE INDEX IF NOT EXISTS idx_events_title_lower ON events (LOWER(title))');
        await client.query('CREATE INDEX IF NOT EXISTS idx_events_venue_address_lower ON events (LOWER(venue_address))');

        // Feed optimization
        await client.query('CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media (post_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_posts_status_published_at ON posts (status, published_at DESC)');

        console.log('Index migration completed successfully!');
    } catch (error) {
        console.error('Error adding indexes:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

addIndexes();
