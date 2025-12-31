import dotenv from 'dotenv';
import pool from '../config/database';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

export async function setupAdminUser() {
  try {
    console.log('🔧 Setting up admin user...');

    const adminEmail = process.env.ADMIN_EMAIL || 'adminbusinessorbit@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'boadmin@123';

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Ensure columns exist
    try {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS profession VARCHAR(255)');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS interest VARCHAR(255)');
    } catch (e) {
      // Ignore if columns already exist or if error occurs
    }

    // Check if admin user already exists
    const existingUser = await pool.query(
      'SELECT id, name, email, is_admin FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      // Always update password and ensure is_admin is true for the admin email
      await pool.query(
        'UPDATE users SET is_admin = true, password_hash = $1 WHERE id = $2',
        [passwordHash, user.id]
      );
      console.log('✅ Admin user updated (password reset and is_admin ensured)');
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      return { ...user, is_admin: true };
    } else {
      // Create new admin user
      const newUser = await pool.query(
        'INSERT INTO users (name, email, is_admin, password_hash, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, email, is_admin',
        ['Admin User', adminEmail, true, passwordHash]
      );
      console.log('✅ New admin user created');
      console.log(`   Email: ${newUser.rows[0].email}`);
      console.log(`   Name: ${newUser.rows[0].name}`);
      console.log(`   ID: ${newUser.rows[0].id}`);
      return newUser.rows[0];
    }

  } catch (error: any) {
    console.error('❌ Admin setup failed:', error.message);
    throw error;
  }
}

export async function checkAdminUser() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'adminbusinessorbit@gmail.com';

    const result = await pool.query(
      'SELECT id, name, email, is_admin FROM users WHERE email = $1 AND is_admin = true',
      [adminEmail]
    );

    if (result.rows.length > 0) {
      console.log('✅ Admin user found');
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Name: ${result.rows[0].name}`);
      console.log(`   ID: ${result.rows[0].id}`);
      return result.rows[0];
    } else {
      console.log('❌ No admin user found');
      return null;
    }

  } catch (error: any) {
    console.error('❌ Error checking admin user:', error.message);
    return null;
  }
}

// CLI script
if (require.main === module) {
  async function main() {
    try {
      console.log('🔍 Checking database connection...');
      const result = await pool.query('SELECT NOW()');
      console.log('✅ Database connection successful');
      console.log('🕐 Current time:', result.rows[0].now);

      console.log('🔍 Running admin setup/update...');
      await setupAdminUser();

      console.log('🎉 Admin setup completed!');
      console.log('📧 Admin credentials:');
      console.log(`   Email: ${process.env.ADMIN_EMAIL || 'adminbusinessorbit@gmail.com'}`);
      console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'boadmin@123'}`);
      process.exit(0);
    } catch (error) {
      console.error('💥 Admin setup failed:', error);
      process.exit(1);
    }
  }

  main();
}
