import { randBase58, randDigit } from './rand';

describe('rand', () => {
  it('randDigit', () => {
    const res = randDigit(5);
    expect(res.length).toBe(5);
  });
  it('randBase58', () => {
    const res = randBase58(5);
    expect(res.length).toBe(5);
  });
});
