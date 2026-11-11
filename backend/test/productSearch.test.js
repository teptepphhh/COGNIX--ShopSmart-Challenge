import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductWhere, escapeLikePattern, normalizeSearch } from '../src/services/productSearch.js';

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

test('LIKE wildcards in a search are matched literally (Lab 6 defect D4)', () => {
  assert.equal(escapeLikePattern('100%'), '100\\%');
  assert.equal(escapeLikePattern('usb_c'), 'usb\\_c');
  assert.equal(escapeLikePattern('a\\b'), 'a\\\\b');
  assert.equal(buildProductWhere('%').OR[0].name.contains, '\\%');
});
