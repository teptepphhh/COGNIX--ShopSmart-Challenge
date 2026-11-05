const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
// Longer than the server's AI timeout (8s), so the server can answer with its
// fallback first; this only ends the wait if the server itself stops responding.
const REQUEST_TIMEOUT_MS = 15_000;

async function request(path, { timeoutMs = REQUEST_TIMEOUT_MS, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: controller.signal
    });
  } catch (caught) {
    const timedOut = caught.name === 'AbortError';
    const error = new Error(timedOut
      ? 'The ShopSmart server took too long to respond. Please try again.'
      : 'Could not reach the ShopSmart server.');
    error.code = timedOut ? 'TIMEOUT' : 'NETWORK_ERROR';
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message || `Request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.error?.code;
    throw error;
  }
  return data;
}

export const api = {
  getProducts: (query = '') => request(`/products${query ? `?search=${encodeURIComponent(query)}` : ''}`),
  getProduct: (id) => request(`/products/${id}`),
  createOrder: (order) => request('/orders', { method: 'POST', body: JSON.stringify(order) }),
  askAssistant: (question) => request('/assistant/questions', {
    method: 'POST', body: JSON.stringify({ question })
  })
};
