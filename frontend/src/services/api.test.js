import { afterEach, describe, expect, it, vi } from 'vitest';
import { NETWORK_ERROR_MESSAGE, request } from './api.js';

afterEach(() => vi.unstubAllGlobals());

describe('api request errors (Lab 6 defect D1)', () => {
  it('turns an unreachable server into a readable message instead of "Failed to fetch"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(request('/orders', { method: 'POST' })).rejects.toMatchObject({
      message: NETWORK_ERROR_MESSAGE,
      code: 'NETWORK_ERROR'
    });
  });

  it('keeps the server error message, code and field details for a rejected order', async () => {
    const body = { error: { code: 'INVALID_ORDER', message: 'Check the customer and cart information.', details: { fieldErrors: { email: ['Invalid email address'] } } } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => body }));
    await expect(request('/orders', { method: 'POST' })).rejects.toMatchObject({
      status: 422,
      code: 'INVALID_ORDER',
      details: { fieldErrors: { email: ['Invalid email address'] } }
    });
  });

  it('returns parsed JSON for a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: 'ok' }) }));
    await expect(request('/health')).resolves.toEqual({ status: 'ok' });
  });
});
