const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const TOKEN_KEY = "cd_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new CustomEvent("cd-auth-changed"));
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new CustomEvent("cd-auth-changed"));
}

// Render's free tier spins the backend down when idle, so the first request
// after that can take up to ~60s to wake it back up — the timeout has to be
// generous enough to survive that instead of erroring out on a slow-but-fine request.
const REQUEST_TIMEOUT_MS = 90000;

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("The server is taking too long to respond. Please try again in a moment.");
    }
    throw new Error("Could not reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timeoutId);
  }
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
}

export const api = {
  register: (email, password) =>
    request("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email, password) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  loginWithGoogle: (credential) =>
    request("/api/auth/google", { method: "POST", body: JSON.stringify({ credential }) }),
  me: () => request("/api/auth/me"),
  usage: () => request("/api/usage"),
  createSubscription: () => request("/api/billing/checkout", { method: "POST" }),
  cancelSubscription: () => request("/api/billing/cancel", { method: "POST" }),
  getFavorites: () => request("/api/favorites"),
  deleteFavorite: (id) => request(`/api/favorites/${id}`, { method: "DELETE" })
};
