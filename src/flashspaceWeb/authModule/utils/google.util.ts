import { OAuth2Client } from 'google-auth-library';
import { GoogleProfile } from '../types/auth.types';

export class GoogleUtil {
  private static client: OAuth2Client | null = null;

  /**
   * Initialize Google OAuth client
   */
  static initialize(): void {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      console.error('❌ GOOGLE_CLIENT_ID is not configured in environment variables');
      return;
    }

    this.client = new OAuth2Client(clientId);
    console.log('✅ Google OAuth client initialized successfully');
  }

  /**
   * Verify Google ID token and extract user profile
   * This is the SECURE way to verify tokens from frontend
   * @param token - ID token from Google Sign-In
   * @returns GoogleProfile with verified user data
   */
  static async verifyIdToken(token: string): Promise<GoogleProfile | null> {
    try {
      if (!this.client) {
        this.initialize();
        if (!this.client) {
          throw new Error('Google OAuth client not initialized');
        }
      }

      // Verify the token with Google's servers
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      
      if (!payload) {
        console.error('❌ No payload in Google token');
        return null;
      }

      // Verify the token is for our application
      if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
        console.error('❌ Token audience mismatch');
        return null;
      }

      // Extract verified user information
      const profile: GoogleProfile = {
        id: payload.sub,
        displayName: payload.name || '',
        emails: [{ value: payload.email || '', verified: payload.email_verified || false }],
        photos: payload.picture ? [{ value: payload.picture }] : [],
        provider: 'google',
        _json: {
          sub: payload.sub,
          email: payload.email,
          email_verified: payload.email_verified,
          name: payload.name,
          picture: payload.picture,
          given_name: payload.given_name,
          family_name: payload.family_name,
          locale: payload.locale
        }
      };

      console.log('✅ Google token verified successfully for:', payload.email);
      return profile;
    } catch (error) {
      console.error('❌ Google token verification failed:', error);
      return null;
    }
  }

  /**
   * Validate Google OAuth configuration
   * @returns true if configuration is valid
   */
  static validateConfig(): boolean {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId) {
      console.error('❌ GOOGLE_CLIENT_ID is not set');
      return false;
    }

    if (!clientSecret) {
      console.error('❌ GOOGLE_CLIENT_SECRET is not set');
      return false;
    }

    console.log('✅ Google OAuth configuration is valid');
    return true;
  }

  /**
   * Get OAuth client for advanced operations
   */
  static getClient(): OAuth2Client | null {
    if (!this.client) {
      this.initialize();
    }
    return this.client;
  }
}
