import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductWhere } from '../src/services/productSearch.js';

test('no search term returns only the active catalog', () => {
  assert.deepEqual(buildProductWhere(undefined), { active: true });
  assert.deepEqual(buildProductWhere('   '), { active: true });
});

test('a search term matches name or description, case-insensitive, active only', () => {
  assert.deepEqual(buildProductWhere('  Privacy '), {
    active: true,
    OR: [
      { name: { contains: 'Privacy', mode: 'insensitive' } },
      { description: { contains: 'Privacy', mode: 'insensitive' } }
    ]
  });
});
