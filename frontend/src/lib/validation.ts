export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
  message: "Au moins 8 caractères, une majuscule, une minuscule et un chiffre",
};

export const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const CODE_REGEX = /^\d{6}$/;

export function validateEmail(email: string): string | null {
  if (!email) return "Email requis";
  if (!EMAIL_REGEX.test(email)) return "Email invalide";
  return null;
}

export function validatePhone(phone: string): string | null {
  if (!phone) return "Téléphone requis";
  if (!PHONE_REGEX.test(phone)) return "Numéro de téléphone invalide (ex: +243901234567)";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Mot de passe requis";
  if (password.length < PASSWORD_RULES.minLength) return `Minimum ${PASSWORD_RULES.minLength} caractères`;
  if (password.length > PASSWORD_RULES.maxLength) return `Maximum ${PASSWORD_RULES.maxLength} caractères`;
  if (!PASSWORD_RULES.pattern.test(password)) return "Doit contenir une majuscule, une minuscule et un chiffre";
  return null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
  if (!confirm) return "Confirmation requise";
  if (password !== confirm) return "Les mots de passe ne correspondent pas";
  return null;
}

export function validateCode(code: string): string | null {
  if (!code) return "Code requis";
  if (!CODE_REGEX.test(code)) return "Le code doit contenir 6 chiffres";
  return null;
}
