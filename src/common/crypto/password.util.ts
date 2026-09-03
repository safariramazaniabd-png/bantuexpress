import * as crypto from 'crypto';

export const HASH_KEY_LENGTH = 64;

/**
 * Hachage scrypt centralisé. Format : `salt:hash` (salt 16 octets hex,
 * hash 64 octets hex = 128 chars). Partage ce format avec le seed.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, HASH_KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, HASH_KEY_LENGTH).toString('hex');
  const derivedBuf = Buffer.from(derived, 'hex');
  const hashBuf = Buffer.from(hash, 'hex');
  return derivedBuf.length === hashBuf.length && crypto.timingSafeEqual(derivedBuf, hashBuf);
}
