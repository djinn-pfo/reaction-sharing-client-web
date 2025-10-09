import { config } from '../../config/environment';

/**
 * Authentication service for Ion-SFU API
 * Handles JWT token management via backend login
 */
export class AuthService {
  private static readonly TOKEN_KEY = 'authToken';
  private static readonly USER_ID_KEY = 'userId';

  /**
   * Login to backend and get JWT token
   */
  static async login(username: string): Promise<{ token: string; userId: string }> {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Login failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      console.log('[DEBUG][CHECK] Backend response:', {
        hasToken: !!data.token,
        tokenLength: data.token?.length,
        userId: data.userId,
        tokenFull: data.token
      });

      // Remove non-ASCII characters from token (temporary workaround)
      const cleanToken = data.token.replace(/[^\x00-\x7F]/g, '');
      const hasNonAscii = cleanToken !== data.token;

      if (hasNonAscii) {
        console.warn('[DEBUG][CHECK] ⚠️ Token contained non-ASCII characters - cleaned:', {
          original: data.token,
          cleaned: cleanToken
        });
      }

      localStorage.setItem(this.TOKEN_KEY, cleanToken);
      localStorage.setItem(this.USER_ID_KEY, data.userId);

      console.log('[DEBUG][CHECK] Token stored to localStorage');

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get stored authentication token
   */
  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get stored user ID
   */
  static getUserId(): string | null {
    return localStorage.getItem(this.USER_ID_KEY);
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Clear authentication data
   */
  static clearAuth(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    console.log('✅ [Auth] Authentication cleared');
  }

  /**
   * Ensure user is authenticated
   * If not, login with the provided username
   */
  static async ensureAuthenticated(userName: string): Promise<string> {
    let token = this.getToken();

    console.log('[DEBUG][CHECK] ensureAuthenticated - existing token:', token ? 'EXISTS' : 'NONE');

    if (!token) {
      console.log('[DEBUG][CHECK] No token found, calling login()...');
      const { token: newToken } = await this.login(userName);
      token = newToken;
    } else {
      console.log('[DEBUG][CHECK] Using existing token from localStorage');
    }

    return token;
  }
}
