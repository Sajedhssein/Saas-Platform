export function makeError(message: string, cause?: unknown): Error {
    const err = new Error(message);
    if (cause !== undefined) {
        try {
            // assign cause in a type-safe way
            (err as unknown as { cause?: unknown }).cause = cause;
        } catch {
            // ignore if assignment not possible
        }
    }
    return err;
}
