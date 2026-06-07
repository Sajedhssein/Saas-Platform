import type { User } from '../types';
import { getDashboardPathForRole as getDashboardPathFromPermissions } from '../lib/permissions';

const PROFILE_OVERRIDES_STORAGE_KEY = 'profile_overrides';

export type RoleLike = {
    role?: string | null;
    roles?: Array<
        | string
        | {
            name?: string | null;
            slug?: string | null;
            role?: string | null;
            roles?: Array<{ name?: string | null; slug?: string | null; role?: string | null } | string> | string[];
        }
    > | string[];
};

const isUserRole = (value: string | null | undefined): value is User['role'] => {
    return value === 'admin' || value === 'employee' || value === 'client';
};

const normalizeRoleValue = (value: unknown): User['role'] | null => {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim().toLowerCase();

    if (isUserRole(normalized)) {
        return normalized;
    }

    return null;
};

const extractRoleCandidate = (value: unknown): User['role'] | null => {
    const directRole = normalizeRoleValue(value);

    if (directRole) {
        return directRole;
    }

    if (!value || typeof value !== 'object') {
        return null;
    }

    const candidate = value as {
        role?: unknown;
        slug?: unknown;
        name?: unknown;
        roles?: unknown;
    };

    const objectRole = normalizeRoleValue(candidate.role) ?? normalizeRoleValue(candidate.slug) ?? normalizeRoleValue(candidate.name);

    if (objectRole) {
        return objectRole;
    }

    if (Array.isArray(candidate.roles)) {
        for (const nestedRole of candidate.roles) {
            const resolvedNestedRole = extractRoleCandidate(nestedRole);
            if (resolvedNestedRole) {
                return resolvedNestedRole;
            }
        }
    }

    return null;
};

export const resolveUserRole = (user: RoleLike | null | undefined): User['role'] | null => {
    if (!user) {
        return null;
    }

    return extractRoleCandidate(user.role) ?? (Array.isArray(user.roles) ? user.roles.map(extractRoleCandidate).find(Boolean) ?? null : extractRoleCandidate(user.roles));
};

export const normalizeAuthUser = <T extends RoleLike & { id?: string; name?: string; email?: string; avatar?: string; avatar_url?: string }>(user: T | null | undefined): (User & T) | undefined => {
    if (!user) {
        return undefined;
    }

    const resolvedRole = resolveUserRole(user);

    if (!resolvedRole) {
        return undefined;
    }

    return {
        ...user,
        avatar: typeof user.avatar === 'string' ? user.avatar : typeof user.avatar_url === 'string' ? user.avatar_url : undefined,
        role: resolvedRole,
    };
};

export const getDashboardPathForRole = (role: User['role'] | undefined | null): string => {
    return getDashboardPathFromPermissions(role);
};

export const getDashboardPathForUser = (user: RoleLike | null | undefined): string => {
    return getDashboardPathForRole(resolveUserRole(user));
};

export type ProfileOverrides = Partial<Pick<User, 'name' | 'email' | 'avatar' | 'company'>>;

const readStoredProfileOverrides = (): ProfileOverrides | null => {
    try {
        const rawValue = localStorage.getItem(PROFILE_OVERRIDES_STORAGE_KEY);

        if (!rawValue) {
            return null;
        }

        const parsedValue = JSON.parse(rawValue) as ProfileOverrides;

        if (!parsedValue || typeof parsedValue !== 'object') {
            return null;
        }

        return {
            name: typeof parsedValue.name === 'string' ? parsedValue.name : undefined,
            email: typeof parsedValue.email === 'string' ? parsedValue.email : undefined,
            avatar: typeof parsedValue.avatar === 'string' ? parsedValue.avatar : undefined,
            company: typeof parsedValue.company === 'string' ? parsedValue.company : undefined,
        };
    } catch {
        return null;
    }
};

export const persistProfileOverrides = (overrides: ProfileOverrides): void => {
    const nextOverrides: ProfileOverrides = {
        name: typeof overrides.name === 'string' ? overrides.name : undefined,
        email: typeof overrides.email === 'string' ? overrides.email : undefined,
        avatar: typeof overrides.avatar === 'string' ? overrides.avatar : undefined,
        company: typeof overrides.company === 'string' ? overrides.company : undefined,
    };

    localStorage.setItem(PROFILE_OVERRIDES_STORAGE_KEY, JSON.stringify(nextOverrides));
};

export const updateProfileOverrides = (overrides: Partial<ProfileOverrides>): void => {
    const currentOverrides = readStoredProfileOverrides() ?? {};

    persistProfileOverrides({
        ...currentOverrides,
        ...overrides,
    });
};

export const clearProfileOverrides = (): void => {
    localStorage.removeItem(PROFILE_OVERRIDES_STORAGE_KEY);
};

export const mergeUserWithProfileOverrides = <T extends User>(user: T | null | undefined): T | undefined => {
    if (!user) {
        return undefined;
    }

    const overrides = readStoredProfileOverrides();

    if (!overrides) {
        return user;
    }

    return {
        ...user,
        ...overrides,
    };
};
