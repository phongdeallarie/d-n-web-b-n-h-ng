const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "shopnow_mysql_token";
const USER_KEY = "shopnow_mysql_user";

export function getApiBase() {
  return API_BASE;
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredAuth(token, user) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiFetch(endpoint, options = {}) {
  const token = options.token ?? getStoredToken();
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data?.message
        ? data.message
        : "Yêu cầu thất bại.";
    throw new Error(message);
  }

  return data;
}
