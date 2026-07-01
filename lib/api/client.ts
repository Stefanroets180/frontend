import { clearAuthCookies } from '@/lib/auth/normalize-auth-response'

const DEFAULT_BACKEND = 'http://localhost:8080';

/** Resolve API base URL — always absolute in the browser when possible. */
function resolveApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
  const fallback = `${DEFAULT_BACKEND}/api/v1`;

  if (!raw) {
    // When no env var is set, dynamically use current origin with backend port
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      // Replace frontend port (3000) with backend port (8080)
      const apiOrigin = origin.replace(/:\d+$/, ':8080');
      return `${apiOrigin}/api/v1`;
    }
    return fallback;
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    // If it's localhost, dynamically replace with current origin when in browser
    if (raw.includes('localhost') && typeof window !== 'undefined') {
      const origin = window.location.origin;
      const apiOrigin = origin.replace(/:\d+$/, ':8080');
      return `${apiOrigin}/api/v1`;
    }
    return raw.replace(/\/$/, '');
  }

  // Relative path (e.g. /api/v1) — same-origin; Next.js rewrites proxy to Spring Boot
  if (typeof window !== 'undefined') {
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return `${window.location.origin}${path}`.replace(/\/$/, '');
  }

  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${DEFAULT_BACKEND}${path}`.replace(/\/$/, '');
}

const API_URL = resolveApiBaseUrl();

// 1. Dynamic Header Helper - Reads token FRESH on every call
const getHeaders = (skipAuth: boolean = false): HeadersInit => {
  const headers: HeadersInit = { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  if (typeof window !== 'undefined' && !skipAuth) {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

// 2. Auth Error Handler - Clears token and redirects on 401/403
async function handleAuthError(res: Response, url: string): Promise<never> {
  if (res.status === 404 && url.includes('/api/v1/')) {
    console.warn(
      `[API] 404 for ${url}. Restart Spring Boot (mvn spring-boot:run -Dspring-boot.run.profiles=dev) so new controllers load.`
    );
  }
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('role');
    localStorage.removeItem('org_mode');
    localStorage.removeItem('user_profile');
    clearAuthCookies();
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login?error=session_expired';
    }
  }
  // Try to read error message from response body
  let errorMessage = res.statusText;
  try {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const errorData = await res.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    }
  } catch (e) {
    // If parsing fails, use statusText
  }

  // Detect locked entry errors
  if (errorMessage.includes('Cannot delete locked expense') || errorMessage.includes('Cannot modify locked entry')) {
    throw new Error('LOCKED_ERROR: ' + errorMessage);
  }

  // Detect concurrency/optimistic locking errors from Hibernate/JPA
  if (errorMessage.includes('Row was updated or deleted by another transaction')) {
    throw new Error('CONFLICT_ERROR: This record was modified by another user. Please refresh and try again.');
  }

  throw new Error(`HTTP ${res.status}: ${errorMessage}`);
}

// 3. The API Object - All methods use dynamic headers
async function safeJsonParse(res: Response) {
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await res.text();
    console.error('[API] Non-JSON response:', text.substring(0, 200));
    throw new Error(`Expected JSON but got ${contentType}`);
  }
  return res.json();
}

export const api = {
  /** GET that returns null data on 404, 204, 400, or 500 (optional endpoints / stale backend). */
  getOptional: async (endpoint: string) => {
    const url = `${API_URL}${endpoint}`;
    const res = await fetch(url, { method: 'GET', headers: getHeaders() });
    if (res.status === 404 || res.status === 204 || res.status === 400 || res.status === 500) {
      return { data: null };
    }
    if (!res.ok) await handleAuthError(res, url);
    return { data: await safeJsonParse(res) };
  },

  get: async (endpoint: string) => {
    const url = `${API_URL}${endpoint}`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });
      if (!res.ok) await handleAuthError(res, url);
      return { data: await safeJsonParse(res) };
    } catch (error) {
      console.error(`[API] GET ${url} failed:`, error);
      throw error;
    }
  },

  post: async (endpoint: string, body: unknown, skipAuth: boolean = false) => {
    const url = `${API_URL}${endpoint}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(skipAuth),
        body: JSON.stringify(body),
      });
      if (!res.ok) await handleAuthError(res, url);
      return { data: await safeJsonParse(res) };
    } catch (error) {
      console.error(`[API] POST ${url} failed:`, error);
      throw error;
    }
  },

  patch: async (endpoint: string, body: unknown) => {
    const url = `${API_URL}${endpoint}`;
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) await handleAuthError(res, url);
      return { data: await safeJsonParse(res) };
    } catch (error) {
      console.error(`[API] PATCH ${url} failed:`, error);
      throw error;
    }
  },

  put: async (endpoint: string, body: unknown) => {
    const url = `${API_URL}${endpoint}`;
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) await handleAuthError(res, url);
      return { data: await safeJsonParse(res) };
    } catch (error) {
      console.error(`[API] PUT ${url} failed:`, error);
      throw error;
    }
  },

  delete: async (endpoint: string) => {
    const url = `${API_URL}${endpoint}`;
    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) await handleAuthError(res, url);
      // DELETE endpoints often return 204 No Content or 200 OK with empty body
      if (res.status === 204 || res.status === 200) {
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return { data: null };
        }
      }
      return { data: await safeJsonParse(res) };
    } catch (error) {
      console.error(`[API] DELETE ${url} failed:`, error);
      throw error;
    }
  },
};

// 4. Form Data Helper (no Content-Type - browser sets boundary)
export const apiForm = {
  post: async (endpoint: string, formData: FormData) => {
    const headers: HeadersInit = {};

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('jwt_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const url = `${API_URL}${endpoint}`;
    if (!res.ok) await handleAuthError(res, url);
    return { data: await res.json() };
  },
};

// Legacy exports for backward compatibility
export { API_URL };
export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });
  const url = `${API_URL}${path}`;
  if (!res.ok) await handleAuthError(res, url);
  return res;
};

// FormData version - returns raw Response for compatibility
export const apiFormFetch = async (endpoint: string, formData: FormData) => {
  const headers: HeadersInit = {};

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const url = `${API_URL}${endpoint}`;
  if (!res.ok) handleAuthError(res, url);
  return res;
};

/** POST/PUT multipart to Spring API; returns Response (caller reads body / checks ok). */
export async function apiPostMultipart(
  path: string,
  formData: FormData,
  method: 'POST' | 'PUT' = 'POST'
): Promise<Response> {
  const headers: HeadersInit = {};
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jwt_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const p = path.startsWith('/') ? path : `/${path}`;
  return fetch(`${API_URL}${p}`, { method, headers, body: formData });
}

// ============================================================================
// ODOMETER & RECURRING TRIPS API
// ============================================================================

/** Get last odometer reading for a specific vehicle */
export const getLastOdometerReading = async (vehicleId: string) => {
  return api.get(`/trips/vehicle/${vehicleId}/last-odometer`);
};

/** Get all recurring trips for the current user */
export const getRecurringTrips = async () => {
  return api.get('/recurring-trips');
};

/** Get recurring trips filtered by vehicle ID */
export const getRecurringTripsByVehicle = async (vehicleId: string) => {
  return api.get(`/recurring-trips/vehicle/${vehicleId}`);
};

/** Create a new recurring trip template */
export const createRecurringTrip = async (data: {
  vehicleId: string;
  userId: string;
  purpose: 'BUSINESS' | 'PRIVATE';
  startLocation: string;
  endLocation: string;
  routeDescription?: string;
  customerClientName?: string;
  reasonForTrip?: string;
  isRecurring: boolean;
  recurrenceDays?: string;
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
  defaultTollCostsZar: number;
  defaultParkingCostsZar: number;
}) => {
  return api.post('/recurring-trips', data);
};

/** Delete a recurring trip by ID */
export const deleteRecurringTrip = async (id: string) => {
  return api.delete(`/recurring-trips/${id}`);
};

// ============================================================================
// EXPENSE CATEGORIES API
// ============================================================================

/** Get expense categories for the current user (filtered by role and org mode) */
export const getExpenseCategories = async () => {
  return api.get('/expenses/categories');
};
