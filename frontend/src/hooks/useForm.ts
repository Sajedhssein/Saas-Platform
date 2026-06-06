import { useState, useCallback } from 'react';

/**
 * Custom hook for managing form state
 */
export const useForm = <T extends Record<string, string | number | boolean>>(initialValues: T) => {
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
    const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            const { name, value } = e.target;
            setValues((prev) => ({
                ...prev,
                [name]: value,
            }));
        },
        []
    );

    const handleBlur = useCallback(
        (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const { name } = e.target;
            setTouched((prev) => ({
                ...prev,
                [name]: true,
            }));
        },
        []
    );

    const setFieldValue = useCallback((name: keyof T, value: T[keyof T]) => {
        setValues((prev) => ({
            ...prev,
            [name]: value,
        }));
    }, []);

    const setFieldError = useCallback((name: keyof T, error: string) => {
        setErrors((prev) => ({
            ...prev,
            [name]: error,
        }));
    }, []);

    const resetForm = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
        setIsSubmitting(false);
    }, [initialValues]);

    return {
        values,
        errors,
        touched,
        isSubmitting,
        handleChange,
        handleBlur,
        setFieldValue,
        setFieldError,
        setErrors,
        setValues,
        setTouched,
        setIsSubmitting,
        resetForm,
    };
};
