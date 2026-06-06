/**
 * Application Configuration
 * 
 * This file contains all app-wide constants used across the application.
 * Update this single source for global configuration changes.
 */

export const appConfig = {
    // Company and branding
    companyName: 'Improver',

    // Developer/Creator
    developerName: 'Sajed Houssein',

    // Footer configuration
    footer: {
        companyName: 'Improver',
        developerName: 'Sajed Houssein',
        currentYear: new Date().getFullYear(),
    },
} as const;
