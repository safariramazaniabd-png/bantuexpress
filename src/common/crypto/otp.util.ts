import * as crypto from 'crypto';

export const OTP_CODE_LENGTH = 6;
export const OTP_EXPIRY_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

/**
 * Utilitaire OTP centralisé. Seul le hash (SHA-256) du code est stocké en
 * base, jamais le code en clair.
 */
export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(OTP_CODE_LENGTH, '0');
}

export function hashOtpCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export function generateResetToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

export function hashRawToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
