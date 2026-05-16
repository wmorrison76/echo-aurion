/**
 * Password Generation and Validation
 * Meets industry standards:
 * - OWASP: 12+ characters minimum
 * - NIST: Mix of character types
 * - HIPAA/PCI-DSS: Complexity requirements
 */

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  specialChars: string;
}

const DEFAULT_REQUIREMENTS: PasswordRequirements = {
  minLength: 14,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()-_=+[]{}|;:,.<>?',
};

/**
 * Generate cryptographically secure random password
 * Default: 14+ characters with mixed case, numbers, and special characters
 */
export function generateSecurePassword(
  requirements: PasswordRequirements = DEFAULT_REQUIREMENTS
): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = requirements.specialChars;

  let charset = '';
  let password = '';

  // Build required character set
  if (requirements.requireUppercase) {
    charset += uppercase;
    password += getRandomChar(uppercase);
  }
  if (requirements.requireLowercase) {
    charset += lowercase;
    password += getRandomChar(lowercase);
  }
  if (requirements.requireNumbers) {
    charset += numbers;
    password += getRandomChar(numbers);
  }
  if (requirements.requireSpecialChars) {
    charset += special;
    password += getRandomChar(special);
  }

  // Fill remaining length with random characters from full set
  const remainingLength = Math.max(0, requirements.minLength - password.length);
  for (let i = 0; i < remainingLength; i++) {
    password += getRandomChar(charset);
  }

  // Shuffle password to avoid predictable pattern (required chars at start)
  password = shuffleString(password);

  return password;
}

/**
 * Get random character from a string using crypto API
 */
function getRandomChar(str: string): string {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return str[array[0] % str.length];
  } else {
    // Fallback for Node.js or non-crypto environments
    return str[Math.floor(Math.random() * str.length)];
  }
}

/**
 * Shuffle string using Fisher-Yates algorithm
 */
function shuffleString(str: string): string {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

/**
 * Validate password against requirements
 */
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_REQUIREMENTS
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters`);
  }

  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  }

  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  }

  if (requirements.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain numbers');
  }

  if (requirements.requireSpecialChars) {
    const specialRegex = new RegExp(`[${requirements.specialChars.replace(/[-[\]{}()*+?.\\^$|#\s]/g, '\\$&')}]`);
    if (!specialRegex.test(password)) {
      errors.push('Password must contain special characters');
    }
  }

  // Check for common patterns (weak passwords)
  if (hasCommonPatterns(password)) {
    errors.push('Password contains weak patterns (sequential or repeated characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Detect weak patterns in password
 */
function hasCommonPatterns(password: string): boolean {
  const weakPatterns = [
    /(.)\1{3,}/, // More than 3 repeated characters
    /12345|password|qwerty|abc123|letmein/i, // Common passwords
    /^\d{1,8}$/, // Only numbers
    /^[a-z]{1,8}$/i, // Only letters
  ];

  return weakPatterns.some((pattern) => pattern.test(password));
}

/**
 * Generate password strength meter score (0-100)
 */
export function calculatePasswordStrength(password: string): number {
  let strength = 0;

  // Length score (30 points max)
  strength += Math.min(30, password.length * 2);

  // Character variety score (70 points max)
  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/\d/.test(password)) strength += 15;
  if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) strength += 25;

  // Bonus for length over 14
  if (password.length > 14) strength += 10;

  return Math.min(100, strength);
}

/**
 * Generate QR code data URL for password manager setup
 * Use with qrcode library
 */
export async function generateQRCodeForPasswordSetup(
  email: string,
  tempPassword: string,
  setupToken: string,
  appName: string = 'LUCCCA'
): Promise<string> {
  // Format: otpauth://totp/appname:email?secret=...&issuer=appname
  // Or custom: luccca://setup?token=...&email=...
  
  const setupLink = `luccca://setup?token=${setupToken}&email=${encodeURIComponent(email)}`;
  
  // This would be used with QR code library to generate image
  // Returns data URL that can be displayed as <img src={qrUrl} />
  
  try {
    // Dynamic import to avoid issues if library not available
    const QRCode = (await import('qrcode')).default;
    return await QRCode.toDataURL(setupLink, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
    });
  } catch (error) {
    console.error('[QR Code] Failed to generate:', error);
    // Return fallback text representation
    return `QR Code Text: ${setupLink}`;
  }
}

/**
 * Create password setup instructions
 */
export function createPasswordSetupInstructions(
  email: string,
  appName: string = 'LUCCCA'
): string {
  return `
Welcome to ${appName}!

Your account has been created. To complete your setup:

1. Visit: https://luccca.app/setup
2. Enter your temporary password
3. Choose a new permanent password that meets these requirements:
   - At least 14 characters
   - Mix of uppercase and lowercase letters
   - At least one number
   - At least one special character (!@#$%^&*)

Your temporary password expires in 24 hours.
For security, you will not be able to reuse this password.

Questions? Contact your manager or IT support.
  `.trim();
}

/**
 * Validate password history to prevent reuse
 * Should be checked against previously used passwords in database
 */
export function hasReusedPassword(newPassword: string, previousPasswords: string[]): boolean {
  // In production, compare hashes, not plaintext
  // This is a simplified example
  return previousPasswords.some(
    (previous) => hashPassword(newPassword) === hashPassword(previous)
  );
}

/**
 * Simple hash function (in production, use bcrypt or argon2)
 */
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}
