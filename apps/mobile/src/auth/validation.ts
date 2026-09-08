import type { LoginInput, RegisterInput } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(input: LoginInput): string | null {
  if (!EMAIL_PATTERN.test(input.email.trim().toLowerCase())) {
    return "Enter a valid email address.";
  }
  if (!input.password) {
    return "Enter your password.";
  }
  if (input.password.length > 128) {
    return "Password must be at most 128 characters.";
  }
  return null;
}

export function validateRegistration(input: RegisterInput): string | null {
  if (!input.display_name.trim()) {
    return "Enter your display name.";
  }
  if (input.display_name.trim().length > 100) {
    return "Display name must be at most 100 characters.";
  }
  const loginError = validateLogin(input);
  if (loginError) {
    return loginError;
  }
  if (input.password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
}
