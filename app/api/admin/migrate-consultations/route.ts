import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/config/database'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
    try {
        // Basic security check (in production this should be stricter)
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
        }

        const migrationPath = path.join(process.cwd(), 'lib/database/migrations/consultation-schema.sql')
        const sql = fs.readFileSync(migrationPath, 'utf8')

        const client = await pool.connect()
        try {
            await client.query('BEGIN')
            await client.query(sql)
            await client.query('COMMIT')

            return NextResponse.json({
                success: true,
                message: 'Consultation schema migration executed successfully'
            })
        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        } finally {
            client.release()
        }
    } catch (error: any) {
        console.error('Migration failed:', error)
        return NextResponse.json({
            success: false,
            error: 'Migration failed',
            details: error.message
        }, { status: 500 })
    }
}
