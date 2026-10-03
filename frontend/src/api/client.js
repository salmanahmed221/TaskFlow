/**
 * Tiny fetch wrapper for the TaskFlow API.
 * - Prefixes every path with /api
 * - Attaches the JWT from localStorage
 * - Turns API errors into thrown Error objects with .status
 * - On 401: clears the token and bounces the user to /login
 */

const TOKEN_KEY = "taskflow_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function api(path, { method = "GET", body, query } = {}) {
  const qs = query
    ? "?" +
      new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined && v !== "")
      ).toString()
    : "";

  const res = await fetch(`/api${path}${qs}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (res.status === 401 && getToken() && !path.startsWith("/auth/")) {
    clearToken();
    window.location.href = "/login";
  }

  if (!res.ok) {
    const error = new Error(json?.message || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }

  return json;
}
