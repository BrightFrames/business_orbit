import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { NextRequest, NextResponse } from 'next/server';

// Helper function to generate JWT token
export const generateToken = (userId: number): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Helper function to set JWT cookie
export const setTokenCookie = (res: NextResponse, token: string): void => {
  res.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

// Authentication middleware for Next.js API routes
export const authenticateToken = async (req: NextRequest) => {
  const token = req.cookies.get('token')?.value;

  if (!token) {
    throw new Error('Access token required');
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
    
    // Get user from database
    const result = await pool.query(
      'SELECT id, name, email, phone, profile_photo_url, profile_photo_id, banner_url, banner_id, skills, description, profession, interest, created_at, is_admin FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Helper function to get user from token (for use in API routes)
export const getUserFromToken = async (req: NextRequest) => {
  try {
    return await authenticateToken(req);
  } catch (error) {
    return null;
  }
};

// Lightweight token verifier for server actions and API routes that only need the user id
export const verifyToken = (token: string): number | null => {
  try {
    if (!process.env.JWT_SECRET) {
      return null;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
    return decoded.userId;
  } catch (_err) {
    return null;
  }
};
