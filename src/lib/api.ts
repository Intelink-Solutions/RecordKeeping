// ─────────────────────────────────────────────────────────────────────────────
// API Client — live first with route fallback support
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URLS = [
  "https://keydoctors.pikoup.com/api/v1",
  "https://keydoctors.pikoup.com/public/api/v1",
] as const;

const API_BASE_OVERRIDE_KEY = "pos_api_base_url";
const TOKEN_KEY = "pos_auth_token";
let activeBaseUrl: string | null = null;

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function getCandidateBaseUrls(): string[] {
  const override = localStorage.getItem(API_BASE_OVERRIDE_KEY)?.trim();
  const preferred = activeBaseUrl ?? override;

  const all = [
    ...(preferred ? [preferred] : []),
    ...DEFAULT_BASE_URLS,
  ].map(normalizeBaseUrl);

  return [...new Set(all)];
}

// ── Token storage ──────────────────────────────────────────────────────────────
export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (t: string): void => { localStorage.setItem(TOKEN_KEY, t); },
  clear: (): void => { localStorage.removeItem(TOKEN_KEY); },
};

// ── Custom errors ──────────────────────────────────────────────────────────────
/** Thrown when the backend responds with 201, indicating an OTP was sent. */
export class OtpRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtpRequiredError";
  }
}

/** Thrown when every candidate base URL fails at the network level (server unreachable). */
export class NetworkDownError extends Error {
  constructor(message = "Server is unreachable.") {
    super(message);
    this.name = "NetworkDownError";
  }
}

interface RequestResult<T> {
  data: T;
  status: number;
  baseUrl: string;
}

function extractApiMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const obj = payload as Record<string, unknown>;
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.error === "string") return obj.error;

  return null;
}

function looksLikeRouteNotFound(status: number, payload: unknown): boolean {
  const msg = extractApiMessage(payload)?.toLowerCase() ?? "";

  return (
    status === 404 && (
      msg.includes("route") ||
      msg.includes("not found") ||
      msg.includes("notfound") ||
      msg.includes("the requested resource")
    )
  );
}

function isInvalidCredentialResponse(status: number, payload: unknown): boolean {
  const msg = extractApiMessage(payload)?.toLowerCase() ?? "";
  return status === 404 && msg.includes("invalid email or password");
}

async function sendWithFallback<T>(path: string, options: RequestInit = {}): Promise<RequestResult<T>> {
  const token = tokenStorage.get();

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const bases = getCandidateBaseUrls();
  let lastErrorMessage = "Request failed.";
  // Tracks whether every candidate that caused a `continue` was a pure network
  // error (TypeError). If true after the loop, the server is unreachable.
  let allContinuesWereNetworkErrors = true;

  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, { ...options, headers });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        activeBaseUrl = base;
        return { data: data as T, status: res.status, baseUrl: base };
      }

      const message = extractApiMessage(data) ?? `Request failed (${res.status})`;
      lastErrorMessage = message;

      // This is a valid auth response and should not trigger route fallback.
      if (isInvalidCredentialResponse(res.status, data)) {
        allContinuesWereNetworkErrors = false;
        throw new Error(message);
      }

      // Route missing on this base; try next candidate.
      if (looksLikeRouteNotFound(res.status, data)) {
        allContinuesWereNetworkErrors = false; // server is up, just wrong route
        continue;
      }

      allContinuesWereNetworkErrors = false;
      throw new Error(message);
    } catch (err) {
      if (err instanceof Error && err.message) {
        lastErrorMessage = err.message;
      }

      // Network-level errors can still try next base URL.
      const isNetworkError = err instanceof TypeError;
      if (isNetworkError) continue;

      throw err;
    }
  }

  if (allContinuesWereNetworkErrors) {
    throw new NetworkDownError();
  }
  throw new Error(lastErrorMessage);
}

// ── Core request helper ────────────────────────────────────────────────────────
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data, status } = await sendWithFallback<T>(path, options);

  // No content — return empty object
  if (status === 204) return {} as T;

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export interface CurrencyInfo {
  id: number;
  name: string;
  code: string;
  symbol: string;
  position: string;
}

/**
 * Response shape for POST /sign-in (200 OK).
 * The backend wraps token inside `data`.
 */
export interface LoginSuccessResponse {
  message: string;
  data: {
    is_setup: boolean;
    token: string;
    currency: CurrencyInfo;
  };
}

/**
 * Response shape for POST /submit-otp (200 OK).
 * Token is at the root, NOT inside `data`.
 */
export interface OtpSuccessResponse {
  message: string;
  is_setup: boolean;
  token: string;
  currency: CurrencyInfo;
}

/**
 * POST /sign-in
 * Throws OtpRequiredError when backend returns 201 (OTP sent).
 * Throws Error on other non-2xx responses.
 */
export async function apiLogin(
  email: string,
  password: string
): Promise<LoginSuccessResponse> {
  const { data, status } = await sendWithFallback<LoginSuccessResponse | { message?: string }>("/sign-in", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (status === 201) {
    // OTP was sent; not a real error, just a redirect signal
    throw new OtpRequiredError(
      extractApiMessage(data) ?? "An OTP code was sent to your email. Please verify."
    );
  }

  if (status !== 200) {
    throw new Error(extractApiMessage(data) ?? "Login failed. Check your credentials.");
  }

  return data as LoginSuccessResponse;
}

/**
 * POST /submit-otp
 * Verifies the email OTP and returns the auth token.
 */
export async function apiSubmitOtp(
  email: string,
  otp: string
): Promise<OtpSuccessResponse> {
  const { data, status } = await sendWithFallback<OtpSuccessResponse | { error?: string; message?: string }>("/submit-otp", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });

  if (status !== 200) {
    // Backend returns `error` key for OTP failures
    throw new Error(
      extractApiMessage(data) ?? "OTP verification failed."
    );
  }

  return data as OtpSuccessResponse;
}

/**
 * POST /resend-otp
 * Asks the server to resend the OTP for the given email.
 */
export async function apiResendOtp(email: string): Promise<{ message: string }> {
  const { data, status } = await sendWithFallback<{ message?: string }>("/resend-otp", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (status !== 200) {
    throw new Error(extractApiMessage(data) ?? "Could not resend OTP.");
  }

  return { message: data.message ?? "OTP sent." };
}

/**
 * GET /sign-out — revokes the current token on the server, then clears storage.
 */
export async function apiSignOut(): Promise<void> {
  try {
    await request("/sign-out");
  } finally {
    tokenStorage.clear();
  }
}

/**
 * GET /refresh-token — rotates the current Sanctum token.
 * Use this before expiry or after a 401 response.
 */
export async function apiRefreshToken(): Promise<string> {
  const data = await request<{ token: string }>("/refresh-token");
  tokenStorage.set(data.token);
  return data.token;
}

export interface ApiProfileResponse {
  message: string;
  data: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role: string;
    image?: string;
  };
}

export async function apiGetProfile(): Promise<ApiProfileResponse["data"]> {
  const payload = await request<ApiProfileResponse>("/profile");
  return payload.data;
}

export interface ApiUserProfileUpdate {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  image?: string;
  bio?: string;
}

/**
 * Save logged-in user profile to backend using common endpoint/method fallbacks.
 */
export async function apiSaveUserProfile(body: ApiUserProfileUpdate): Promise<void> {
  const endpoints = ["/profile", "/user/profile", "/me"];

  for (const path of endpoints) {
    try {
      await request(path, { method: "PUT", body: JSON.stringify(body) });
      return;
    } catch {
      // Try next endpoint
    }
  }

  for (const path of endpoints) {
    try {
      await request(path, { method: "PATCH", body: JSON.stringify(body) });
      return;
    } catch {
      // Try next endpoint
    }
  }

  for (const path of endpoints) {
    try {
      await request(path, { method: "POST", body: JSON.stringify(body) });
      return;
    } catch {
      // Try next endpoint
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Business Profile API
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiBusinessProfile {
  id?: number;
  company_name?: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  currency?: CurrencyInfo;
}

/**
 * GET /business-profile  — fetch the shop owner's business settings.
 * Tries multiple common endpoint paths used by the backend.
 */
export async function apiGetBusinessProfile(): Promise<ApiBusinessProfile | null> {
  // Try common endpoint paths used by POS backends
  const endpoints = ["/business-profile", "/business", "/settings/business", "/shop"];
  for (const path of endpoints) {
    try {
      const payload = await request<{ data?: ApiBusinessProfile } | ApiBusinessProfile>(path);
      if (payload && typeof payload === "object") {
        const data = (payload as { data?: ApiBusinessProfile }).data ?? (payload as ApiBusinessProfile);
        if (data && (data.company_name || data.name || data.email)) {
          return data;
        }
      }
    } catch {
      // Try next endpoint
    }
  }
  return null;
}

/**
 * POST /business-profile  — save updated business settings to the server.
 */
export async function apiSaveBusinessProfile(body: {
  company_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
}): Promise<void> {
  const endpoints = ["/business-profile", "/business", "/settings/business", "/shop"];
  for (const path of endpoints) {
    try {
      await request(path, { method: "POST", body: JSON.stringify(body) });
      return;
    } catch {
      // Try next endpoint
    }
  }
  // PUT fallback
  for (const path of endpoints) {
    try {
      await request(path, { method: "PUT", body: JSON.stringify(body) });
      return;
    } catch {
      // ignore
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic CRUD helpers (for use once HRM / Business routes are being wired up)
// ─────────────────────────────────────────────────────────────────────────────

export function apiGet<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = params ? `${path}?${new URLSearchParams(params)}` : path;
  return request<T>(url);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PUT", body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard API
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardSummaryData {
  sales: number;
  income: number;
  expense: number;
  purchase: number;
}

export interface DashboardSeriesRow {
  date: string;
  amount: number;
}

export interface DashboardData {
  total_expense: number;
  total_income: number;
  total_items: number;
  total_categories: number;
  stock_value: number;
  total_due: number;
  total_profit: number;
  total_loss: number;
  sales: DashboardSeriesRow[];
  purchases: DashboardSeriesRow[];
}

export async function apiGetSummary(date?: string): Promise<DashboardSummaryData> {
  const payload = await apiGet<{ data: DashboardSummaryData }>("/summary", date ? { date } : undefined);
  return payload.data;
}

export async function apiGetDashboard(
  duration: string = "current_month",
  fromDate?: string,
  toDate?: string
): Promise<DashboardData> {
  const params: Record<string, string> = { duration };
  if (fromDate) params.from_date = fromDate;
  if (toDate) params.to_date = toDate;

  const payload = await apiGet<{ data: DashboardData }>("/dashboard", params);
  return payload.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// HRM API list helper
// ─────────────────────────────────────────────────────────────────────────────

function normalizeListData<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;

  // Supports both { data: [] } and paginated { data: { data: [] } }
  if (Array.isArray(obj.data)) {
    return obj.data as T[];
  }

  if (obj.data && typeof obj.data === "object") {
    const nested = obj.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) {
      return nested.data as T[];
    }
  }

  return [];
}

export async function apiListHrmResource<T>(resource: string): Promise<T[]> {
  const payload = await apiGet<unknown>(`/hrm/${resource}`);
  return normalizeListData<T>(payload);
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications API
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiNotificationItem {
  id?: string | number;
  title?: string;
  message?: string;
  body?: string;
  type?: "info" | "success" | "warning" | string;
  read?: boolean;
  is_read?: boolean;
  read_at?: string | null;
  created_at?: string;
  createdAt?: string;
}

function normalizeNotificationList(payload: unknown): ApiNotificationItem[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;

  if (Array.isArray(obj.data)) {
    return obj.data as ApiNotificationItem[];
  }

  if (obj.data && typeof obj.data === "object") {
    const nested = obj.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) {
      return nested.data as ApiNotificationItem[];
    }
  }

  if (Array.isArray(obj.notifications)) {
    return obj.notifications as ApiNotificationItem[];
  }

  if (Array.isArray(obj.results)) {
    return obj.results as ApiNotificationItem[];
  }

  return [];
}

export async function apiGetNotifications(): Promise<ApiNotificationItem[]> {
  const endpoints = ["/notifications", "/notification", "/alerts", "/user/notifications"];

  for (const path of endpoints) {
    try {
      const payload = await request<unknown>(path);
      const list = normalizeNotificationList(payload);
      if (list.length > 0) return list;
    } catch {
      // Try next endpoint
    }
  }

  return [];
}

export async function apiMarkNotificationRead(notificationId: string): Promise<void> {
  const id = encodeURIComponent(notificationId);
  const endpoints = [
    `/notifications/${id}/read`,
    `/notification/${id}/read`,
    `/notifications/${id}`,
    `/notification/${id}`,
  ];

  for (const path of endpoints) {
    try {
      await request(path, { method: "POST", body: JSON.stringify({ read: true }) });
      return;
    } catch {
      // Try next method/endpoint
    }
  }

  for (const path of endpoints) {
    try {
      await request(path, { method: "PATCH", body: JSON.stringify({ read: true }) });
      return;
    } catch {
      // Try next method/endpoint
    }
  }

  for (const path of endpoints) {
    try {
      await request(path, { method: "PUT", body: JSON.stringify({ read: true }) });
      return;
    } catch {
      // Try next method/endpoint
    }
  }
}

export async function apiMarkAllNotificationsRead(): Promise<void> {
  const endpoints = [
    "/notifications/read-all",
    "/notification/read-all",
    "/notifications/mark-all-read",
    "/user/notifications/read-all",
    "/notifications/read",
  ];

  for (const path of endpoints) {
    try {
      await request(path, { method: "POST" });
      return;
    } catch {
      // Try next endpoint
    }
  }

  for (const path of endpoints) {
    try {
      await request(path, { method: "PATCH", body: JSON.stringify({ read_all: true }) });
      return;
    } catch {
      // Try next endpoint
    }
  }

  for (const path of endpoints) {
    try {
      await request(path, { method: "PUT", body: JSON.stringify({ read_all: true }) });
      return;
    } catch {
      // Try next endpoint
    }
  }
}
