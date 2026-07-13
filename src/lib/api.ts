// ─────────────────────────────────────────────────────────────────────────────
// API Client — live first with route fallback support
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URLS: string[] = ["https://keydoctors.veewiss.com/api/v1"];

const DEFAULT_WEB_BASE_URLS: string[] = ["https://keydoctors.veewiss.com"];

const API_BASE_OVERRIDE_KEY = "pos_api_base_url";
const TOKEN_KEY = "pos_auth_token";
let activeBaseUrl: string | null = null;

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

// The Vite dev server (vite.config.ts) proxies `/api`, `/business`, `/public`,
// `/uploads`, and `/storage` to `http://localhost:8000` so the browser only
// ever talks to its own origin (no CORS preflight involved). But that only
// helps if we actually request relative paths — a request to the absolute
// `http://localhost:8000/...` URL always goes cross-origin directly and
// depends on the backend sending CORS headers, which it doesn't for every
// route (e.g. `/business/*`). When the effective base still points at the
// same host:port the proxy targets, prefer the relative form so requests
// stay same-origin. A custom remote override (e.g. a staging URL configured
// in Settings) is left untouched since the dev proxy can't reach it anyway.
const DEV_PROXY_TARGET = /^https?:\/\/localhost:8000(\/.*)?$/;

function toDevProxyPath(url: string): string | null {
  if (!import.meta.env.DEV) return null;
  const match = url.match(DEV_PROXY_TARGET);
  if (!match) return null;
  return match[1] ?? "";
}

function getCandidateBaseUrls(): string[] {
  const override = localStorage.getItem(API_BASE_OVERRIDE_KEY)?.trim();
  const preferred = activeBaseUrl ?? override;
  const devProxyPath = toDevProxyPath(preferred ?? DEFAULT_BASE_URLS[0]);

  const all = [
    ...(devProxyPath !== null ? [devProxyPath] : []),
    ...(preferred ? [preferred] : []),
    ...DEFAULT_BASE_URLS,
  ].map(normalizeBaseUrl);

  return [...new Set(all)];
}

function stripApiPath(url: string): string {
  return url
    .replace(/\/public\/api\/v\d+\/?$/, "")
    .replace(/\/api\/v\d+\/?$/, "")
    .replace(/\/public\/?$/, "");
}

function getCandidateWebBaseUrls(): string[] {
  const override = localStorage.getItem(API_BASE_OVERRIDE_KEY)?.trim();
  const preferred = activeBaseUrl ?? override;
  const webBase = preferred ? stripApiPath(preferred) : null;
  const devProxyPath = toDevProxyPath(webBase ?? DEFAULT_WEB_BASE_URLS[0]);

  const all = [
    ...(devProxyPath !== null ? [devProxyPath] : []),
    ...(webBase ? [webBase] : []),
    ...DEFAULT_WEB_BASE_URLS,
  ].map(normalizeBaseUrl);

  return [...new Set(all)];
}

// ── Token storage ──────────────────────────────────────────────────────────────
const OFFLINE_SENTINEL = "__offline__";

export const tokenStorage = {
  // "Remember me" unchecked stores the token in sessionStorage instead of
  // localStorage, so it doesn't survive the browser/app being closed.
  get: (): string | null => localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY),
  getReal: (): string | null => {
    const t = tokenStorage.get();
    return t && t !== OFFLINE_SENTINEL ? t : null;
  },
  set: (t: string, remember = true): void => {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, t);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, t);
      localStorage.removeItem(TOKEN_KEY);
    }
  },
  clear: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  },
  isOffline: (): boolean => tokenStorage.get() === OFFLINE_SENTINEL,
};

// ── Custom errors ──────────────────────────────────────────────────────────────
/** Thrown when the server responds with 401 Unauthenticated. */
export class UnauthenticatedError extends Error {
  constructor() {
    super("Your session has expired. Please log in again.");
    this.name = "UnauthenticatedError";
  }
}

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

/**
 * Thrown for any non-2xx API response that isn't handled by a more specific
 * error class. Carries the real HTTP status so callers (e.g. multiPathCreate's
 * "stop retrying on validation errors" check) can branch on `status` instead
 * of guessing from the message text — a 422 whose message happens not to
 * contain the word "validation" was previously falling through to the next
 * (broken) candidate path instead of surfacing the real error.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
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

  // Laravel validation errors: { message: "...", errors: { field: ["msg"] } }
  if (obj.errors && typeof obj.errors === "object") {
    const fieldErrors = Object.values(obj.errors as Record<string, string[]>);
    const flat = fieldErrors.flat();
    if (flat.length) return flat.join(". ");
  }

  if (typeof obj.message === "string") {
    const msg = obj.message;
    // Surface friendlier messages for common server-side infrastructure errors
    if (msg.includes("Access denied for user") || msg.includes("SQLSTATE[HY000]")) {
      return "Server database error — please try logging out and back in, or contact support.";
    }
    if (msg.includes("SQLSTATE[22007]") || msg.includes("Invalid datetime format")) {
      return "Invalid date/time value — please check your input and try again.";
    }
    return msg;
  }
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
  const isFormDataBody = options.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
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

      // Read Content-Type BEFORE consuming the body — a web base URL may
      // redirect GET /users to the HTML login page (200 text/html), which must
      // not be mistaken for a real JSON success response.
      const contentType = res.headers.get("content-type") ?? "";
      const isHtmlResponse = contentType.includes("text/html") && !contentType.includes("json");

      const data = await res.json().catch(() => ({}));

      // Redirect to login or other HTML page — not real data; try next base URL.
      if (res.ok && isHtmlResponse) {
        allContinuesWereNetworkErrors = false;
        continue;
      }

      if (res.ok) {
        activeBaseUrl = base;
        return { data: data as T, status: res.status, baseUrl: base };
      }

      const message = extractApiMessage(data) ?? `Request failed (${res.status})`;
      lastErrorMessage = message;

      // Session expired — clear token and signal the app to redirect to login.
      if (res.status === 401) {
        allContinuesWereNetworkErrors = false;
        tokenStorage.clear();
        throw new UnauthenticatedError();
      }

      // This is a valid auth response and should not trigger route fallback.
      if (isInvalidCredentialResponse(res.status, data)) {
        allContinuesWereNetworkErrors = false;
        throw new ApiError(message, res.status);
      }

      // Route missing on this base; try next candidate.
      if (looksLikeRouteNotFound(res.status, data)) {
        allContinuesWereNetworkErrors = false; // server is up, just wrong route
        continue;
      }

      // Method not allowed on this base URL (e.g. web route only allows GET but
      // the same path under /api/v1 may support POST/PUT/DELETE).  Try next base.
      if (res.status === 405) {
        allContinuesWereNetworkErrors = false;
        continue;
      }

      // CSRF token required — this is a web route.  The API base URL doesn't
      // use CSRF; try it instead.
      if (res.status === 419) {
        allContinuesWereNetworkErrors = false;
        continue;
      }

      // Rate limited — wait 1.5 s and retry once before giving up.
      if (res.status === 429) {
        allContinuesWereNetworkErrors = false;
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const retryRes = await fetch(`${base}${path}`, { ...options, headers });
        const retryData = await retryRes.json().catch(() => ({}));
        if (retryRes.ok) {
          activeBaseUrl = base;
          return { data: retryData as T, status: retryRes.status, baseUrl: base };
        }
        throw new ApiError(
          extractApiMessage(retryData) ?? "Too many requests — please wait a moment and try again.",
          retryRes.status
        );
      }

      allContinuesWereNetworkErrors = false;
      throw new ApiError(message, res.status);
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

async function sendWithCustomBases<T>(path: string, bases: string[], options: RequestInit = {}): Promise<RequestResult<T>> {
  const token = tokenStorage.get();
  const isFormDataBody = options.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let lastErrorMessage = "Request failed.";
  let allContinuesWereNetworkErrors = true;

  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, { ...options, headers });

      const contentType = res.headers.get("content-type") ?? "";
      const isHtmlResponse = contentType.includes("text/html") && !contentType.includes("json");
      const data = await res.json().catch(() => ({}));

      if (res.ok && isHtmlResponse) {
        allContinuesWereNetworkErrors = false;
        continue;
      }

      if (res.ok) {
        return { data: data as T, status: res.status, baseUrl: base };
      }

      const message = extractApiMessage(data) ?? `Request failed (${res.status})`;
      lastErrorMessage = message;

      if (res.status === 401) {
        allContinuesWereNetworkErrors = false;
        tokenStorage.clear();
        throw new UnauthenticatedError();
      }

      if (isInvalidCredentialResponse(res.status, data)) {
        allContinuesWereNetworkErrors = false;
        throw new ApiError(message, res.status);
      }

      if (looksLikeRouteNotFound(res.status, data)) {
        allContinuesWereNetworkErrors = false;
        continue;
      }

      if (res.status === 405) {
        allContinuesWereNetworkErrors = false;
        continue;
      }

      if (res.status === 419) {
        allContinuesWereNetworkErrors = false;
        continue;
      }

      if (res.status === 429) {
        allContinuesWereNetworkErrors = false;
        throw new ApiError("Too many requests — please wait a moment and try again.", 429);
      }

      allContinuesWereNetworkErrors = false;
      throw new ApiError(message, res.status);
    } catch (err) {
      if (err instanceof Error && err.message) {
        lastErrorMessage = err.message;
      }

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

async function requestWeb<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data, status } = await sendWithCustomBases<T>(path, getCandidateWebBaseUrls(), options);

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
 * POST /send-reset-code
 * Sends a numeric password-reset code to the given email.
 */
export async function apiSendResetCode(email: string): Promise<{ message: string }> {
  const { data, status } = await sendWithFallback<{ message?: string }>("/send-reset-code", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (status !== 200) {
    throw new Error(extractApiMessage(data) ?? "Could not send reset code.");
  }

  return { message: data.message ?? "Reset code sent." };
}

/**
 * POST /verify-reset-code
 * Confirms the code emailed to the user matches and hasn't expired.
 */
export async function apiVerifyResetCode(email: string, code: string): Promise<void> {
  const { data, status } = await sendWithFallback<{ message?: string; error?: string }>("/verify-reset-code", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  if (status !== 200) {
    throw new Error(extractApiMessage(data) ?? "Invalid or expired code.");
  }
}

/**
 * POST /password-reset
 * Sets a new password for the given email. Only call this after
 * `apiVerifyResetCode` has succeeded for the same email — the backend does
 * not re-check the code at this step.
 */
export async function apiResetPassword(email: string, password: string): Promise<{ message: string }> {
  const { data, status } = await sendWithFallback<{ message?: string }>("/password-reset", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (status !== 200) {
    throw new Error(extractApiMessage(data) ?? "Could not reset password.");
  }

  return { message: data.message ?? "Password reset." };
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
    visibility?: Record<string, unknown>;
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
  /** Confirmed live field name from BusinessController@index — the backend
   * returns camelCase `companyName`, not `company_name`. Both are checked. */
  companyName?: string;
  name?: string;
  address?: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  logo?: string;
  /** Confirmed live field name from BusinessController@index — the backend
   * returns `pictureUrl` (a relative upload path), not `logo`. */
  pictureUrl?: string;
  currency?: CurrencyInfo;
}

/**
 * GET /business-profile  — fetch the shop owner's business settings.
 * Tries multiple common endpoint paths used by the backend.
 */
export async function apiGetBusinessProfile(): Promise<ApiBusinessProfile | null> {
  // Try common endpoint paths used by POS backends
  const endpoints = ["/business", "/business-profile", "/settings/business", "/shop"];
  for (const path of endpoints) {
    try {
      const payload = await request<{ data?: ApiBusinessProfile } | ApiBusinessProfile>(path);
      if (payload && typeof payload === "object") {
        const data = (payload as { data?: ApiBusinessProfile }).data ?? (payload as ApiBusinessProfile);
        if (data && (data.company_name || data.companyName || data.name || data.email)) {
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
 * Save updated business settings to the server.
 *
 * Confirmed against the live backend's BusinessController: the update route
 * is `PUT /business/{id}` (an apiResource — NOT a bare `/business`), it
 * expects `companyName`/`phoneNumber`/`pictureUrl` (not the snake_case names
 * this function sent previously), and `pictureUrl` must be an uploaded image
 * file, not a string. The old version POSTed to `/business` first on every
 * save, which hits the *create* endpoint and — since that endpoint has no
 * "does this user already have a business" guard — would have silently
 * created a duplicate business record instead of updating the existing one.
 *
 * `businessId` comes from `store.getBusinessProfile().businessId`, set by
 * `applyBackendBusinessProfile` the first time the profile is fetched. If
 * it's not known yet (a brand-new account with no business at all), this
 * falls back to `POST /business` to create one.
 */
export async function apiSaveBusinessProfile(body: {
  businessId?: number;
  company_name?: string;
  address?: string;
  phone?: string;
  logoFile?: File;
}): Promise<void> {
  const fd = new FormData();
  if (body.company_name) fd.append("companyName", body.company_name);
  if (body.address) fd.append("address", body.address);
  if (body.phone) fd.append("phoneNumber", body.phone);
  if (body.logoFile instanceof File) fd.append("pictureUrl", body.logoFile);

  if (body.businessId) {
    // Laravel can't parse multipart PUT bodies — POST with _method spoofing.
    fd.append("_method", "PUT");
    await request(`/business/${body.businessId}`, { method: "POST", body: fd });
    return;
  }

  await request("/business", { method: "POST", body: fd });
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

export function apiGetWeb<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = params ? `${path}?${new URLSearchParams(params)}` : path;
  return requestWeb<T>(url);
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

function asDashboardSummary(payload: unknown): DashboardSummaryData {
  const obj = (payload && typeof payload === "object") ? (payload as Record<string, unknown>) : {};
  const data = (obj.data && typeof obj.data === "object") ? (obj.data as Record<string, unknown>) : obj;

  return {
    sales: Number(data.sales ?? 0),
    income: Number(data.income ?? 0),
    expense: Number(data.expense ?? 0),
    purchase: Number(data.purchase ?? 0),
  };
}

function asSeriesRows(value: unknown): DashboardSeriesRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const obj = (row && typeof row === "object") ? (row as Record<string, unknown>) : {};
    return {
      date: String(obj.date ?? obj.day ?? obj.label ?? ""),
      amount: Number(obj.amount ?? obj.total ?? obj.value ?? 0),
    };
  });
}

function asDashboardData(payload: unknown): DashboardData {
  const obj = (payload && typeof payload === "object") ? (payload as Record<string, unknown>) : {};
  const data = (obj.data && typeof obj.data === "object") ? (obj.data as Record<string, unknown>) : obj;

  return {
    total_expense: Number(data.total_expense ?? data.expense ?? 0),
    total_income: Number(data.total_income ?? data.income ?? 0),
    total_items: Number(data.total_items ?? data.total_products ?? data.products_count ?? 0),
    total_categories: Number(data.total_categories ?? data.categories_count ?? 0),
    stock_value: Number(data.stock_value ?? 0),
    total_due: Number(data.total_due ?? data.customer_due ?? 0),
    total_profit: Number(data.total_profit ?? data.profit ?? 0),
    total_loss: Number(data.total_loss ?? data.loss ?? 0),
    sales: asSeriesRows(data.sales ?? data.sales_series),
    purchases: asSeriesRows(data.purchases ?? data.purchase ?? data.purchases_series),
  };
}

export async function apiGetSummary(date?: string): Promise<DashboardSummaryData> {
  const params = date ? { date } : undefined;
  // /business/summary is PUT/PATCH-only on the live backend (405 on GET) —
  // /summary is the one that actually answers this request, tried first.
  const endpoints = ["/summary", "/business/summary"];

  for (const path of endpoints) {
    try {
      const payload = await apiGet<unknown>(path, params);
      return asDashboardSummary(payload);
    } catch {
      // Try next endpoint
    }
  }

  throw new Error("Could not load dashboard summary from backend.");
}

export async function apiGetDashboard(
  duration: string = "current_month",
  fromDate?: string,
  toDate?: string
): Promise<DashboardData> {
  const params: Record<string, string> = { duration };
  if (fromDate) params.from_date = fromDate;
  if (toDate) params.to_date = toDate;

  // /business/dashboard is PUT/PATCH-only on the live backend (405 on GET) —
  // /dashboard is the one that actually answers this request, tried first.
  const endpoints = ["/dashboard", "/business/dashboard"];
  for (const path of endpoints) {
    try {
      const payload = await apiGet<unknown>(path, params);
      return asDashboardData(payload);
    } catch {
      // Try next endpoint
    }
  }

  throw new Error("Could not load dashboard data from backend.");
}

// ─────────────────────────────────────────────────────────────────────────────
// HRM field helpers
// ─────────────────────────────────────────────────────────────────────────────

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/** Convert a single snake_case key to camelCase, e.g. start_time → startTime */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Normalise a raw backend object:
 *  – keys: snake_case → camelCase
 *  – id / *_id values: coerced to string so they match our `{ id: string }` constraint
 */
function normalizeCamelCase<T>(item: unknown): T {
  if (!item || typeof item !== "object" || Array.isArray(item)) return item as T;
  const obj = item as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    if (value !== undefined && value !== null && (camelKey === "id" || camelKey.endsWith("Id"))) {
      result[camelKey] = String(value);
    } else {
      result[camelKey] = value;
    }
  }
  return result as T;
}

function hrmToSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip empty optional fields so they don't override backend defaults
    if (value === undefined || value === null || value === "") continue;
    let coerced: unknown = value;
    if (typeof value === "string") {
      // Payroll month: "YYYY-MM" → "YYYY-MM-01" (MySQL DATE column needs full date)
      if (key === "month" && /^\d{4}-\d{2}$/.test(value)) {
        coerced = `${value}-01`;
      }
      // Time fields: "HH:MM" → "HH:MM:SS" for MySQL TIME column strict compatibility
      else if (/^\d{2}:\d{2}$/.test(value)) {
        coerced = `${value}:00`;
      }
    }
    result[toSnakeCase(key)] = coerced;
  }
  return result;
}

// HRM API list helper
// ─────────────────────────────────────────────────────────────────────────────

function normalizeListData<T>(payload: unknown): T[] {
  let raw: unknown[] = [];

  if (!payload) return [];
  if (Array.isArray(payload)) {
    raw = payload;
  } else if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      raw = obj.data;
    } else if (obj.data && typeof obj.data === "object") {
      const nested = obj.data as Record<string, unknown>;
      if (Array.isArray(nested.data)) raw = nested.data;
    }
  }

  return raw.map((item) => normalizeCamelCase<T>(item));
}

export async function apiListHrmResource<T>(resource: string): Promise<T[]> {
  const payload = await apiGet<unknown>(`/hrm/${resource}`);
  return normalizeListData<T>(payload);
}

function normalizeHrmItem<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const raw = (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data))
    ? obj.data as Record<string, unknown>
    : obj;
  return normalizeCamelCase<T>(raw);
}

export async function apiCreateHrmResource<T>(resource: string, data: Partial<T>): Promise<T | null> {
  const snakeData = hrmToSnakeCase(data as Record<string, unknown>);
  const payload = await apiPost<unknown>(`/hrm/${resource}`, snakeData);
  return normalizeHrmItem<T>(payload);
}

export async function apiUpdateHrmResource<T>(resource: string, id: string, data: Partial<T>): Promise<T | null> {
  const snakeData = hrmToSnakeCase(data as Record<string, unknown>);
  const payload = await apiPut<unknown>(`/hrm/${resource}/${id}`, snakeData);
  return normalizeHrmItem<T>(payload);
}

export async function apiDeleteHrmResource(resource: string, id: string): Promise<void> {
  await apiDelete(`/hrm/${resource}/${id}`);
}

function buildHrmFormData(data: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    // Skip null, undefined, and empty strings (optional fields left blank)
    if (value === undefined || value === null || value === "") continue;
    const snakeKey = toSnakeCase(key);
    if (value instanceof File) {
      fd.append(snakeKey, value);
    } else if (typeof value === "string" && /^\d{2}:\d{2}$/.test(value)) {
      // HH:MM → HH:MM:SS for MySQL TIME columns
      fd.append(snakeKey, `${value}:00`);
    } else {
      fd.append(snakeKey, String(value));
    }
  }
  return fd;
}

export async function apiCreateHrmResourceForm<T>(resource: string, data: Record<string, unknown>): Promise<T | null> {
  const fd = buildHrmFormData(data);
  const payload = await request<unknown>(`/hrm/${resource}`, { method: "POST", body: fd });
  return normalizeHrmItem<T>(payload);
}

export async function apiUpdateHrmResourceForm<T>(resource: string, id: string, data: Record<string, unknown>): Promise<T | null> {
  const fd = buildHrmFormData(data);
  fd.append("_method", "PUT");
  const payload = await request<unknown>(`/hrm/${resource}/${id}`, { method: "POST", body: fd });
  return normalizeHrmItem<T>(payload);
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

// ─────────────────────────────────────────────────────────────────────────────
// Product CRUD API
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiProductBody {
  productName: string;
  productCode?: string;
  product_type?: "single" | "variant" | "combo";
  vat_type?: "inclusive" | "exclusive";
  vat_id?: string | null;
  category_id?: string | null;
  brand_id?: string | null;
  unit_id?: string | null;
  branch_id?: string | null;
  alert_qty?: number;
  productManufacturer?: string;
  productSalePrice?: number;
  productPurchasePrice?: number;
  productRetailPrice?: number;
  productWholeSalePrice?: number;
  productDealerPrice?: number;
  productStock?: number;
  productPicture?: File | string | null;
  stocks?: Array<{
    stock_id?: string | number;
    warehouse_id?: string | number | null;
    batch_no?: string | null;
    productStock?: number;
    exclusive_price?: number;
    inclusive_price?: number;
    profit_percent?: number;
    productSalePrice?: number;
    productRetailPrice?: number;
    productWholeSalePrice?: number;
    productDealerPrice?: number;
    mfg_date?: string | null;
    expire_date?: string | null;
  }>;
}

function buildProductRequestBody(body: ApiProductBody): FormData {
  const formData = new FormData();

  // Backend contract from AcnooProductController expects these canonical keys.
  const scalarEntries: Array<[string, string | number | null | undefined]> = [
    ["productName", body.productName],
    ["productCode", body.productCode],
    ["product_type", body.product_type ?? "single"],
    ["vat_type", body.vat_type ?? "exclusive"],
    ["vat_id", body.vat_id],
    ["category_id", body.category_id],
    ["brand_id", body.brand_id],
    ["unit_id", body.unit_id],
    ["branch_id", body.branch_id],
    ["alert_qty", body.alert_qty],
    ["productManufacturer", body.productManufacturer],
    ["productSalePrice", body.productSalePrice],
    ["productPurchasePrice", body.productPurchasePrice],
    ["productWholeSalePrice", body.productWholeSalePrice],
    ["productDealerPrice", body.productDealerPrice],
    ["productStock", body.productStock],
  ];

  for (const [key, value] of scalarEntries) {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, String(value));
    }
  }

  if (body.stocks?.length) {
    const normalizedStocks = body.stocks.map((stock) => {
      // Build a clean object — drop undefined keys entirely so JSON.stringify
      // does not emit "warehouse_id":null for stocks that have no warehouse at all,
      // while still emitting a numeric id when one is available.
      const entry: Record<string, unknown> = {
        productStock: stock.productStock ?? 0,
        exclusive_price: stock.exclusive_price ?? 0,
        inclusive_price: stock.inclusive_price ?? (stock.productSalePrice ?? 0),
        profit_percent: stock.profit_percent ?? 0,
        productSalePrice: stock.productSalePrice ?? 0,
        productWholeSalePrice: stock.productWholeSalePrice ?? 0,
        productDealerPrice: stock.productDealerPrice ?? 0,
      };
      // Only include optional keyed fields when they have meaningful values.
      if (stock.stock_id !== undefined && stock.stock_id !== null) entry.stock_id = stock.stock_id;
      if (stock.warehouse_id !== undefined && stock.warehouse_id !== null) entry.warehouse_id = stock.warehouse_id;
      if (stock.batch_no) entry.batch_no = stock.batch_no;
      if (stock.mfg_date) entry.mfg_date = stock.mfg_date;
      if (stock.expire_date) entry.expire_date = stock.expire_date;
      return entry;
    });

    // Controller decodes JSON string for stocks.
    formData.append("stocks", JSON.stringify(normalizedStocks));
  }

  if (body.productPicture instanceof File) {
    formData.append("productPicture", body.productPicture);
  }

  return formData;
}

/**
 * Create a new product on the backend via /api/v1/products endpoint.
 * Returns the raw server response (we re-sync after to get real IDs).
 */
export async function apiCreateProduct(body: ApiProductBody): Promise<unknown> {
  let lastErr: Error | null = null;
  const requestBody = buildProductRequestBody(body);
  for (const path of [
    "/products",
  ]) {
    try {
      return await request<unknown>(path, { method: "POST", body: requestBody });
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      // Stop immediately for auth / validation errors — retrying won't help.
      const msg = lastErr.message.toLowerCase();
      if (
        msg.includes("unauthenticated") ||
        msg.includes("unauthorized") ||
        msg.includes("forbidden") ||
        msg.includes("invalid email") ||
        msg.includes("validation") ||
        (msg.includes("422"))
      ) {
        throw lastErr;
      }
      // For all other errors (wrong route, network error, etc.) try next path.
    }
  }
  throw lastErr ?? new Error("Could not create product — no valid endpoint responded.");
}

/**
 * Update an existing product on the backend via /api/v1/products endpoint.
 */
export async function apiUpdateProduct(id: string, body: ApiProductBody): Promise<unknown> {
  const requestBody = buildProductRequestBody(body);
  // Laravel cannot parse multipart PUT/PATCH. Use POST + _method spoofing instead.
  requestBody.append("_method", "PUT");
  return request<unknown>(`/products/${id}`, { method: "POST", body: requestBody });
}

/**
 * Delete a product on the backend.
 */
export async function apiDeleteProduct(id: string): Promise<void> {
  let lastErr: Error | null = null;
  for (const path of [
    `/products/${id}`,
  ]) {
    try {
      await request<unknown>(path, { method: "DELETE" });
      return;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const msg = lastErr.message.toLowerCase();
      if (
        msg.includes("unauthenticated") || msg.includes("unauthorized") ||
        msg.includes("forbidden") || msg.includes("validation") || msg.includes("422")
      ) {
        throw lastErr;
      }
    }
  }
  throw lastErr ?? new Error("Could not delete product — no valid endpoint responded.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Sale CRUD API
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiSaleProduct {
  product_id: string;
  stock_id: string;
  quantities: number;
  price: number;
  discount?: number;
  product_name?: string;
}

export interface ApiSaleBody {
  party_id?: string | null;
  vat_id?: string | null;
  branch_id?: string | null;
  products: ApiSaleProduct[];
  payments: Array<{ type: string; amount: number; reference_id?: string }>;
  saleDate: string;
  totalAmount: number;
  dueAmount: number;
  paidAmount: number;
  isPaid: boolean;
  discountAmount: number;
  note?: string;
}

export async function apiCreateSale(body: ApiSaleBody): Promise<unknown> {
  const formData = new FormData();
  if (body.party_id) formData.append("party_id", body.party_id);
  if (body.vat_id) formData.append("vat_id", body.vat_id);
  if (body.branch_id) formData.append("branch_id", body.branch_id);
  formData.append("products", JSON.stringify(body.products));
  formData.append("payments", JSON.stringify(body.payments));
  formData.append("saleDate", body.saleDate);
  formData.append("totalAmount", String(body.totalAmount));
  formData.append("dueAmount", String(body.dueAmount));
  formData.append("paidAmount", String(body.paidAmount));
  formData.append("isPaid", body.isPaid ? "1" : "0");
  formData.append("discountAmount", String(body.discountAmount));
  if (body.note) formData.append("note", body.note);

  return request<unknown>("/sales", { method: "POST", body: formData });
}

export async function apiDeleteSale(id: string): Promise<void> {
  await request<unknown>(`/sales/${id}`, { method: "DELETE" });
}

export async function apiUpdateSale(
  id: string,
  body: {
    party_id?: string | null;
    saleDate?: string;
    products: Array<{
      product_id: string;
      stock_id: string;
      quantities: number;
      price: number;
      discount: number;
      product_name: string;
    }>;
    payments?: Array<{ type: string; amount: number }>;
    discountAmount?: number;
    totalAmount?: number;
    paidAmount?: number;
    dueAmount?: number;
    note?: string;
  }
): Promise<unknown> {
  const fd = new FormData();
  // Only send party_id when it's a real registered-customer ID — sending null/empty
  // for walk-in customers causes the backend to crash on party due recalculation.
  if (body.party_id) fd.append("party_id", body.party_id);
  if (body.saleDate) fd.append("saleDate", body.saleDate);
  fd.append("products", JSON.stringify(body.products));
  fd.append("payments", JSON.stringify(body.payments ?? []));
  if (body.discountAmount !== undefined) fd.append("discountAmount", String(body.discountAmount));
  if (body.totalAmount !== undefined) fd.append("totalAmount", String(body.totalAmount));
  if (body.paidAmount !== undefined) fd.append("paidAmount", String(body.paidAmount));
  if (body.dueAmount !== undefined) fd.append("dueAmount", String(body.dueAmount));
  if (body.note !== undefined) fd.append("note", body.note);
  fd.append("_method", "PUT");
  return request<unknown>(`/sales/${id}`, { method: "POST", body: fd });
}

// ─────────────────────────────────────────────────────────────────────────────
// Purchase CRUD API
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiPurchaseProduct {
  product_id: string;
  quantities: number;
  productPurchasePrice: number;
  productSalePrice: number;
  productWholeSalePrice?: number;
  productDealerPrice?: number;
  batch_no?: string | null;
  profit_percent?: number;
  mfg_date?: string | null;
  expire_date?: string | null;
}

export interface ApiPurchaseBody {
  party_id: string;
  vat_id?: string | null;
  branch_id?: string | null;
  products: ApiPurchaseProduct[];
  payments: Array<{ type: string; amount: number; reference_id?: string }>;
  purchaseDate: string;
  totalAmount: number;
  subtotal: number;
  discountAmount: number;
  dueAmount: number;
  paidAmount: number;
}

export async function apiCreatePurchase(body: ApiPurchaseBody): Promise<unknown> {
  return request<unknown>("/purchase", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiDeletePurchase(id: string): Promise<void> {
  await request<unknown>(`/purchase/${id}`, { method: "DELETE" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sale Return API
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiSaleReturnBody {
  sale_id: string;
  return_qty: number[];
  payments?: Array<{ type: string; amount: number }>;
}

export async function apiCreateSaleReturn(body: ApiSaleReturnBody): Promise<unknown> {
  return request<unknown>("/sales-return", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Return API
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiPurchaseReturnBody {
  purchase_id: string;
  return_qty: number[];
  payments?: Array<{ type: string; amount: number }>;
}

export async function apiCreatePurchaseReturn(body: ApiPurchaseReturnBody): Promise<unknown> {
  return request<unknown>("/purchases-return", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Categories API
// ─────────────────────────────────────────────────────────────────────────────

export async function apiCreateCategory(name: string): Promise<unknown> {
  return request<unknown>("/categories", {
    method: "POST",
    body: JSON.stringify({ categoryName: name }),
  });
}

export async function apiUpdateCategory(id: string, name: string): Promise<unknown> {
  return request<unknown>(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify({ categoryName: name }),
  });
}

export async function apiDeleteCategory(id: string): Promise<void> {
  await request<unknown>(`/categories/${id}`, { method: "DELETE" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Brands API
// ─────────────────────────────────────────────────────────────────────────────

export async function apiCreateBrand(name: string): Promise<unknown> {
  return request<unknown>("/brands", {
    method: "POST",
    body: JSON.stringify({ brandName: name }),
  });
}

export async function apiUpdateBrand(id: string, name: string): Promise<unknown> {
  return request<unknown>(`/brands/${id}`, {
    method: "PUT",
    body: JSON.stringify({ brandName: name }),
  });
}

export async function apiDeleteBrand(id: string): Promise<void> {
  await request<unknown>(`/brands/${id}`, { method: "DELETE" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Parties (Customers & Suppliers) API
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiPartyBody {
  name: string;
  type: "Retailer" | "Wholesaler" | "Dealer" | "Supplier";
  phone?: string;
  email?: string;
  address?: string;
  opening_balance?: number;
  opening_balance_type?: "due" | "advance";
  credit_limit?: number;
}

export async function apiCreateParty(body: ApiPartyBody): Promise<unknown> {
  return request<unknown>("/parties", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiUpdateParty(id: string, body: ApiPartyBody): Promise<unknown> {
  return request<unknown>(`/parties/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function apiDeleteParty(id: string): Promise<void> {
  await request<unknown>(`/parties/${id}`, { method: "DELETE" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Expense Categories API
// ─────────────────────────────────────────────────────────────────────────────

export async function apiCreateExpenseCategory(name: string): Promise<unknown> {
  return request<unknown>("/expense-categories", {
    method: "POST",
    body: JSON.stringify({ categoryName: name }),
  });
}

export async function apiUpdateExpenseCategory(id: string, name: string): Promise<unknown> {
  return request<unknown>(`/expense-categories/${id}`, {
    method: "PUT",
    body: JSON.stringify({ categoryName: name }),
  });
}

export async function apiDeleteExpenseCategory(id: string): Promise<void> {
  await request<unknown>(`/expense-categories/${id}`, { method: "DELETE" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Income Categories API
// ─────────────────────────────────────────────────────────────────────────────

export async function apiCreateIncomeCategory(name: string): Promise<unknown> {
  return request<unknown>("/income-categories", {
    method: "POST",
    body: JSON.stringify({ categoryName: name }),
  });
}

export async function apiUpdateIncomeCategory(id: string, name: string): Promise<unknown> {
  return request<unknown>(`/income-categories/${id}`, {
    method: "PUT",
    body: JSON.stringify({ categoryName: name }),
  });
}

export async function apiDeleteIncomeCategory(id: string): Promise<void> {
  await request<unknown>(`/income-categories/${id}`, { method: "DELETE" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Expenses API
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiExpenseBody {
  expense_category_id: string;
  amount: number;
  expanseFor?: string;
  referenceNo?: string;
  note?: string;
  payments: Array<{ type: string; amount: number }>;
}

export async function apiCreateExpense(body: ApiExpenseBody): Promise<unknown> {
  return request<unknown>("/expenses", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Income API
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiIncomeBody {
  income_category_id: string;
  amount: number;
  incomeFor?: string;
  referenceNo?: string;
  note?: string;
  payments: Array<{ type: string; amount: number }>;
}

export async function apiCreateIncome(body: ApiIncomeBody): Promise<unknown> {
  return request<unknown>("/incomes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Due Collection API
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiCollectDueBody {
  party_id: string;
  paymentDate: string;
  payDueAmount: number;
  payments: Array<{ type: string; amount: number }>;
}

export async function apiCollectDue(body: ApiCollectDueBody): Promise<unknown> {
  return request<unknown>("/dues", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Reports API
// ─────────────────────────────────────────────────────────────────────────────

export async function apiGetLossProfit(duration?: string, fromDate?: string, toDate?: string): Promise<unknown> {
  const params = new URLSearchParams();
  if (duration) params.set("duration", duration);
  if (fromDate) params.set("from_date", fromDate);
  if (toDate) params.set("to_date", toDate);
  const q = params.toString();
  return request<unknown>(`/reports/loss-profit${q ? `?${q}` : ""}`);
}

export async function apiGetCashflow(duration?: string, fromDate?: string, toDate?: string): Promise<unknown> {
  const params = new URLSearchParams();
  if (duration) params.set("duration", duration);
  if (fromDate) params.set("from_date", fromDate);
  if (toDate) params.set("to_date", toDate);
  const q = params.toString();
  return request<unknown>(`/reports/cashflow${q ? `?${q}` : ""}`);
}

export async function apiGetTaxReport(duration?: string, fromDate?: string, toDate?: string): Promise<unknown> {
  const params = new URLSearchParams();
  if (duration) params.set("duration", duration);
  if (fromDate) params.set("from_date", fromDate);
  if (toDate) params.set("to_date", toDate);
  const q = params.toString();
  return request<unknown>(`/reports/tax${q ? `?${q}` : ""}`);
}

export async function apiGetBillWiseProfit(duration?: string, fromDate?: string, toDate?: string): Promise<unknown> {
  const params = new URLSearchParams();
  if (duration) params.set("duration", duration);
  if (fromDate) params.set("from_date", fromDate);
  if (toDate) params.set("to_date", toDate);
  const q = params.toString();
  return request<unknown>(`/reports/bill-wise-profit${q ? `?${q}` : ""}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Units API
// ─────────────────────────────────────────────────────────────────────────────

export async function apiCreateUnit(unitName: string): Promise<unknown> {
  return request<unknown>("/units", {
    method: "POST",
    body: JSON.stringify({ unitName }),
  });
}

export async function apiUpdateUnit(id: string, unitName: string): Promise<unknown> {
  return request<unknown>(`/units/${id}`, {
    method: "PUT",
    body: JSON.stringify({ unitName }),
  });
}

export async function apiDeleteUnit(id: string): Promise<unknown> {
  return request<unknown>(`/units/${id}`, { method: "DELETE" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile Push Token API
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiPushTokenPayload {
  token: string;
  platform: "android" | "ios" | "web";
  device_name?: string;
  app_version?: string;
}

export async function apiRegisterPushToken(payload: ApiPushTokenPayload): Promise<void> {
  const endpoints = ["/push/tokens", "/notifications/tokens", "/device-tokens"];

  for (const path of endpoints) {
    try {
      await request(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return;
    } catch {
      // Try next endpoint.
    }
  }
}

export async function apiUnregisterPushToken(token: string): Promise<void> {
  if (!token) return;

  const endpoints = ["/push/tokens", "/notifications/tokens", "/device-tokens"];

  for (const path of endpoints) {
    try {
      await request(path, {
        method: "DELETE",
        body: JSON.stringify({ token }),
      });
      return;
    } catch {
      // Try next endpoint.
    }
  }
}

export interface ApiSendPushPayload {
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  user_ids?: number[];
}

export interface ApiSendPushResult {
  total_tokens: number;
  success: number;
  failure: number;
}

export async function apiSendPushNotification(payload: ApiSendPushPayload): Promise<ApiSendPushResult | null> {
  const endpoints = ["/push/send", "/notifications/send", "/push/dispatch"];

  for (const path of endpoints) {
    try {
      const response = await request<{ data?: ApiSendPushResult } | ApiSendPushResult>(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response && typeof response === "object" && "data" in response) {
        return (response as { data?: ApiSendPushResult }).data ?? null;
      }

      return response as ApiSendPushResult;
    } catch {
      // Try next endpoint.
    }
  }

  throw new Error("Unable to send push notification.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-path CRUD helpers (branch / warehouse / transfer / branch-role)
// ─────────────────────────────────────────────────────────────────────────────

function toSnakeCaseBody(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === "") continue;
    result[key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)] = value;
  }
  return result;
}

export function normalizeResponseItem<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const raw =
    obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)
      ? (obj.data as Record<string, unknown>)
      : obj;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    if (value !== null && value !== undefined && (camelKey === "id" || camelKey.endsWith("Id"))) {
      result[camelKey] = String(value);
    } else if (camelKey === "status") {
      if (value === 0 || value === "0" || value === false ||
          (typeof value === "string" && value.toLowerCase() === "inactive")) {
        result[camelKey] = "Inactive";
      } else if (value === 1 || value === "1" || value === true ||
          (typeof value === "string" && value.toLowerCase() === "active")) {
        result[camelKey] = "Active";
      } else {
        result[camelKey] = value;
      }
    } else {
      result[camelKey] = value;
    }
  }
  return result as T;
}

// Stop retrying other candidate paths once we get a response that means
// "this endpoint is real but the request itself was rejected" — retrying a
// different guessed path won't fix a validation error or an auth failure.
// Checked via the real HTTP status (ApiError.status) rather than guessing
// from message text, since a 422's message doesn't always contain the word
// "validation" (e.g. "The status field must be true or false.").
function isNonRetryableApiError(e: unknown): boolean {
  if (e instanceof ApiError) {
    return e.status === 401 || e.status === 403 || e.status === 422;
  }
  if (e instanceof Error) {
    const msg = e.message.toLowerCase();
    return msg.includes("unauthenticated") || msg.includes("unauthorized") || msg.includes("forbidden") || msg.includes("validation");
  }
  return false;
}

async function multiPathCreate<T>(paths: string[], data: Record<string, unknown>): Promise<T | null> {
  const body = toSnakeCaseBody(data);
  let lastErr: Error | null = null;
  for (const path of paths) {
    try {
      const payload = await apiPost<unknown>(path, body);
      return normalizeResponseItem<T>(payload);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      // Only stop retrying on auth errors — a 422 on one path may just mean a different schema;
      // keep trying other candidate paths before giving up.
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) throw lastErr;
    }
  }
  throw lastErr ?? new Error("No endpoint responded.");
}

async function multiPathUpdate<T>(basePaths: string[], id: string, data: Record<string, unknown>): Promise<T | null> {
  const body = toSnakeCaseBody(data);
  let lastErr: Error | null = null;
  for (const base of basePaths) {
    try {
      const payload = await apiPut<unknown>(`${base}/${id}`, body);
      return normalizeResponseItem<T>(payload);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) throw lastErr;
    }
  }
  throw lastErr ?? new Error("No endpoint responded.");
}

async function multiPathDelete(basePaths: string[], id: string): Promise<void> {
  let lastErr: Error | null = null;
  for (const base of basePaths) {
    try {
      await apiDelete(`${base}/${id}`);
      return;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      const msg = lastErr.message.toLowerCase();
      if (msg.includes("unauthenticated") || msg.includes("unauthorized") || msg.includes("forbidden")) throw lastErr;
    }
  }
  if (lastErr) throw lastErr;
}

// ── Branch CRUD ───────────────────────────────────────────────────────────────
// Confirmed working path first — /multibranch/* and /business/* dead-end to
// login redirects/404s for this bearer-token client and only waste a round
// trip before falling through.
export const BRANCH_API_PATHS = ["/branches", "/hrm/branches", "/multibranch/branches", "/business/branches"];
export function apiGetBranches(): Promise<unknown> {
  return (async () => {
    for (const path of BRANCH_API_PATHS) {
      try { return await apiGet<unknown>(path); } catch { /* try next */ }
    }
    return null;
  })();
}
export function apiCreateBranch<T>(data: Record<string, unknown>): Promise<T | null> { return multiPathCreate<T>(BRANCH_API_PATHS, data); }
export function apiUpdateBranch<T>(id: string, data: Record<string, unknown>): Promise<T | null> { return multiPathUpdate<T>(BRANCH_API_PATHS, id, data); }
export function apiDeleteBranch(id: string): Promise<void> { return multiPathDelete(BRANCH_API_PATHS, id); }

// ── Warehouse CRUD ────────────────────────────────────────────────────────────
export const WAREHOUSE_API_PATHS = ["/warehouses", "/hrm/warehouses", "/multibranch/warehouses", "/business/warehouses"];
export function apiCreateWarehouse<T>(data: Record<string, unknown>): Promise<T | null> { return multiPathCreate<T>(WAREHOUSE_API_PATHS, data); }
export function apiUpdateWarehouse<T>(id: string, data: Record<string, unknown>): Promise<T | null> { return multiPathUpdate<T>(WAREHOUSE_API_PATHS, id, data); }
export function apiDeleteWarehouse(id: string): Promise<void> { return multiPathDelete(WAREHOUSE_API_PATHS, id); }

// ── Branch Stock (confirmed live contract — /branch-stock is a single,
// known-correct endpoint, not a path-guessing group like the ones above) ──────
export interface ApiBranchStockBody {
  product_id?: number;
  productStock?: number;
  productPurchasePrice?: number;
  productSalePrice?: number;
  productWholeSalePrice?: number;
  productDealerPrice?: number;
  profit_percent?: number;
  batch_no?: string;
  mfg_date?: string;
  expire_date?: string;
  warehouse_id?: number;
}

export async function apiGetBranchStock(branchId: string, warehouseId?: string): Promise<unknown> {
  const params: Record<string, string> = { branch_id: branchId };
  if (warehouseId) params.warehouse_id = warehouseId;
  return apiGet<unknown>("/branch-stock", params);
}

/** Add an existing catalog product to a branch's stock (increments if that
 * product/batch already has a row there — safe to call repeatedly). */
export async function apiAddBranchStock(branchId: string, body: ApiBranchStockBody): Promise<unknown> {
  return apiPost<unknown>(`/branch-stock?branch_id=${encodeURIComponent(branchId)}`, body);
}

export async function apiUpdateBranchStock(stockId: string, branchId: string, body: ApiBranchStockBody): Promise<unknown> {
  return apiPut<unknown>(`/branch-stock/${stockId}?branch_id=${encodeURIComponent(branchId)}`, body);
}

export async function apiDeleteBranchStock(stockId: string, branchId: string): Promise<void> {
  await apiDelete<unknown>(`/branch-stock/${stockId}?branch_id=${encodeURIComponent(branchId)}`);
}

// ── Stock Transfer CRUD ───────────────────────────────────────────────────────
export const TRANSFER_API_PATHS = ["/transfers", "/multibranch/transfers", "/stock-transfers", "/hrm/transfers"];
export function apiCreateTransfer<T>(data: Record<string, unknown>): Promise<T | null> { return multiPathCreate<T>(TRANSFER_API_PATHS, data); }
export function apiUpdateTransfer<T>(id: string, data: Record<string, unknown>): Promise<T | null> { return multiPathUpdate<T>(TRANSFER_API_PATHS, id, data); }
export function apiDeleteTransfer(id: string): Promise<void> { return multiPathDelete(TRANSFER_API_PATHS, id); }

// ── Branch Role CRUD ──────────────────────────────────────────────────────────
export const BRANCH_ROLE_API_PATHS = ["/branch-roles", "/multibranch/roles", "/multibranch/branch-roles", "/hrm/branch-roles", "/roles"];
export function apiCreateBranchRole<T>(data: Record<string, unknown>): Promise<T | null> { return multiPathCreate<T>(BRANCH_ROLE_API_PATHS, data); }
export function apiUpdateBranchRole<T>(id: string, data: Record<string, unknown>): Promise<T | null> { return multiPathUpdate<T>(BRANCH_ROLE_API_PATHS, id, data); }
export function apiDeleteBranchRole(id: string): Promise<void> { return multiPathDelete(BRANCH_ROLE_API_PATHS, id); }

// ── Branch-scoped Users ───────────────────────────────────────────────────────
// `visibility` inner permission keys must stay camelCase — do NOT run them
// through toSnakeCaseBody, only the outer body keys get snake_cased.

const USER_API_PATHS = ["/users", "/business/users", "/multibranch/users", "/hrm/users", "/staff"];

export async function apiGetUsers(): Promise<unknown> {
  for (const path of USER_API_PATHS) {
    try {
      const payload = await apiGet<unknown>(path);
      // Reject empty / non-list payloads so we try the next path
      if (payload && typeof payload === "object") {
        const obj = payload as Record<string, unknown>;
        const hasData =
          (Array.isArray(obj.data) && (obj.data as unknown[]).length > 0) ||
          (Array.isArray(payload) && (payload as unknown[]).length > 0) ||
          (obj.data && typeof obj.data === "object" &&
            Array.isArray((obj.data as Record<string, unknown>).data) &&
            ((obj.data as Record<string, unknown>).data as unknown[]).length > 0);
        if (hasData) return payload;
      }
    } catch { /* try next */ }
  }
  // Last-resort fallback — return whatever /users gives (even empty)
  return apiGet<unknown>("/users").catch(() => ({ data: [] }));
}

export async function apiCreateUser<T>(body: Record<string, unknown>): Promise<T | null> {
  for (const path of USER_API_PATHS) {
    try {
      const raw = await apiPost<unknown>(path, body);
      return normalizeResponseItem<T>(raw);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      // Stop immediately for auth / validation failures — retrying won't fix them.
      if (e instanceof ApiError && (e.status === 422 || e.status === 403 || e.status === 401)) throw e;
      if (e instanceof UnauthenticatedError) throw e;
    }
  }
  throw new Error("Could not create user — no valid endpoint responded.");
}

export async function apiUpdateUser<T>(id: string, body: Record<string, unknown>): Promise<T | null> {
  for (const path of USER_API_PATHS) {
    try {
      const raw = await apiPut<unknown>(`${path}/${id}`, body);
      return normalizeResponseItem<T>(raw);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      if (e instanceof ApiError && (e.status === 422 || e.status === 403 || e.status === 401)) throw e;
      if (e instanceof UnauthenticatedError) throw e;
    }
  }
  throw new Error("Could not update user — no valid endpoint responded.");
}

export async function apiDeleteUser(id: string): Promise<void> {
  for (const path of USER_API_PATHS) {
    try {
      await apiDelete<void>(`${path}/${id}`);
      return;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      if (e instanceof ApiError && (e.status === 403 || e.status === 401)) throw e;
      if (e instanceof UnauthenticatedError) throw e;
    }
  }
  throw new Error("Could not delete user — no valid endpoint responded.");
}
