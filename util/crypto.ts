import { createCipheriv, createDecipheriv } from 'crypto';

const algo = 'aes-128-cbc';
const key = '123456789abcdefg';
const iv = 'abcdefg123456789';

const encrypt = (data: string) => {
  const cipher = createCipheriv(algo, key, iv);

  return cipher.update(data) + cipher.final('base64');
};

const decrypt = (crypted: string) => {
  const decipher = createDecipheriv(algo, key, iv);

  return decipher.update(crypted, 'base64', 'utf8') + decipher.final('utf8');
};

export const crypto = { encrypt, decrypt };
