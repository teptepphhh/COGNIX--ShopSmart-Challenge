import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductWhere, normalizeSearch } from '../src/services/productSearch.js';

test('normalizeSearch trims and handles missing values', () => {
  assert.equal(normalizeSearch('  keyboard  '), 'keyboard');
  assert.equal(normalizeSearch(undefined), '');
  assert.equal(normalizeSearch('   '), '');
});

test('absent or whitespace-only search returns the full active catalog filter', () => {
  assert.deepEqual(buildProductWhere(undefined), { active: true });
  assert.deepEqual(buildProductWhere(''), { active: true });
  assert.deepEqual(buildProductWhere('   '), { active: true });
});

test('search matches name OR description case-insensitively and stays active-only', () => {
  assert.deepEqual(buildProductWhere('  Wireless '), {
    active: true,
    OR: [
      { name: { contains: 'Wireless', mode: 'insensitive' } },
      { description: { contains: 'Wireless', mode: 'insensitive' } }
    ]
  });
});
