import { randomInt } from 'crypto';

export const randDigit = (length: number): string => rand('0123456789', length);

export const randBase58 = (length: number): string =>
  // Base64 without I, l, O, 0, +, /
  rand('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', length);

const rand = (chars: string, length: number): string => {
  const n = chars.length;
  let str = '';
  for (let i = 0; i < length; ++i) str += chars[randomInt(n)];

  return str;
};
