const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(path, { timeoutMs, ...options } = {}) {
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
    if (caught.name === 'AbortError') throw new Error('The server took too long to respond. Please try again.');
    throw caught;
  } finally {
    if (timer) clearTimeout(timer);
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
    method: 'POST', body: JSON.stringify({ question }), timeoutMs: 20000
  })
};
