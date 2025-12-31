import dotenv from 'dotenv';
import pool from '../config/database';

// Load environment variables
dotenv.config({ path: '.env.local' });

export async function setupAdminUser() {
  try {
    console.log('🔧 Setting up admin user...');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'adminbusinessorbit@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin@123';
    
    // Check if admin user already exists
    const existingUser = await pool.query(
      'SELECT id, name, email, is_admin FROM users WHERE email = $1',
      [adminEmail]
    );
    
    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      if (user.is_admin) {
        console.log('✅ Admin user already exists and is admin');
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   ID: ${user.id}`);
        return user;
      } else {
        // Make existing user admin
        await pool.query(
          'UPDATE users SET is_admin = true WHERE id = $1',
          [user.id]
        );
        console.log('✅ Existing user promoted to admin');
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   ID: ${user.id}`);
        return { ...user, is_admin: true };
      }
    } else {
      // Create new admin user
      const newUser = await pool.query(
        'INSERT INTO users (name, email, is_admin, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, name, email, is_admin',
        ['Admin User', adminEmail, true]
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
      
      console.log('🔍 Checking admin user...');
      const adminUser = await checkAdminUser();
      
      if (!adminUser) {
        console.log('🔧 Setting up admin user...');
        await setupAdminUser();
      }
      
      console.log('🎉 Admin setup completed!');
      console.log('📧 Admin credentials:');
      console.log(`   Email: ${process.env.ADMIN_EMAIL || 'adminbusinessorbit@gmail.com'}`);
      console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin@123'}`);
      process.exit(0);
    } catch (error) {
      console.error('💥 Admin setup failed:', error);
      process.exit(1);
    }
  }
  
  main();
}
