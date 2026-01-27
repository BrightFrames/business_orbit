import { describe, it, expect, vi, beforeEach } from 'vitest';
import pool from '@/lib/config/database';
import bcrypt from 'bcryptjs';
import { createOTP, verifyOTP } from '../otp-service';

// Mock dependencies
vi.mock('@/lib/config/database', () => ({
  default: {
    connect: vi.fn(),
    query: vi.fn(), // for direct pool.query calls if any
  }
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  }
}));

describe('OTP Service', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    vi.clearAllMocks();
    (pool.connect as any).mockResolvedValue(mockClient);

    // Default implementations
    (bcrypt.hash as any).mockResolvedValue('hashed_otp');
    (bcrypt.compare as any).mockResolvedValue(true);

    mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('createOTP', () => {
    it('should create an OTP successfully', async () => {
      // Sequence of queries:
      // 1. checkRateLimit: check blocked
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // 2. checkRateLimit: check count
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // 3. checkRateLimit: insert new limit
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      // 4. createOTP transaction: BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // 5. Invalidate old
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // 6. Insert new
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // 7. Increment limit (email)
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // 8. COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await createOTP('test@example.com', 'verify_email');

      expect(result.success).toBe(true);
      expect(result.otp).toHaveLength(6);
      expect(pool.connect).toHaveBeenCalled();
      // We expect pool.connect to be called twice (once for rate limit, once for creation)
      expect(pool.connect).toHaveBeenCalledTimes(2);
    });

    it('should block if rate limit exceeded', async () => {
      // 1. checkRateLimit: check blocked - return blocked row
      mockClient.query.mockResolvedValueOnce({
        rows: [{ blocked_until: new Date(Date.now() + 10000) }]
      });

      const result = await createOTP('test@example.com', 'verify_email');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many requests');
      // Should not proceed to transaction
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors gracefully', async () => {
       // Rate limit pass
       mockClient.query.mockResolvedValueOnce({ rows: [] });
       mockClient.query.mockResolvedValueOnce({ rows: [] });
       mockClient.query.mockResolvedValueOnce({ rows: [] });

       // Transaction begin fails
       mockClient.query.mockRejectedValueOnce(new Error('DB Error'));

       const result = await createOTP('test@example.com', 'verify_email');

       expect(result.success).toBe(false);
       expect(result.error).toBe('Failed to generate OTP');
       expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('verifyOTP', () => {
    it('should verify a valid OTP', async () => {
      // Find valid token
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: 123,
          otp_hash: 'hashed_otp',
          attempts: 0,
          max_attempts: 3
        }]
      });

      // bcrypt compare returns true (default mock)

      // Mark consumed
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await verifyOTP('test@example.com', '123456', 'verify_email');

      expect(result.success).toBe(true);
      expect(result.userId).toBe(123);
    });

    it('should reject invalid OTP format', async () => {
        const result = await verifyOTP('test@example.com', '12', 'verify_email');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid OTP format');
    });

    it('should reject expired or non-existent OTP', async () => {
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        const result = await verifyOTP('test@example.com', '123456', 'verify_email');

        expect(result.success).toBe(false);
        expect(result.error).toContain('OTP expired or invalid');
    });

    it('should reject incorrect OTP and increment attempts', async () => {
        // Find token
        mockClient.query.mockResolvedValueOnce({
            rows: [{
              id: 1,
              user_id: 123,
              otp_hash: 'hashed_otp',
              attempts: 0,
              max_attempts: 3
            }]
          });

        (bcrypt.compare as any).mockResolvedValue(false);

        // Update attempts
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        const result = await verifyOTP('test@example.com', '000000', 'verify_email');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Incorrect OTP');
        expect(result.remainingAttempts).toBe(2);
    });

    it('should invalidate OTP after max attempts', async () => {
        // Find token with 2 attempts (max 3)
        mockClient.query.mockResolvedValueOnce({
            rows: [{
              id: 1,
              user_id: 123,
              otp_hash: 'hashed_otp',
              attempts: 2,
              max_attempts: 3
            }]
          });

        (bcrypt.compare as any).mockResolvedValue(false);

        // Update attempts -> 3
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        // Invalidate (consumed_at)
        mockClient.query.mockResolvedValueOnce({ rows: [] });

        const result = await verifyOTP('test@example.com', '000000', 'verify_email');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Too many incorrect attempts');
        expect(result.remainingAttempts).toBe(0);
    });
  });
});
