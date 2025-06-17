const { add, multiply } = require('../src/helper');

describe('helper functions', () => {
  test('add returns sum', () => {
    expect(add(1, 2)).toBe(3);
  });

  test('multiply multiplies non-zero numbers', () => {
    expect(multiply(2, 3)).toBe(6);
  });

  test('multiply returns 0 when a is 0', () => {
    expect(multiply(0, 5)).toBe(0);
  });

  test('multiply returns 0 when b is 0', () => {
    expect(multiply(7, 0)).toBe(0);
  });
});
