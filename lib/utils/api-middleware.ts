import { NextRequest, NextResponse } from 'next/server'

// API logging and monitoring middleware
export class ApiLogger {
  private static logRequest(method: string, url: string, status: number, duration: number, userAgent?: string) {
    const timestamp = new Date().toISOString()
    const logLevel = status >= 400 ? 'ERROR' : status >= 300 ? 'WARN' : 'INFO'
    
    console.log(`[${timestamp}] ${logLevel} ${method} ${url} ${status} ${duration}ms ${userAgent || ''}`)
    
    // In production, you might want to send this to a logging service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to external logging service
      // await sendToLoggingService({ timestamp, method, url, status, duration, userAgent })
    }
  }

  static async withLogging<T>(
    handler: () => Promise<T>,
    method: string,
    url: string,
    userAgent?: string
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await handler()
      const duration = Date.now() - startTime
      
      // Extract status from result if it's a NextResponse
      const status = result instanceof NextResponse ? result.status : 200
      this.logRequest(method, url, status, duration, userAgent)
      
      return result
    } catch (error: any) {
      const duration = Date.now() - startTime
      this.logRequest(method, url, 500, duration, userAgent)
      throw error
    }
  }
}

// Rate limiting middleware
export class RateLimiter {
  private static cache = new Map<string, { count: number; resetTime: number }>()

  static checkLimit(identifier: string, limit: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now()
    const current = this.cache.get(identifier)
    
    if (!current || now > current.resetTime) {
      this.cache.set(identifier, { count: 1, resetTime: now + windowMs })
      return true
    }
    
    if (current.count >= limit) {
      return false
    }
    
    current.count++
    return true
  }

  static getRemainingTime(identifier: string): number {
    const current = this.cache.get(identifier)
    if (!current) return 0
    
    const now = Date.now()
    return Math.max(0, current.resetTime - now)
  }
}

// Input validation utilities
export class InputValidator {
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  static validateUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  static validateString(input: any, minLength: number = 1, maxLength: number = 255): boolean {
    return typeof input === 'string' && 
           input.trim().length >= minLength && 
           input.trim().length <= maxLength
  }

  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '') // Basic XSS prevention
  }

  static validateArray(input: any, minLength: number = 1, maxLength: number = 100): boolean {
    return Array.isArray(input) && 
           input.length >= minLength && 
           input.length <= maxLength
  }
}

// Error response utilities
export class ErrorResponse {
  static validationError(details: string[]): NextResponse {
    return NextResponse.json({
      success: false,
      error: 'Validation failed',
      message: 'Invalid input data',
      details
    }, { status: 400 })
  }

  static unauthorizedError(message: string = 'Authentication required'): NextResponse {
    return NextResponse.json({
      success: false,
      error: 'Unauthorized',
      message
    }, { status: 401 })
  }

  static forbiddenError(message: string = 'Access denied'): NextResponse {
    return NextResponse.json({
      success: false,
      error: 'Forbidden',
      message
    }, { status: 403 })
  }

  static notFoundError(message: string = 'Resource not found'): NextResponse {
    return NextResponse.json({
      success: false,
      error: 'Not found',
      message
    }, { status: 404 })
  }

  static conflictError(message: string = 'Resource already exists'): NextResponse {
    return NextResponse.json({
      success: false,
      error: 'Conflict',
      message
    }, { status: 409 })
  }

  static rateLimitError(message: string = 'Rate limit exceeded'): NextResponse {
    return NextResponse.json({
      success: false,
      error: 'Rate limit exceeded',
      message
    }, { status: 429 })
  }

  static serverError(message: string = 'Internal server error'): NextResponse {
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message
    }, { status: 500 })
  }
}

// Success response utilities
export class SuccessResponse {
  static ok(data: any, message?: string): NextResponse {
    return NextResponse.json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    })
  }

  static created(data: any, message?: string): NextResponse {
    return NextResponse.json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    }, { status: 201 })
  }

  static withCache(data: any, maxAge: number = 300): NextResponse {
    const response = NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    })
    
    response.headers.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`)
    response.headers.set('ETag', `"${JSON.stringify(data).length}-${Date.now()}"`)
    
    return response
  }
}

// Database error handler
export class DatabaseErrorHandler {
  static handle(error: any): NextResponse {
    console.error('Database error:', error)
    
    switch (error.code) {
      case '23505': // Unique constraint violation
        return ErrorResponse.conflictError('Resource already exists')
      case '23503': // Foreign key constraint violation
        return ErrorResponse.validationError(['Referenced resource does not exist'])
      case '23502': // Not null constraint violation
        return ErrorResponse.validationError(['Required field is missing'])
      case '42P01': // Undefined table
        return ErrorResponse.serverError('Database configuration error')
      case 'ECONNREFUSED':
        return ErrorResponse.serverError('Database connection failed')
      default:
        return ErrorResponse.serverError('Database operation failed')
    }
  }
}




