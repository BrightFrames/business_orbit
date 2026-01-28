"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMutation = useMutation;
exports.useDebounced = useDebounced;
const react_1 = require("react");
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
function useMutation(mutationFn, options = {}) {
    const { onSuccess, onError, debounceMs = 1000 } = options;
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [data, setData] = (0, react_1.useState)(null);
    // Track last call time to prevent rapid-fire
    const lastCallTime = (0, react_1.useRef)(0);
    // Track if a request is in-flight
    const inFlight = (0, react_1.useRef)(false);
    const mutate = (0, react_1.useCallback)(async (variables) => {
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
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            onError?.(error);
            return null;
        }
        finally {
            setIsLoading(false);
            inFlight.current = false;
        }
    }, [mutationFn, onSuccess, onError, debounceMs]);
    const reset = (0, react_1.useCallback)(() => {
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
function useDebounced(callback, delayMs = 500) {
    const lastCall = (0, react_1.useRef)(0);
    const inFlight = (0, react_1.useRef)(false);
    return (0, react_1.useCallback)((...args) => {
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
