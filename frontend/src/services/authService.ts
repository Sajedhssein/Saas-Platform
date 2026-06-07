/**
 * Authentication Service
 * This service handles all authentication-related API calls
 */

import api from '../api/axios';
import type { User } from '../types';
import type { AxiosError } from 'axios';
import { isAxiosError } from 'axios';
import { makeError } from '../utils/error';
import { getDashboardPathForUser, normalizeAuthUser, resolveUserRole, type RoleLike } from '../utils/auth';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  // backend may return token as `token` or `access_token`
  token?: string;
  access_token?: string;
  refresh_token?: string;
  refresh_expires_at?: number;
  user?: RoleLike & Partial<User>;
  data?: {
    token?: string;
    access_token?: string;
    user?: RoleLike & Partial<User>;
    refresh_token?: string;
    refresh_expires_at?: number;
  };
}

interface CurrentUserResponse {
  user?: RoleLike & Partial<User>;
  data?: (RoleLike & Partial<User>) | { user?: RoleLike & Partial<User> };
  success?: boolean;
  message?: string;
}

interface UpdateCurrentUserPayload {
  name: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
}

interface InviteAcceptedUserResponse {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar?: string;
  role?: string | null;
  roles?: Array<{ name?: string | null; slug?: string | null; role?: string | null } | string> | string[];
}

interface InviteAcceptPayload {
  invite_id: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirmation: string;
}

interface InviteValidationData {
  invite_id: string;
  email: string;
  role: User['role'];
  expires_at?: string;
  status: 'pending' | 'expired' | 'accepted' | 'used' | string;
}

interface InviteValidationResponse {
  success?: boolean;
  data?: InviteValidationData;
  message?: string;
}

interface InviteAcceptResponse {
  success?: boolean;
  data?: {
    token?: string;
    access_token?: string;
    user?: InviteAcceptedUserResponse;
    refresh_token?: string;
    refresh_expires_at?: number;
  };
  message?: string;
}

interface RegisterPayload {
  fullName: string;
  company?: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type CachedAuthUser = {
  id?: string;
  role?: User['role'];
};

const AUTH_USER_CACHE_KEY = 'auth_user_cache';

const persistAuthUserCache = (user: CachedAuthUser | null): void => {
  if (!user || (!user.id && !user.role)) {
    localStorage.removeItem(AUTH_USER_CACHE_KEY);
    return;
  }

  try {
    localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    // ignore localStorage failures
  }
};

const readAuthUserCache = (): CachedAuthUser => {
  try {
    const raw = localStorage.getItem(AUTH_USER_CACHE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;

    return {
      id: typeof parsed.id === 'string' ? parsed.id : undefined,
      role: typeof parsed.role === 'string' && ['admin', 'employee', 'client'].includes(parsed.role)
        ? (parsed.role as User['role'])
        : undefined,
    };
  } catch {
    return {};
  }
};

const mergeAuthUserFallback = (user: RoleLike & Partial<User> | undefined): RoleLike & Partial<User> | undefined => {
  const cached = readAuthUserCache();

  if (!cached.id && !cached.role) {
    return user;
  }

  return {
    ...cached,
    ...user,
  };
};

const extractAuthData = (response: LoginResponse): { token?: string; refreshToken?: string; user?: RoleLike & Partial<User> } => {
  const nestedData = response.data;

  return {
    token: response.token ?? response.access_token ?? nestedData?.token ?? nestedData?.access_token,
    refreshToken: response.refresh_token ?? nestedData?.refresh_token,
    user: response.user ?? nestedData?.user,
  };
};

const splitFullName = (value: string): { first_name: string; last_name: string } => {
  const cleanedValue = value.trim().replace(/\s+/g, ' ');

  if (!cleanedValue) {
    return { first_name: '', last_name: '' };
  }

  const parts = cleanedValue.split(' ');
  const firstName = parts.shift() ?? '';
  const lastName = parts.join(' ');

  return { first_name: firstName, last_name: lastName };
};

const normalizeAuthResponseUser = (user: RoleLike & Partial<User> | undefined, fallbackError: string): User => {
  const normalizedUser = normalizeAuthUser(user);

  if (!normalizedUser) {
    throw makeError(fallbackError);
  }

  return normalizedUser;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  const err = error as AxiosError<unknown>;
  const responseData = err.response?.data;

  if (typeof responseData === 'object' && responseData !== null) {
    const typedData = responseData as {
      message?: string;
      error?: string;
      detail?: string;
    };

    if (typedData.message) {
      return typedData.message;
    }

    if (typedData.error) {
      return typedData.error;
    }

    if (typedData.detail) {
      return typedData.detail;
    }
  }

  return err.message || fallback;
};

const isDevMode = import.meta.env.DEV;

const logRequestPayload = (label: string, payload: unknown): void => {
  if (!isDevMode) {
    return;
  }

  console.debug(`[auth] ${label} payload`, payload);
};

const logValidationFailure = (label: string, payload: unknown, error: unknown): void => {
  if (!isDevMode) {
    return;
  }

  const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, unknown> }>;

  console.error(`[auth] ${label} validation failed`, {
    requestBody: payload,
    status: axiosError.response?.status,
    message: axiosError.response?.data?.message,
    errors: axiosError.response?.data?.errors,
    responseBody: axiosError.response?.data,
  });
};

export const authService = {
  /**
   * Login user with email and password
   */
  login: async (credentials: LoginCredentials): Promise<{ token: string; refreshToken?: string; user: User }> => {
    try {
      logRequestPayload('login', credentials);
      const response = await api.post<LoginResponse>('/auth/login', credentials);
      const data = response.data as unknown as LoginResponse;
      if (import.meta.env.DEV) {
        console.log('[auth/login] response', data);
      }
      const authData = extractAuthData(data);
      const token = authData.token;
      const user = normalizeAuthResponseUser(authData.user, 'Login did not return user data');
      const resolvedRole = resolveUserRole(user);

      if (!token) {
        throw makeError('Login did not return an access token');
      }

      persistAuthUserCache({ id: user.id, role: user.role });

      if (import.meta.env.DEV) {
        console.log('[auth/login] resolved role', {
          role: resolvedRole,
          redirectPath: getDashboardPathForUser(user),
        });
      }

      return { token, refreshToken: authData.refreshToken, user };
    } catch (error: unknown) {
      throw makeError(getErrorMessage(error, 'Login failed'), error);
    }
  },

  /**
   * Register a new user
   */
  register: async (payload: RegisterPayload): Promise<{ user: User; token?: string }> => {
    try {
      const { first_name, last_name } = splitFullName(payload.fullName);
      const requestPayload = {
        company_name: payload.company?.trim() ?? '',
        first_name,
        last_name,
        email: payload.email.trim(),
        password: payload.password,
        password_confirmation: payload.confirmPassword,
      };

      logRequestPayload('register', requestPayload);

      const response = await api.post<LoginResponse>('/auth/register', requestPayload);
      const data = response.data as unknown as LoginResponse;

      const authData = extractAuthData(data);
      const token = authData.token;
      const user = normalizeAuthResponseUser(authData.user, 'Register did not return user data');

      persistAuthUserCache({ id: user.id, role: user.role });

      return { user, token };
    } catch (error: unknown) {
      const axiosError = error as AxiosError<unknown>;
      if (axiosError.response?.status === 422) {
        logValidationFailure('register', payload, error);
      }

      throw makeError(getErrorMessage(error, 'Registration failed'), error);
    }
  },

  validateInvite: async (publicId: string): Promise<InviteValidationData> => {
    const inviteId = String(publicId ?? '').trim();

    if (!inviteId) {
      throw makeError('Invite link is invalid or expired.');
    }

    logRequestPayload('validateInvite', { publicId: inviteId });

    try {
      const response = await api.get<InviteValidationResponse>(`/auth/invite/${encodeURIComponent(inviteId)}`);

      // Log full response for debugging
      if (import.meta.env.DEV) {
        try {
          console.debug('[auth/validateInvite] response', { status: response.status, data: response.data });
        } catch {
          // ignore logging failures
        }
      }

      // Only treat non-2xx as errors — axios will normally throw for non-2xx, but be defensive
      if (typeof response.status === 'number' && (response.status < 200 || response.status >= 300)) {
        throw makeError(response.data?.message || 'Invite link is invalid or expired.');
      }

      // Support multiple response shapes: response.data.data, response.data.invite, or response.data
      const raw = response.data as InviteValidationResponse & {
        invite?: Partial<InviteValidationData>;
        data?: Partial<InviteValidationData>;
      };
      const candidate = raw?.data ?? raw?.invite ?? raw;

      // Build a best-effort InviteValidationData — do not fail if some fields are missing
      const inviteData: InviteValidationData = {
        invite_id: String(candidate?.invite_id ?? candidate?.id ?? inviteId),
        email: String(candidate?.email ?? ''),
        role: (candidate?.role ?? candidate?.roles ?? 'employee') as InviteValidationData['role'],
        expires_at: candidate?.expires_at ?? undefined,
        status: (candidate?.status ?? 'pending') as InviteValidationData['status'],
      };

      return inviteData;
    } catch (error: unknown) {
      // Only run specialized handling for real Axios errors (network / 4xx / 5xx)
      if (isAxiosError(error)) {
        const axiosError = error as AxiosError<unknown>;
        if (axiosError.response?.status === 422) {
          logValidationFailure('validateInvite', { publicId }, error);
        }

        // Log response data when available
        if (import.meta.env.DEV) {
          try {
            console.error('[auth/validateInvite] axios error', {
              status: axiosError.response?.status,
              data: axiosError.response?.data,
            });
          } catch {
            // ignore
          }
        }

        throw makeError(getErrorMessage(axiosError, 'Invite link is invalid or expired.'), error);
      }

      // Non-Axios error — rethrow as a generic invite error
      throw makeError(getErrorMessage(error, 'Invite link is invalid or expired.'), error);
    }
  },

  acceptInvite: async (payload: InviteAcceptPayload): Promise<{ token: string; user: RoleLike & Partial<User> }> => {
    try {
      logRequestPayload('acceptInvite', payload);
      const response = await api.post<InviteAcceptResponse>('/auth/invite/accept', payload);
      const authData = extractAuthData(response.data as LoginResponse);
      const token = authData.token;

      if (!token) {
        throw makeError('Invite acceptance did not return an access token');
      }

      // Be permissive: do not throw if backend did not include a normalized role.
      // Return the raw user payload so the page can apply any invite-based role fallback.
      const rawUser = authData.user as RoleLike & Partial<User> | undefined;

      // Persist any available cache information
      try {
        persistAuthUserCache({ id: rawUser?.id, role: typeof rawUser?.role === 'string' ? (rawUser.role as User['role']) : undefined });
      } catch {
        // ignore cache set failures
      }

      return { token, user: rawUser ?? {} };
    } catch (error: unknown) {
      const axiosError = error as AxiosError<unknown>;
      if (axiosError.response?.status === 422) {
        logValidationFailure('acceptInvite', payload, error);
      }

      throw makeError(getErrorMessage(error, 'Invite acceptance failed'), error);
    }
  },

  /**
   * Logout user (clear server session if needed)
   */
  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      const err = error as AxiosError<{ message?: string }>;
      console.error('Logout error:', err.message);
    } finally {
      persistAuthUserCache(null);
    }
  },

  /**
   * Get current authenticated user
   * Called on app load to restore auth state
   */
  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await api.get<CurrentUserResponse>('/profile');

      if (import.meta.env.DEV) {
        console.log('[auth/profile] response', response.data);
      }

      const responseData = response.data as unknown;

      // Robust extraction of user payload from possible envelope shapes
      let candidateUser: RoleLike & Partial<User> | undefined;

      try {
        if (responseData && typeof responseData === 'object' && 'user' in (responseData as Record<string, unknown>)) {
          candidateUser = ((responseData as Record<string, unknown>)['user']) as RoleLike & Partial<User>;
        } else if (responseData && typeof responseData === 'object' && 'data' in (responseData as Record<string, unknown>)) {
          const nested = (responseData as Record<string, unknown>)['data'];
          if (nested && typeof nested === 'object' && 'user' in nested) {
            candidateUser = ((nested as Record<string, unknown>)['user']) as RoleLike & Partial<User>;
          } else {
            candidateUser = nested as RoleLike & Partial<User>;
          }
        } else if (responseData && typeof responseData === 'object') {
          candidateUser = responseData as RoleLike & Partial<User>;
        } else {
          candidateUser = undefined;
        }
      } catch {
        // fallthrough to normalization error handling below
        candidateUser = undefined;
      }

      candidateUser = mergeAuthUserFallback(candidateUser);

      let user: User;
      try {
        user = normalizeAuthResponseUser(candidateUser, 'Failed to fetch current user');
      } catch (normErr) {
        if (import.meta.env.DEV) {
          console.error('[auth/getCurrentUser] normalization failed', { responseData, candidateUser, error: normErr });
        }
        throw normErr;
      }

      if (import.meta.env.DEV) {
        console.log('[auth/me] resolved role', {
          user,
          role: resolveUserRole(user),
          redirectPath: getDashboardPathForUser(user),
        });
      }

      return user;
    } catch (error: unknown) {
      const err = error as AxiosError<unknown>;
      const message = typeof err.response?.data === 'object' && err.response?.data !== null && 'message' in err.response.data
        ? (err.response.data as { message?: string }).message
        : err.message;
      throw makeError(message || 'Failed to fetch current user', error);
    }
  },

  updateCurrentUser: async (payload: UpdateCurrentUserPayload): Promise<User> => {
    try {
      logRequestPayload('updateCurrentUser', payload);
      await api.put('/profile', payload);

      if (import.meta.env.DEV) {
        console.log('[profile:update] response', 'Profile updated successfully');
      }

      return authService.getCurrentUser();
    } catch (error: unknown) {
      const err = error as AxiosError<unknown>;
      const message = typeof err.response?.data === 'object' && err.response?.data !== null && 'message' in err.response.data
        ? (err.response.data as { message?: string }).message
        : err.message;
      throw makeError(message || 'Failed to update current user', error);
    }
  },

  uploadProfileAvatar: async (file: File): Promise<User> => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post<CurrentUserResponse>('/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const responseData = response.data as unknown;
      const candidateUser = responseData && typeof responseData === 'object' && 'data' in (responseData as Record<string, unknown>)
        ? (responseData as { data?: RoleLike & Partial<User> }).data
        : responseData as RoleLike & Partial<User>;

      return normalizeAuthResponseUser(candidateUser, 'Avatar upload did not return user data');
    } catch (error: unknown) {
      throw makeError(getErrorMessage(error, 'Failed to upload profile picture'), error);
    }
  },

  dismissWelcome: async (): Promise<User> => {
    try {
      const response = await api.patch<CurrentUserResponse>('/profile/welcome-dismissed');
      const responseData = response.data as unknown;
      const candidateUser = responseData && typeof responseData === 'object' && 'data' in (responseData as Record<string, unknown>)
        ? (responseData as { data?: RoleLike & Partial<User> }).data
        : responseData as RoleLike & Partial<User>;

      return normalizeAuthResponseUser(candidateUser, 'Welcome dismissal did not return user data');
    } catch (error: unknown) {
      throw makeError(getErrorMessage(error, 'Failed to dismiss welcome'), error);
    }
  },

  /**
   * Refresh authentication token
   */
  refreshToken: async (refreshToken?: string): Promise<{ token: string; refreshToken?: string }> => {
    try {
      const response = await api.post<LoginResponse>('/auth/refresh', refreshToken ? { refresh_token: refreshToken } : undefined);
      const data = response.data as unknown as LoginResponse;
      const authData = extractAuthData(data);
      const token = authData.token;

      if (!token) {
        throw makeError('Refresh token response missing token');
      }

      return { token, refreshToken: authData.refreshToken };
    } catch (error: unknown) {
      throw makeError(getErrorMessage(error, 'Failed to refresh token'), error);
    }
  },

  /**
   * Request a password reset link
   */
  requestPasswordReset: async (email: string): Promise<void> => {
    try {
      const payload = { email: email.trim() };
      logRequestPayload('requestPasswordReset', payload);

      const response = await api.post<{ message?: string; data?: { message?: string } }>('/auth/forgot-password', payload);

      if (import.meta.env.DEV) {
        console.log('[auth/forgot-password] response', response.data);
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string }>;
      if (axiosError.response?.status === 422) {
        logValidationFailure('requestPasswordReset', { email }, error);
      }

      throw makeError(getErrorMessage(error, 'Failed to send password reset link'), error);
    }
  },

  /**
   * Reset password with token
   */
  resetPassword: async (email: string, token: string, password: string, password_confirmation: string): Promise<void> => {
    try {
      const payload = {
        email: email.trim(),
        token,
        password,
        password_confirmation,
      };
      logRequestPayload('resetPassword', payload);

      const response = await api.post<{ message?: string; data?: { message?: string } }>('/auth/reset-password', payload);

      if (import.meta.env.DEV) {
        console.log('[auth/reset-password] response', response.data);
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, unknown> }>;
      if (axiosError.response?.status === 422) {
        logValidationFailure('resetPassword', {
          email: email.trim(),
          token,
          password,
          password_confirmation,
        }, error);
      }

      throw makeError(getErrorMessage(error, 'Failed to reset password'), error);
    }
  },
};
