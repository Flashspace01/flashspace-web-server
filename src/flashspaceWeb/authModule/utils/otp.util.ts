import crypto from 'crypto';

export interface OTPData {
  otp: string;
  expiresAt: Date;
  attempts: number;
}

export class OTPUtil {
  // Generate a secure 6-digit OTP
  static generate(): string {
    const buffer = crypto.randomBytes(3);
    const otp = parseInt(buffer.toString('hex'), 16) % 1000000;
    return otp.toString().padStart(6, '0');
  }

  // Generate OTP with expiry (default 10 minutes)
  static generateWithExpiry(validityMinutes: number = 10): OTPData {
    const otp = this.generate();
    const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);
    
    return {
      otp,
      expiresAt,
      attempts: 0
    };
  }

  // Verify OTP
  static verify(providedOTP: string, storedOTP: string, expiresAt: Date, attempts: number = 0): {
    isValid: boolean;
    message: string;
    isExpired: boolean;
    attemptsExceeded: boolean;
  } {
    // Check if OTP has expired
    if (new Date() > expiresAt) {
      return {
        isValid: false,
        message: 'OTP has expired. Please request a new one.',
        isExpired: true,
        attemptsExceeded: false
      };
    }

    // Check if max attempts exceeded (3 attempts)
    if (attempts >= 3) {
      return {
        isValid: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.',
        isExpired: false,
        attemptsExceeded: true
      };
    }

    // Verify OTP
    if (providedOTP === storedOTP) {
      return {
        isValid: true,
        message: 'OTP verified successfully',
        isExpired: false,
        attemptsExceeded: false
      };
    }

    return {
      isValid: false,
      message: 'Invalid OTP. Please try again.',
      isExpired: false,
      attemptsExceeded: false
    };
  }

  // Hash OTP for secure storage (optional - if you want to hash OTP in database)
  static async hash(otp: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.pbkdf2(otp, salt, 1000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        resolve(salt + ':' + derivedKey.toString('hex'));
      });
    });
  }

  // Verify hashed OTP
  static async verifyHash(otp: string, hashedOTP: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const [salt, key] = hashedOTP.split(':');
      crypto.pbkdf2(otp, salt, 1000, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        resolve(key === derivedKey.toString('hex'));
      });
    });
  }

  // Generate alphanumeric OTP (for special cases)
  static generateAlphanumeric(length: number = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = crypto.randomBytes(length);
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    
    return result;
  }

  // Check if rate limit exceeded (max 3 OTPs in 15 minutes)
  static checkRateLimit(lastOTPRequestTime: Date | undefined, requestCount: number = 0): {
    allowed: boolean;
    message: string;
    retryAfter?: number;
  } {
    const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
    const MAX_REQUESTS = 3;

    if (!lastOTPRequestTime) {
      return { allowed: true, message: 'Request allowed' };
    }

    const timeSinceLastRequest = Date.now() - lastOTPRequestTime.getTime();

    // Reset counter if window has passed
    if (timeSinceLastRequest > RATE_LIMIT_WINDOW) {
      return { allowed: true, message: 'Request allowed' };
    }

    // Check if max requests exceeded
    if (requestCount >= MAX_REQUESTS) {
      const retryAfter = Math.ceil((RATE_LIMIT_WINDOW - timeSinceLastRequest) / 1000 / 60);
      return {
        allowed: false,
        message: `Too many OTP requests. Please try again in ${retryAfter} minutes.`,
        retryAfter
      };
    }

    return { allowed: true, message: 'Request allowed' };
  }
}
