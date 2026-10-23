/**
 * ARTFIT API client and storage utilities
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const SESSION_KEY = "artfit-user-session";
const CART_KEY = "artfit-cart";
const WISHLIST_KEY = "artfit-wishlist";

// ==================== SESSION STORAGE ====================
export function getSavedSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session && session.user && session.token) {
      return session;
    }
    return null;
  } catch (err) {
    console.error("Could not parse saved session:", err);
    return null;
  }
}

export function saveSession(token, user) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
  } catch (err) {
    console.error("Could not save session to localStorage:", err);
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (err) {
    console.error("Could not clear session:", err);
  }
}

// ==================== CART STORAGE ====================
export function getSavedCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (err) {
    console.error("Could not save cart:", err);
  }
}

// ==================== WISHLIST STORAGE ====================
export function getSavedWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWishlist(wishlist) {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  } catch (err) {
    console.error("Could not save wishlist:", err);
  }
}

// ==================== URL FORMATTING ====================
export function getImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

// ==================== UNIFIED FETCH WRAPPER ====================
export async function apiRequest(endpoint, options = {}) {
  const session = getSavedSession();
  const token = session?.token;

  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json().catch(() => ({}));
  } else {
    const text = await response.text().catch(() => "");
    data = { message: text };
  }

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
