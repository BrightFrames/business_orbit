
import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
})

async function runMigration() {
    const client = await pool.connect()
    try {
        console.log('Running migration: add-consultations.sql')

        const sqlPath = path.join(process.cwd(), 'lib/database/migrations/add-consultations.sql')
        const sql = fs.readFileSync(sqlPath, 'utf8')

        await client.query('BEGIN')
        await client.query(sql)
        await client.query('COMMIT')

        console.log('Migration completed successfully')
    } catch (error) {
        await client.query('ROLLBACK')
        console.error('Migration failed:', error)
        process.exit(1)
    } finally {
        client.release()
        await pool.end()
    }
}

runMigration()
