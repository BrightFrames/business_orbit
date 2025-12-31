/**
 * API Handler wrapper that automatically proxies to backend on Vercel
 * Use this to wrap your API route handlers
 */
import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from './proxy-api';

export function createApiHandler(
  handler: (request: NextRequest) => Promise<NextResponse>,
  apiPath: string
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // In production on Vercel, proxy to backend (Vercel doesn't have database access)
    // Also proxy if we're not in a local development environment with database
    if (process.env.VERCEL || !process.env.DATABASE_URL) {
      return proxyToBackend(request, apiPath);
    }
    
    // Otherwise, execute the local handler
    return handler(request);
  };
}

