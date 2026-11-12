import { describe, expect, it } from 'vitest';
import {
  addProductToCart, calculateCartItemCount,
  calculateCartTotal, parseQuantityDraft, updateCartQuantity
} from './cart.js';


describe('cart utilities', () => {

  it('counts all cart units and handles an empty cart', () => {
  expect(calculateCartItemCount([{ quantity: 2 }, { quantity: 3 }])).toBe(5);
  expect(calculateCartItemCount([])).toBe(0);
});

  it('calculates the cart total', () => {
    expect(calculateCartTotal([
      { price: 100, quantity: 2 },
      { price: 50, quantity: 3 }
    ])).toBe(350);
  });

  it('adds a new product', () => {
    const result = addProductToCart([], { id: 1, name: 'Mouse', price: 500, stock: 2 });
    expect(result.error).toBe('');
    expect(result.cart[0].quantity).toBe(1);
  });

  it('prevents a quantity above stock', () => {
    const cart = [{ productId: 1, name: 'Mouse', price: 500, stock: 1, quantity: 1 }];
    expect(updateCartQuantity(cart, 1, 2).error).toContain('Only 1');
  });
});

// D1: the quantity box now sends the whole typed value once, on blur or Enter.
describe('quantity draft (D1)', () => {
  const cart = [
    { productId: 1, name: 'Wireless Mouse', price: 650, stock: 4, quantity: 4 },
    { productId: 5, name: 'Laptop Stand', price: 1200, stock: 7, quantity: 1 }
  ];

  it('reads the whole typed value', () => {
    expect(parseQuantityDraft('10')).toBe(10);
    expect(parseQuantityDraft(' 3 ')).toBe(3);
    expect(parseQuantityDraft('')).toBeNaN();
    expect(parseQuantityDraft('   ')).toBeNaN();
  });

  it('refuses "10" above stock and keeps the quantity at 4 (total stays 3,800)', () => {
    const result = updateCartQuantity(cart, 1, parseQuantityDraft('10'));
    expect(result.error).toBe('Only 4 unit(s) are available.');
    expect(result.cart).toBe(cart);
    expect(calculateCartTotal(result.cart)).toBe(3800);
  });

  it('refuses blank, zero and decimal drafts without changing the cart', () => {
    for (const draft of ['', '0', '1.5', 'abc']) {
      const result = updateCartQuantity(cart, 1, parseQuantityDraft(draft));
      expect(result.error).toBe('Quantity must be a whole number greater than zero.');
      expect(result.cart).toBe(cart);
    }
  });

  it('accepts a valid typed quantity', () => {
    const result = updateCartQuantity(cart, 1, parseQuantityDraft('2'));
    expect(result.error).toBe('');
    expect(result.cart[0].quantity).toBe(2);
    expect(calculateCartTotal(result.cart)).toBe(2500);
  });
});
