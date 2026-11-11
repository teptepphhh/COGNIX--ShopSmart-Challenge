const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// LAB 6 fix: fetch() rejects with a bare "Failed to fetch" TypeError when the API is down.
// Every page now receives one readable message instead of the browser's wording.
export const NETWORK_ERROR_MESSAGE = 'ShopSmart could not reach the server. Check that the backend is running, then try again.';

export async function request(path, { timeoutMs, ...options } = {}) {
  // LAB 5: optional timeout so a slow request can never leave the page loading forever.
  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller?.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
  } catch (caught) {
    if (caught.name === 'AbortError') throw Object.assign(new Error('The server took too long to respond. Please try again.'), { code: 'TIMEOUT' });
    throw Object.assign(new Error(NETWORK_ERROR_MESSAGE), { code: 'NETWORK_ERROR' });
  } finally {
    if (timer) clearTimeout(timer);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message || `Request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.error?.code;
    error.details = data?.error?.details;
    throw error;
  }
  return data;
}

export const api = {
  getProducts: (query = '') => request(`/products${query ? `?search=${encodeURIComponent(query)}` : ''}`),
  getProduct: (id) => request(`/products/${id}`),
  createOrder: (order) => request('/orders', { method: 'POST', body: JSON.stringify(order) }),
  askAssistant: (question) => request('/assistant/questions', {
    method: 'POST', body: JSON.stringify({ question }), timeoutMs: 20000
  })
};
