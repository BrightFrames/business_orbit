import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load local env variables only during local development (not on Vercel/build)
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}

// Only log database URL issues in development, not during build
if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'development') {
  // DATABASE_URL not set warning
}

const databaseUrl: string | undefined = process.env.DATABASE_URL;
const shouldUseSsl = Boolean(
  databaseUrl && (
    databaseUrl.includes('render.com') ||
    databaseUrl.includes('neon.tech') ||
    databaseUrl.includes('supabase') ||
    databaseUrl.includes('railway') ||
    /[?&]sslmode=require/.test(databaseUrl)
  )
);

// Ensure a single pool instance across HMR/route reloads in Next.js
declare global {
  // eslint-disable-next-line no-var
  var __PG_POOL__: any;
}

// Detect if we're in a Next.js build context - be VERY aggressive here
// During build, Next.js analyzes routes which can trigger imports
const isBuildTime = 
  process.env.NEXT_PHASE === 'phase-production-build' || 
  process.env.NEXT_PHASE === 'phase-development-build' ||
  process.env.NEXT_PHASE?.includes('build') ||
  process.env.npm_lifecycle_event === 'build' ||
  process.env.NEXT_BUILD === '1' ||
  // Check if we're running next build command (most reliable)
  (typeof process !== 'undefined' && process.argv && (
    process.argv.some(arg => arg.includes('next') && arg.includes('build')) ||
    process.argv.some(arg => arg === 'build') ||
    process.argv.some(arg => arg.includes('next') && (arg.includes('build') || arg.includes('export')))
  )) ||
  // CI environment during build (GitHub Actions sets this)
  (process.env.CI === 'true' && process.env.npm_lifecycle_event === 'build');

// NEVER create pool during build time - this causes timeouts
// Create pool only if DATABASE_URL is available AND we're not building
// During build, pool must be null to prevent any connection attempts
const pool = global.__PG_POOL__ ?? (
  !isBuildTime && databaseUrl ? new Pool({
    connectionString: databaseUrl,
    ssl: shouldUseSsl || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Keep dev pool small to avoid exhausting server connection slots during HMR
    max: process.env.NODE_ENV === 'production' ? 20 : 5,
    min: 0, // Always start with 0 connections - lazy connection
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000, // Increased from 5s to 15s
    maxUses: 7_500,
    // Keep TCP connection alive to reduce ECONNRESET in some environments
    keepAlive: true,
    keepAliveInitialDelayMillis: 30_000,
  }) : null
);

// Log build detection for debugging (only in non-production)
if (process.env.NODE_ENV !== 'production' && isBuildTime) {
  console.log('[Database] Build time detected - pool will be null');
}

if (!global.__PG_POOL__) {
  global.__PG_POOL__ = pool;
}

if (pool) {
  pool.on('error', (err: any) => {
    // Database connection error handling
  });
}



const testConnection = async (retries = process.env.NODE_ENV === 'production' ? 3 : 1) => {
  if (!pool) {
    return;
  }
  
  for (let i = 0; i < retries; i++) {
    try {
      const result = await pool.query('SELECT NOW() as current_time, version() as version');
      return;
    } catch (err: any) {
      if (i === retries - 1) {
        // Do not exit the process in dev; let API routes handle runtime errors gracefully
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
};

// NEVER test connection during build time - this is critical
// Only test connection in development runtime, not during builds or CI
const shouldTestConnection = 
  !isBuildTime &&
  process.env.NODE_ENV !== 'test' && 
  process.env.VERCEL !== '1' && 
  process.env.CI !== 'true' &&
  process.env.NODE_ENV === 'development';

if (shouldTestConnection) {
  testConnection();
}

process.on('SIGINT', async () => {
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

// Helper function to ensure pool is available
export const ensurePool = () => {
  // NEVER allow pool access during build
  if (isBuildTime) {
    throw new Error('Database pool cannot be accessed during build time. This is a build-time safety check.');
  }
  if (!pool) {
    throw new Error('Database pool not initialized. Please check DATABASE_URL environment variable.');
  }
  return pool;
};

export default pool;
