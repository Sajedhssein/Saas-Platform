import axios, { AxiosHeaders, isAxiosError, type InternalAxiosRequestConfig } from 'axios';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _skipAuthRefresh?: boolean;
  url?: string;
}

interface LoginResponse {
  token?: string;
  access_token?: string;
  refresh_token?: string;
  data?: {
    token?: string;
    access_token?: string;
    refresh_token?: string;
  };
}

const getBaseURL = (): string | undefined => {
  const rawUrl = import.meta.env.VITE_API_URL;

  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return undefined;
  }

  return rawUrl.replace(/\/+$|\s+$/g, '') + '/';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

let refreshPromise: Promise<string> | null = null;
let logoutPromise: Promise<void> | null = null;

const ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const AUTH_STORAGE_KEY = 'auth_storage';

type AuthStorageType = 'local' | 'session';

const getAuthStorageType = (): AuthStorageType => {
  const savedType = localStorage.getItem(AUTH_STORAGE_KEY);

  if (savedType === 'local' || savedType === 'session') {
    return savedType;
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY) ? 'local' : 'session';
};

const getAuthStorage = (): Storage => (getAuthStorageType() === 'local' ? localStorage : sessionStorage);

const getStoredValue = (key: string): string | null => {
  const storageValue = getAuthStorage().getItem(key);
  return storageValue ?? localStorage.getItem(key) ?? sessionStorage.getItem(key);
};

const setStoredValue = (key: string, value: string): void => {
  getAuthStorage().setItem(key, value);
};

const clearAuthStorage = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
};

const extractTokenData = (data: LoginResponse): { token?: string; refreshToken?: string } => ({
  token: data.token ?? data.access_token ?? data.data?.token ?? data.data?.access_token,
  refreshToken: data.refresh_token ?? data.data?.refresh_token,
});

const isAuthEndpoint = (url?: string): boolean => {
  if (!url) {
    return false;
  }

  return ['/auth/login', '/auth/register', '/auth/refresh'].some((path) => url.includes(path));
};

const applyBearerToken = (config: RetryableRequestConfig, token: string): void => {
  if (config.headers instanceof AxiosHeaders) {
    config.headers.set('Authorization', `Bearer ${token}`);
    return;
  }

  config.headers = AxiosHeaders.from(config.headers ?? {});
  config.headers.set('Authorization', `Bearer ${token}`);
};

const logoutAndRedirect = async (): Promise<void> => {
  if (logoutPromise) {
    return logoutPromise;
  }

  logoutPromise = (async () => {
    clearAuthStorage();

    try {
      const { default: useAuthStore } = await import('../store/authStore');
      useAuthStore.getState().logout();
    } catch {
      // State cleanup already handled by localStorage removal.
    }

    if (window.location.pathname !== '/login') {
      window.location.replace('/login');
    }
  })().finally(() => {
    logoutPromise = null;
  });

  return logoutPromise;
};

const refreshAccessToken = async (): Promise<string> => {
  const storedRefreshToken = getStoredValue(REFRESH_TOKEN_KEY);

  if (!storedRefreshToken || storedRefreshToken === 'undefined' || storedRefreshToken === 'null') {
    throw new Error('No refresh token available');
  }

  if (!refreshPromise) {
    refreshPromise = api
      .post<LoginResponse>('/auth/refresh', { refresh_token: storedRefreshToken }, {
        _skipAuthRefresh: true,
      } as RetryableRequestConfig)
      .then((response) => {
        const { token, refreshToken } = extractTokenData(response.data);

        if (!token) {
          throw new Error('Refresh token response missing token');
        }

        setStoredValue(ACCESS_TOKEN_KEY, token);

        if (refreshToken) {
          setStoredValue(REFRESH_TOKEN_KEY, refreshToken);
        }

        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.request.use((config) => {
  const token = getStoredValue(ACCESS_TOKEN_KEY);
  // TEMP DEBUG: log token and request URL for auth initialization debugging
  try {
    console.debug('[api.request] token:', token, 'baseURL:', api.defaults.baseURL, 'url:', config?.url);
  } catch {
    // ignore logging failures
  }

  if (token && token !== 'undefined' && token !== 'null') {
    applyBearerToken(config as RetryableRequestConfig, token);
  }

  if (typeof config.url === 'string' && config.url.startsWith('/') && !config.url.startsWith('//')) {
    config.url = config.url.replace(/^\/+/, '');
  }

  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    try {
      console.debug('[api.response] url:', response.config?.url, 'status:', response.status);
    } catch {
      // ignore logging failures
    }

    return response;
  },
  async (error: unknown) => {
    try {
      const axiosErr = error as { config?: { url?: string }; response?: { status?: number } } | undefined;
      console.debug('[api.response:error] url:', axiosErr?.config?.url, 'status:', axiosErr?.response?.status);
    } catch {
      // ignore logging failures
    }
    if (!isAxiosError(error)) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? error.config?.url;
    const shouldSkipRefresh = Boolean(originalRequest?._skipAuthRefresh) || isAuthEndpoint(requestUrl);

    if (status === 401 && originalRequest && !originalRequest._retry && !shouldSkipRefresh) {
      const currentToken = getStoredValue(ACCESS_TOKEN_KEY);
      const currentRefreshToken = getStoredValue(REFRESH_TOKEN_KEY);

      if (
        (!currentToken || currentToken === 'undefined' || currentToken === 'null') &&
        (!currentRefreshToken || currentRefreshToken === 'undefined' || currentRefreshToken === 'null')
      ) {
        await logoutAndRedirect();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        const refreshedToken = await refreshAccessToken();
        applyBearerToken(originalRequest, refreshedToken);
        return api(originalRequest);
      } catch (refreshError) {
        await logoutAndRedirect();
        return Promise.reject(refreshError);
      }
    }

    if (status === 401) {
      await logoutAndRedirect();
    }

    return Promise.reject(error);
  }
);

export default api;
