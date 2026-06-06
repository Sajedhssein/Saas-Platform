import { useState, useCallback } from 'react';

/**
 * Custom hook for managing async operations
 */
export const useAsync = <T, E = string,>(
    asyncFunction: () => Promise<T>
) => {
    const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>(
        'idle'
    );
    const [value, setValue] = useState<T | null>(null);
    const [error, setError] = useState<E | null>(null);

    const execute = useCallback(
        async () => {
            setStatus('pending');
            setValue(null);
            setError(null);
            try {
                const response = await asyncFunction();
                setValue(response);
                setStatus('success');
                return response;
            } catch (err) {
                setError(err as E);
                setStatus('error');
                throw err;
            }
        },
        [asyncFunction]
    );

    const reset = useCallback(() => {
        setStatus('idle');
        setValue(null);
        setError(null);
    }, []);

    return { execute, reset, status, value, error };
};
