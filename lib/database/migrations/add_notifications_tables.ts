import pool from '@/lib/config/database';

async function migrate() {
    try {
        console.log('🚀 Starting migration...');

        // 1. Create notifications table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL, -- 'connection_request', 'post_like', 'post_comment', 'group_invite', 'system', 'message'
        title VARCHAR(255) NOT NULL,
        message TEXT,
        link VARCHAR(255),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    `);
        console.log('✅ Created notifications table');

        // 2. Create consultation profiles table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS consultation_profiles (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          currency VARCHAR(10) DEFAULT 'USD',
          expertise VARCHAR(255)[],
          bio TEXT,
          is_available BOOLEAN DEFAULT TRUE,
          availability_days INTEGER[] DEFAULT '{1,2,3,4,5}',
          start_time TIME DEFAULT '09:00',
          end_time TIME DEFAULT '17:00',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_consultation_profiles_user_id ON consultation_profiles(user_id);
    `);
        console.log('✅ Created consultation_profiles table');

        // 3. Create consultations table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS consultations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          expert_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
          duration_minutes INTEGER DEFAULT 60,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected')),
          meeting_link VARCHAR(500),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_consultations_expert_id ON consultations(expert_id);
      CREATE INDEX IF NOT EXISTS idx_consultations_client_id ON consultations(client_id);
      CREATE INDEX IF NOT EXISTS idx_consultations_scheduled_at ON consultations(scheduled_at);
    `);
        console.log('✅ Created consultations table');

        // 4. Create conversations table (if not exists)
        await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user1_id, user2_id),
          CHECK (user1_id < user2_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON conversations(user1_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON conversations(user2_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
    `);
        console.log('✅ Created conversations table');

        // 5. Create direct_messages table (if not exists)
        await pool.query(`
      CREATE TABLE IF NOT EXISTS direct_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 4000),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          read_at TIMESTAMP WITH TIME ZONE
      );
      
      CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation_id ON direct_messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON direct_messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON direct_messages(created_at DESC);
    `);
        console.log('✅ Created direct_messages table');

        console.log('🎉 Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
