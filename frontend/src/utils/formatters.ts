/**
 * Format a date to a readable string format
 */
export const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

/**
 * Format a date with time
 */
export const formatDateTime = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const formatRelativeTime = (value: string): string => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.round(diffMs / 60000);

    if (diffMinutes < 1) {
        return 'Just now';
    }

    if (diffMinutes < 60) {
        return `${diffMinutes} min ago`;
    }

    const diffHours = Math.round(diffMinutes / 60);

    if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }

    const diffDays = Math.round(diffHours / 24);

    if (diffDays === 1) {
        return 'Yesterday';
    }

    return `${diffDays} days ago`;
};

/**
 * Truncate a string to a specific length
 */
export const truncateString = (str: string, length: number): string => {
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
};

/**
 * Format a number as currency
 */
export const formatCurrency = (value: number, currency = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(value);
};

/**
 * Format a number with thousands separator
 */
export const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
};

/**
 * Get initials from a name
 */
export const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};
