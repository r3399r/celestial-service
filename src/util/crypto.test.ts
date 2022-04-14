import { crypto } from './crypto';

describe('crypto', () => {
  it('encrypt', () => {
    expect(crypto.encrypt('2022/03/24')).toBe('XMroqI0vjufObTyVc9MTQA==');
  });
  it('decrypt', () => {
    expect(crypto.decrypt('XMroqI0vjufObTyVc9MTQA==')).toBe('2022/03/24');
  });
});
