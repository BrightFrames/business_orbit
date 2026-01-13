const { Client } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env vars
if (fs.existsSync('.env')) {
    dotenv.config({ path: '.env' });
    console.log('Loaded .env file');
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL is not set in environment');
    process.exit(1);
}

// Mask URL for logging
const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
console.log(`Attempting connection to: ${maskedUrl}`);

// Parse URL to debug host/port
try {
    const match = databaseUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (match) {
        console.log(`Host: ${match[3]}`);
        console.log(`Port: ${match[4]}`);
        console.log(`Database: ${match[5]}`);
        console.log(`User: ${match[1]}`);
    }
} catch (e) {
    console.log('Could not parse URL structure');
}

const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
const ssl = isLocal ? false : { rejectUnauthorized: false };
console.log(`SSL Configuration: ${JSON.stringify(ssl)}`);

const client = new Client({
    connectionString: databaseUrl,
    ssl: ssl,
    connectionTimeoutMillis: 10000,
});

async function test() {
    try {
        console.log('Connecting...');
        await client.connect();
        console.log('Connected successfully!');

        const res = await client.query('SELECT NOW() as now');
        console.log('Query result:', res.rows[0]);

        await client.end();
        process.exit(0);
    } catch (err) {
        console.error('CONNECTION FAILED:');
        console.error(err);
        if (client) {
            try { await client.end(); } catch (e) { }
        }
        process.exit(1);
    }
}

test();
