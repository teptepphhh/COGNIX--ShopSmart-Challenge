import { describe, expect, it } from 'vitest';
import {
  filterByCategory, getCatalogCategories, getCategoryOptions, sortProducts
} from './catalog.js';

const catalog = [
  { id: 1, name: 'Wireless Mouse', category: 'Accessories', price: 650 },
  { id: 2, name: 'Compact Mechanical Keyboard', category: 'Accessories', price: 1850 },
  { id: 3, name: 'USB-C Study Lamp', category: 'Study', price: 900 },
  { id: 4, name: '1080p Webcam', category: 'Video', price: 1450 },
  { id: 5, name: 'Laptop Stand', category: 'Study', price: 1200 },
  { id: 6, name: 'USB Headset', category: 'Audio', price: 1350 }
];
const catalogCategories = getCatalogCategories(catalog);
const ids = (products) => products.map((product) => product.id);

describe('catalog utilities', () => {
  it('derives unique categories in catalog order', () => {
    expect(catalogCategories).toEqual(['Accessories', 'Study', 'Video', 'Audio']);
  });

  it('Study + server search "lamp" shows the Study lamp', () => {
    const lampResults = [catalog[2]];
    expect(ids(filterByCategory(lampResults, 'Study'))).toEqual([3]);
  });

  it('Study + server search "webcam" shows nothing but keeps Study and every option', () => {
    const webcamResults = [catalog[3]];
    expect(filterByCategory(webcamResults, 'Study')).toEqual([]);
    expect(getCategoryOptions(catalogCategories, 'Study'))
      .toEqual(['All', 'Accessories', 'Study', 'Video', 'Audio']);
  });

  it('options do not shrink when the server returns no products', () => {
    expect(getCategoryOptions(catalogCategories, 'All'))
      .toEqual(['All', 'Accessories', 'Study', 'Video', 'Audio']);
  });

  it('keeps a selected category available even before the catalog has loaded', () => {
    expect(getCategoryOptions([], 'Study')).toEqual(['All', 'Study']);
  });

  it('All + price sorting orders the full catalog without mutating it', () => {
    const all = filterByCategory(catalog, 'All');
    expect(ids(sortProducts(all, 'price-asc'))).toEqual([1, 3, 5, 6, 4, 2]);
    expect(ids(sortProducts(all, 'price-desc'))).toEqual([2, 4, 6, 5, 3, 1]);
    expect(ids(sortProducts(all, 'default'))).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ids(catalog)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('sorts by name A–Z', () => {
    expect(sortProducts(catalog, 'name-asc')[0].name).toBe('1080p Webcam');
  });
});
