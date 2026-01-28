"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});
async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Running migration: add-payments.sql');
        const sqlPath = path_1.default.join(process.cwd(), 'lib/database/migrations/add-payments.sql');
        const sql = fs_1.default.readFileSync(sqlPath, 'utf8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('Migration completed successfully');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
    }
    finally {
        client.release();
        await pool.end();
    }
}
runMigration();
