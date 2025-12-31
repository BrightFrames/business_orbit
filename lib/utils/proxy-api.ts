/**
 * Proxy utility to forward API requests to the backend server
 * Used in production when API routes should be handled by EC2 backend
 */
import { NextRequest, NextResponse } from 'next/server';

export async function proxyToBackend(
  request: NextRequest | Request,
  path: string
): Promise<NextResponse> {
  const backendUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || 'https://api.businessorbit.org';
  const targetUrl = `${backendUrl}${path}`;

  // Get the original request method, headers, and body
  const method = request.method;
  const headers = new Headers(request.headers);
  
  // Forward important headers but update host
  headers.set('host', new URL(targetUrl).host);
  headers.set('x-forwarded-host', request.headers.get('host') || '');
  headers.set('x-forwarded-proto', 'https');
  
  // Properly forward cookies from NextRequest
  let cookieHeader = request.headers.get('cookie') || '';
  
  // If NextRequest, also get cookies from cookies API and merge
  if (request instanceof NextRequest) {
    const cookies: string[] = [];
    request.cookies.getAll().forEach(cookie => {
      cookies.push(`${cookie.name}=${cookie.value}`);
    });
    
    // Merge with existing cookie header if any
    if (cookies.length > 0) {
      const mergedCookies = cookieHeader 
        ? [...cookies, cookieHeader].join('; ')
        : cookies.join('; ');
      cookieHeader = mergedCookies;
    }
  }
  
  // Set cookie header for backend
  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  }

  // Clone the request to read body if needed
  let body: BodyInit | null = null;
  
  try {
    if (method !== 'GET' && method !== 'HEAD') {
      const contentType = request.headers.get('content-type') || '';
      
      // For form data, read as form data and forward
      if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        body = formData;
        // Don't set content-type, let fetch set it automatically for FormData
        headers.delete('content-type');
      } else {
        // For JSON or other types, read the body as text
        body = await request.text();
        // Keep original content-type for JSON
        if (!contentType) {
          headers.set('content-type', 'application/json');
        }
      }
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to read request body',
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(targetUrl, {
      method,
      headers: headers as HeadersInit,
      body,
      // Note: credentials: 'include' is for client-side fetch, not server-side
      // Cookies are forwarded via the cookie header above
    });

    // Get response body
    const responseBody = await response.arrayBuffer();
    let responseData: any = {};
    
    // Try to parse JSON body if it exists
    if (responseBody.byteLength > 0) {
      try {
        responseData = JSON.parse(Buffer.from(responseBody).toString());
      } catch (e) {
        // If not JSON, return as text
        responseData = Buffer.from(responseBody).toString();
      }
    }
    
    // Create NextResponse with body
    const nextResponse = responseBody.byteLength > 0 && typeof responseData === 'object' 
      ? NextResponse.json(responseData, { status: response.status, statusText: response.statusText })
      : new NextResponse(responseData, { status: response.status, statusText: response.statusText });
    
    // Get Set-Cookie headers from backend and forward them
    const setCookies = response.headers.getSetCookie();
    setCookies.forEach(cookie => {
      // Parse the cookie string
      const parts = cookie.split(';');
      const [nameValue] = parts;
      const [name, ...valueParts] = nameValue.split('=');
      const value = valueParts.join('=');
      
      // Build cookie options - start with defaults
      const options: any = {
        httpOnly: false, // Will be set from backend if present
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
      };
      
      // Parse cookie attributes from backend
      parts.slice(1).forEach(part => {
        const trimmed = part.trim().toLowerCase();
        if (trimmed === 'httponly') {
          options.httpOnly = true;
        } else if (trimmed === 'secure') {
          options.secure = true;
        } else if (trimmed.startsWith('max-age=')) {
          const maxAge = parseInt(trimmed.split('=')[1]);
          if (!isNaN(maxAge)) {
            options.maxAge = maxAge;
          }
        } else if (trimmed.startsWith('path=')) {
          options.path = trimmed.split('=')[1];
        } else if (trimmed.startsWith('domain=')) {
          // Don't set domain - let it default to current domain (Vercel)
          // This ensures cookie works on www.businessorbit.org
        } else if (trimmed.startsWith('samesite=')) {
          const samesite = trimmed.split('=')[1].toLowerCase();
          if (['strict', 'lax', 'none'].includes(samesite)) {
            options.sameSite = samesite as 'strict' | 'lax' | 'none';
          }
        }
      });
      
      // Set cookie using NextResponse cookies API
      nextResponse.cookies.set(name.trim(), value, options);
    });
    
    // Copy other headers (except content-type and content-length which are set automatically)
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== 'set-cookie' && lowerKey !== 'content-type' && lowerKey !== 'content-length') {
        nextResponse.headers.set(key, value);
      }
    });
    
    // Set CORS headers
    nextResponse.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*');
    nextResponse.headers.set('Access-Control-Allow-Credentials', 'true');

    return nextResponse;
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to connect to backend server',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

