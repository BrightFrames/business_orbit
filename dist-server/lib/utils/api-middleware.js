"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseErrorHandler = exports.SuccessResponse = exports.ErrorResponse = exports.InputValidator = exports.RateLimiter = exports.ApiLogger = void 0;
const server_1 = require("next/server");
// API logging and monitoring middleware
class ApiLogger {
    static logRequest(method, url, status, duration, userAgent) {
        const timestamp = new Date().toISOString();
        const logLevel = status >= 400 ? 'ERROR' : status >= 300 ? 'WARN' : 'INFO';
        console.log(`[${timestamp}] ${logLevel} ${method} ${url} ${status} ${duration}ms ${userAgent || ''}`);
        // In production, you might want to send this to a logging service
        if (process.env.NODE_ENV === 'production') {
            // Example: Send to external logging service
            // await sendToLoggingService({ timestamp, method, url, status, duration, userAgent })
        }
    }
    static async withLogging(handler, method, url, userAgent) {
        const startTime = Date.now();
        try {
            const result = await handler();
            const duration = Date.now() - startTime;
            // Extract status from result if it's a NextResponse
            const status = result instanceof server_1.NextResponse ? result.status : 200;
            this.logRequest(method, url, status, duration, userAgent);
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.logRequest(method, url, 500, duration, userAgent);
            throw error;
        }
    }
}
exports.ApiLogger = ApiLogger;
// Rate limiting middleware
class RateLimiter {
    static checkLimit(identifier, limit = 10, windowMs = 60000) {
        const now = Date.now();
        const current = this.cache.get(identifier);
        if (!current || now > current.resetTime) {
            this.cache.set(identifier, { count: 1, resetTime: now + windowMs });
            return true;
        }
        if (current.count >= limit) {
            return false;
        }
        current.count++;
        return true;
    }
    static getRemainingTime(identifier) {
        const current = this.cache.get(identifier);
        if (!current)
            return 0;
        const now = Date.now();
        return Math.max(0, current.resetTime - now);
    }
}
exports.RateLimiter = RateLimiter;
RateLimiter.cache = new Map();
// Input validation utilities
class InputValidator {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    static validateUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
    static validateString(input, minLength = 1, maxLength = 255) {
        return typeof input === 'string' &&
            input.trim().length >= minLength &&
            input.trim().length <= maxLength;
    }
    static sanitizeString(input) {
        return input.trim().replace(/[<>]/g, ''); // Basic XSS prevention
    }
    static validateArray(input, minLength = 1, maxLength = 100) {
        return Array.isArray(input) &&
            input.length >= minLength &&
            input.length <= maxLength;
    }
}
exports.InputValidator = InputValidator;
// Error response utilities
class ErrorResponse {
    static validationError(details) {
        return server_1.NextResponse.json({
            success: false,
            error: 'Validation failed',
            message: 'Invalid input data',
            details
        }, { status: 400 });
    }
    static unauthorizedError(message = 'Authentication required') {
        return server_1.NextResponse.json({
            success: false,
            error: 'Unauthorized',
            message
        }, { status: 401 });
    }
    static forbiddenError(message = 'Access denied') {
        return server_1.NextResponse.json({
            success: false,
            error: 'Forbidden',
            message
        }, { status: 403 });
    }
    static notFoundError(message = 'Resource not found') {
        return server_1.NextResponse.json({
            success: false,
            error: 'Not found',
            message
        }, { status: 404 });
    }
    static conflictError(message = 'Resource already exists') {
        return server_1.NextResponse.json({
            success: false,
            error: 'Conflict',
            message
        }, { status: 409 });
    }
    static rateLimitError(message = 'Rate limit exceeded') {
        return server_1.NextResponse.json({
            success: false,
            error: 'Rate limit exceeded',
            message
        }, { status: 429 });
    }
    static serverError(message = 'Internal server error') {
        return server_1.NextResponse.json({
            success: false,
            error: 'Internal server error',
            message
        }, { status: 500 });
    }
}
exports.ErrorResponse = ErrorResponse;
// Success response utilities
class SuccessResponse {
    static ok(data, message) {
        return server_1.NextResponse.json({
            success: true,
            data,
            message,
            timestamp: new Date().toISOString()
        });
    }
    static created(data, message) {
        return server_1.NextResponse.json({
            success: true,
            data,
            message,
            timestamp: new Date().toISOString()
        }, { status: 201 });
    }
    static withCache(data, maxAge = 300) {
        const response = server_1.NextResponse.json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });
        response.headers.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`);
        response.headers.set('ETag', `"${JSON.stringify(data).length}-${Date.now()}"`);
        return response;
    }
}
exports.SuccessResponse = SuccessResponse;
// Database error handler
class DatabaseErrorHandler {
    static handle(error) {
        console.error('Database error:', error);
        switch (error.code) {
            case '23505': // Unique constraint violation
                return ErrorResponse.conflictError('Resource already exists');
            case '23503': // Foreign key constraint violation
                return ErrorResponse.validationError(['Referenced resource does not exist']);
            case '23502': // Not null constraint violation
                return ErrorResponse.validationError(['Required field is missing']);
            case '42P01': // Undefined table
                return ErrorResponse.serverError('Database configuration error');
            case 'ECONNREFUSED':
                return ErrorResponse.serverError('Database connection failed');
            default:
                return ErrorResponse.serverError('Database operation failed');
        }
    }
}
exports.DatabaseErrorHandler = DatabaseErrorHandler;
