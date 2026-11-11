import { describe, expect, it } from 'vitest';
import { describeOrderError } from './orderErrors.js';

describe('describeOrderError (Lab 6 defect D3)', () => {
  it('lists each rejected checkout field in plain language', () => {
    const result = describeOrderError({
      message: 'Check the customer and cart information.',
      details: { fieldErrors: { customerName: ['Too small'], address: ['Too small'] } }
    });
    expect(result.message).toBe('Check the customer and cart information.');
    expect(result.fields).toHaveLength(2);
    expect(result.fields[0]).toMatch(/^Full name/);
    expect(result.fields[1]).toMatch(/^Delivery address/);
  });

  it('keeps a stock or network message with no field list', () => {
    expect(describeOrderError({ message: 'Only 6 unit(s) of 1080p Webcam are available.' }))
      .toEqual({ message: 'Only 6 unit(s) of 1080p Webcam are available.', fields: [] });
  });
});
