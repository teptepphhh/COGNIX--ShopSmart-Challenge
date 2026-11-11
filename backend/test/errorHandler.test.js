import test from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from '../src/middleware/errorHandler.js';

function fakeResponse() {
  return {
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('malformed JSON is a 400 INVALID_JSON without the parser message (Lab 6 defect D2)', () => {
  const parseError = Object.assign(new SyntaxError("Expected property name or '}' in JSON at position 1"), { type: 'entity.parse.failed', status: 400 });
  const response = fakeResponse();
  errorHandler(parseError, { id: 'trace-1' }, response, () => {});
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error.code, 'INVALID_JSON');
  assert.equal(response.body.error.message, 'The request body must be valid JSON.');
  assert.equal(response.body.error.traceId, 'trace-1');
});

test('an oversized body is a 413 PAYLOAD_TOO_LARGE instead of INTERNAL_ERROR', () => {
  const response = fakeResponse();
  errorHandler(Object.assign(new Error('request entity too large'), { type: 'entity.too.large', status: 413 }), { id: 't' }, response, () => {});
  assert.equal(response.statusCode, 413);
  assert.equal(response.body.error.code, 'PAYLOAD_TOO_LARGE');
});

test('a known 409 keeps its code and message', () => {
  const response = fakeResponse();
  const original = console.error; console.error = () => {};
  try { errorHandler(Object.assign(new Error('Stock changed while placing the order.'), { status: 409, code: 'STOCK_CHANGED' }), { id: 't' }, response, () => {}); }
  finally { console.error = original; }
  assert.equal(response.statusCode, 409);
  assert.deepEqual([response.body.error.code, response.body.error.message], ['STOCK_CHANGED', 'Stock changed while placing the order.']);
});

test('an unexpected error hides internal details behind a trace id', () => {
  const response = fakeResponse();
  const original = console.error; console.error = () => {};
  try { errorHandler(new Error('connect ECONNREFUSED postgres secret detail'), { id: 'trace-9' }, response, () => {}); }
  finally { console.error = original; }
  assert.equal(response.statusCode, 500);
  assert.equal(response.body.error.code, 'INTERNAL_ERROR');
  assert.equal(response.body.error.message, 'The server could not complete the request.');
  assert.equal(response.body.error.traceId, 'trace-9');
});
