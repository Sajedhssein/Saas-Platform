/**
 * Generate a random color
 */
export const getRandomColor = (): string => {
    const colors = [
        '#3b82f6', // blue
        '#ef4444', // red
        '#10b981', // green
        '#f59e0b', // amber
        '#8b5cf6', // purple
        '#ec4899', // pink
        '#06b6d4', // cyan
        '#14b8a6', // teal
    ];
    return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Get color for status
 */
export const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
        active: 'bg-green-100 text-green-800',
        inactive: 'bg-slate-100 text-slate-800',
        pending: 'bg-yellow-100 text-yellow-800',
        completed: 'bg-green-100 text-green-800',
        inProgress: 'bg-blue-100 text-blue-800',
        failed: 'bg-red-100 text-red-800',
    };
    return statusColors[status] || 'bg-slate-100 text-slate-800';
};

/**
 * Check if email is valid
 */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Generate a unique ID
 */
export const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
