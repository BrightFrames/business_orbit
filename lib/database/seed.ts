import dotenv from 'dotenv';
import pool from '../config/database';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const AVAILABLE_CHAPTERS = [
    "Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad",
    "Chandigarh", "Indore", "Bhubaneswar", "Noida", "Gurugram", "Jaipur", "Lucknow", "Kanpur",
    "Nagpur", "Visakhapatnam", "Surat", "Vadodara"
];

const DEFAULT_SECRET_GROUPS = [
    { name: "Entrepreneurs Lounge", description: "A private circle for founders and business owners." },
    { name: "Tech Innovators", description: "Discussions on the latest in technology and business scaling." },
    { name: "Strategic Investors", description: "Exclusive group for investment opportunities and insights." }
];

async function seed() {
    try {
        console.log('🌱 Seeding database...');

        // 1. Ensure tables exist
        console.log('Creating secret_groups tables...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS secret_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        admin_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        await pool.query(`
      CREATE TABLE IF NOT EXISTS secret_group_memberships (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        group_id UUID NOT NULL REFERENCES secret_groups(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, group_id)
      );
    `);

        // 2. Insert Chapters
        console.log('Seeding chapters...');
        for (const city of AVAILABLE_CHAPTERS) {
            await pool.query(
                'INSERT INTO chapters (name, location_city) VALUES ($1, $2) ON CONFLICT (name, location_city) DO NOTHING',
                [`${city} Chapter`, city]
            );
        }
        console.log(`✅ ${AVAILABLE_CHAPTERS.length} chapters seeded/verified.`);

        // 3. Insert Secret Groups
        console.log('Seeding secret groups...');
        for (const group of DEFAULT_SECRET_GROUPS) {
            await pool.query(
                'INSERT INTO secret_groups (name, description, admin_name) VALUES ($1, $2, $3)',
                [group.name, group.description, 'Business Orbit Admin']
            );
        }
        console.log(`✅ ${DEFAULT_SECRET_GROUPS.length} secret groups seeded.`);

        console.log('🎉 Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
