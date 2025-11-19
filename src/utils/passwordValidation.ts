interface PasswordRule {
  test: (password: string) => boolean;
  message: string;
}

export const PASSWORD_REQUIREMENTS_TEXT =
  'Password must be at least 6 characters, include uppercase, lowercase, number, special character, and contain no spaces.';

const SPECIAL_CHAR_REGEX =
  /[!@#$%^&*()\[\]{};:'",.<>/?\\|`~_\-+=]/;

const PASSWORD_RULES: PasswordRule[] = [
  {
    test: (password) => password.length >= 6,
    message: 'Password must be at least 6 characters long.',
  },
  {
    test: (password) => /[A-Z]/.test(password),
    message: 'Password must include at least one uppercase letter.',
  },
  {
    test: (password) => /[a-z]/.test(password),
    message: 'Password must include at least one lowercase letter.',
  },
  {
    test: (password) => /[0-9]/.test(password),
    message: 'Password must include at least one number.',
  },
  {
    test: (password) => SPECIAL_CHAR_REGEX.test(password),
    message: 'Password must include at least one special character.',
  },
  {
    test: (password) => !/\s/.test(password),
    message: 'Password must not contain spaces.',
  },
];

export function getPasswordValidationErrors(password: string): string[] {
  if (!password) return ['Password is required.'];
  return PASSWORD_RULES.filter((rule) => !rule.test(password)).map(
    (rule) => rule.message
  );
}

export function isPasswordValid(password: string): boolean {
  return getPasswordValidationErrors(password).length === 0;
}

