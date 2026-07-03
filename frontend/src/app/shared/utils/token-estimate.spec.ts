import { estimateTokens } from './token-estimate';

describe('estimateTokens', () => {
  it('estimates roughly 1 token per 4 characters', () => {
    expect(estimateTokens('12345678')).toBe(2);
    expect(estimateTokens('1234567890123')).toBe(4);
  });

  it('rounds up partial tokens', () => {
    expect(estimateTokens('12345')).toBe(2);
  });

  it('never returns less than 1, even for empty text', () => {
    expect(estimateTokens('')).toBe(1);
  });
});
