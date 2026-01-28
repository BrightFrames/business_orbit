"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDatabase = setupDatabase;
exports.checkDatabaseConnection = checkDatabaseConnection;
exports.checkTablesExist = checkTablesExist;
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = __importDefault(require("../config/database"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config({ path: '.env.local' });
dotenv_1.default.config({ path: '.env' });
async function setupDatabase() {
    try {
        console.log('🚀 Setting up database...');
        // Read the schema file
        const schemaPath = path_1.default.join(__dirname, 'schema.sql');
        const schema = fs_1.default.readFileSync(schemaPath, 'utf8');
        // Execute the schema
        await database_1.default.query(schema);
        console.log('✅ Database setup completed successfully!');
        console.log('📋 Tables created:');
        console.log('   - users');
        console.log('   - invites');
        console.log('   - user_preferences');
        console.log('   - chapters');
        console.log('   - chapter_memberships');
        console.log('   - chapter_messages');
        console.log('   - events');
        console.log('   - rsvps');
        console.log('   - user_follows');
        console.log('   - follow_requests');
        console.log('   - posts');
        console.log('   - post_media');
        console.log('   - post_engagements');
        console.log('   - post_comments');
        console.log('   - conversations');
        console.log('   - direct_messages');
        console.log('   - All indexes and triggers');
    }
    catch (error) {
        console.error('❌ Database setup failed:', error.message);
        throw error;
    }
}
async function checkDatabaseConnection() {
    try {
        const result = await database_1.default.query('SELECT NOW()');
        console.log('✅ Database connection successful');
        console.log('🕐 Current time:', result.rows[0].now);
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}
async function checkTablesExist() {
    try {
        const tables = ['users', 'invites', 'user_preferences', 'chapters', 'chapter_memberships', 'chapter_messages', 'events', 'rsvps', 'user_follows', 'follow_requests', 'posts', 'post_media', 'post_engagements', 'post_comments', 'conversations', 'direct_messages'];
        const results = [];
        for (const table of tables) {
            const result = await database_1.default.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
            results.push({
                table,
                exists: result.rows[0].exists
            });
        }
        console.log('📋 Table status:');
        results.forEach(({ table, exists }) => {
            console.log(`   ${exists ? '✅' : '❌'} ${table}`);
        });
        return results.every(r => r.exists);
    }
    catch (error) {
        console.error('❌ Error checking tables:', error.message);
        return false;
    }
}
// CLI script
if (require.main === module) {
    async function main() {
        try {
            console.log('🔍 Checking database connection...');
            const connected = await checkDatabaseConnection();
            if (!connected) {
                console.log('❌ Cannot connect to database. Please check your DATABASE_URL in .env.local');
                process.exit(1);
            }
            console.log('🔍 Checking if tables exist...');
            const tablesExist = await checkTablesExist();
            if (!tablesExist) {
                console.log('🔧 Setting up database tables...');
                await setupDatabase();
            }
            else {
                console.log('✅ All tables already exist');
            }
            console.log('🎉 Database is ready!');
            process.exit(0);
        }
        catch (error) {
            console.error('💥 Setup failed:', error);
            process.exit(1);
        }
    }
    main();
}
