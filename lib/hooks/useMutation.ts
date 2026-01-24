'use client';

import { useState, useCallback, useRef } from 'react';

interface UseMutationOptions<TData, TVariables> {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    /** Prevent rapid-fire calls within this window (ms). Default: 1000 */
    debounceMs?: number;
}

interface MutationResult<TData, TVariables> {
    mutate: (variables: TVariables) => Promise<TData | null>;
    isLoading: boolean;
    error: Error | null;
    data: TData | null;
    reset: () => void;
}

/**
 * Custom hook for handling mutations with built-in:
 * - Loading state management
 * - Duplicate request prevention
 * - Debouncing
 * - Error handling
 * 
 * Usage:
 * ```tsx
 * const { mutate, isLoading } = useMutation(
 *   async (userId: number) => {
 *     const res = await fetch('/api/follow', { method: 'POST', body: JSON.stringify({ userId }) });
 *     return res.json();
 *   },
 *   { onSuccess: () => toast.success('Followed!') }
 * );
 * 
 * <Button onClick={() => mutate(123)} disabled={isLoading}>
 *   {isLoading ? 'Loading...' : 'Follow'}
 * </Button>
 * ```
 */
export function useMutation<TData = unknown, TVariables = void>(
    mutationFn: (variables: TVariables) => Promise<TData>,
    options: UseMutationOptions<TData, TVariables> = {}
): MutationResult<TData, TVariables> {
    const { onSuccess, onError, debounceMs = 1000 } = options;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<TData | null>(null);

    // Track last call time to prevent rapid-fire
    const lastCallTime = useRef<number>(0);
    // Track if a request is in-flight
    const inFlight = useRef<boolean>(false);

    const mutate = useCallback(async (variables: TVariables): Promise<TData | null> => {
        const now = Date.now();

        // Prevent rapid-fire clicks
        if (now - lastCallTime.current < debounceMs) {
            console.log('[useMutation] Debounced - too soon since last call');
            return null;
        }

        // Prevent concurrent requests
        if (inFlight.current) {
            console.log('[useMutation] Blocked - request already in-flight');
            return null;
        }

        lastCallTime.current = now;
        inFlight.current = true;
        setIsLoading(true);
        setError(null);

        try {
            const result = await mutationFn(variables);
            setData(result);
            onSuccess?.(result);
            return result;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            onError?.(error);
            return null;
        } finally {
            setIsLoading(false);
            inFlight.current = false;
        }
    }, [mutationFn, onSuccess, onError, debounceMs]);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setIsLoading(false);
        inFlight.current = false;
    }, []);

    return { mutate, isLoading, error, data, reset };
}

/**
 * Simple debounced action hook - prevents rapid-fire button clicks
 * 
 * Usage:
 * ```tsx
 * const handleClick = useDebounced(async () => {
 *   await fetch('/api/action', { method: 'POST' });
 * }, 500);
 * 
 * <Button onClick={handleClick}>Click Me</Button>
 * ```
 */
export function useDebounced<T extends (...args: any[]) => any>(
    callback: T,
    delayMs: number = 500
): (...args: Parameters<T>) => void {
    const lastCall = useRef<number>(0);
    const inFlight = useRef<boolean>(false);

    return useCallback((...args: Parameters<T>) => {
        const now = Date.now();

        if (now - lastCall.current < delayMs || inFlight.current) {
            console.log('[useDebounced] Call blocked');
            return;
        }

        lastCall.current = now;

        const result = callback(...args);

        // If async, track in-flight state
        if (result instanceof Promise) {
            inFlight.current = true;
            result.finally(() => {
                inFlight.current = false;
            });
        }
    }, [callback, delayMs]);
}
