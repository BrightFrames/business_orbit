'use client';

/**
 * Centralized fetch wrapper with request deduplication
 * Prevents duplicate concurrent requests to the same endpoint
 */

// Track in-flight requests
const inFlightRequests = new Map<string, Promise<Response>>();

/**
 * Generate a unique key for a request based on URL, method, and body
 */
function generateRequestKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? String(options.body) : '';
    return `${method}:${url}:${body}`;
}

/**
 * Deduplicated fetch - prevents duplicate concurrent requests
 * 
 * If the same request is already in-flight, returns the existing promise
 * instead of making a new network request.
 * 
 * @param url - Request URL
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export async function deduplicatedFetch(
    url: string,
    options?: RequestInit
): Promise<Response> {
    const key = generateRequestKey(url, options);

    // Check if this exact request is already in-flight
    const existing = inFlightRequests.get(key);
    if (existing) {
        console.log(`[deduplicatedFetch] Reusing in-flight request: ${key.substring(0, 50)}...`);
        return existing.then(res => res.clone());
    }

    // Create new request
    const requestPromise = fetch(url, {
        credentials: 'include',
        ...options,
    });

    // Track it
    inFlightRequests.set(key, requestPromise);

    try {
        const response = await requestPromise;
        return response;
    } finally {
        // Remove from tracking after completion
        inFlightRequests.delete(key);
    }
}

/**
 * POST with JSON body - convenience wrapper
 */
export async function postJSON<T = any>(
    url: string,
    data: any,
    options?: Omit<RequestInit, 'method' | 'body'>
): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
    try {
        const response = await deduplicatedFetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            body: JSON.stringify(data),
            ...options,
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                ok: false,
                error: result.error || 'Request failed',
                status: response.status,
            };
        }

        return {
            ok: true,
            data: result,
            status: response.status,
        };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Network error',
            status: 0,
        };
    }
}

/**
 * GET with deduplication - convenience wrapper
 */
export async function getJSON<T = any>(
    url: string,
    options?: Omit<RequestInit, 'method'>
): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
    try {
        const response = await deduplicatedFetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            ...options,
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                ok: false,
                error: result.error || 'Request failed',
                status: response.status,
            };
        }

        return {
            ok: true,
            data: result,
            status: response.status,
        };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Network error',
            status: 0,
        };
    }
}
