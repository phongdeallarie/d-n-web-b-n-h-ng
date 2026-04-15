const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

export function getToken() {
  return localStorage.getItem("shop_token") || "";
}

export function setToken(token) {
  if (token) localStorage.setItem("shop_token", token);
  else localStorage.removeItem("shop_token");
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage = typeof data === "object" && data?.message ? data.message : "Có lỗi xảy ra.";
    throw new Error(errorMessage);
  }

  return data;
}

export { API_BASE_URL };
