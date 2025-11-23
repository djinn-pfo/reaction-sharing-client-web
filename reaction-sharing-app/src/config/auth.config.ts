/**
 * 認証機能の設定
 */
export const authConfig = {
  // 認証機能の有効/無効
  enabled: import.meta.env.VITE_AUTH_ENABLED === 'true',

  // デフォルトユーザー名
  username: import.meta.env.VITE_DEFAULT_USERNAME || 'lolup_user',

  // パスワードハッシュ
  passwordHash: import.meta.env.VITE_DEFAULT_PASSWORD_HASH || '',

  // セッション有効期限（時間単位）
  sessionDurationHours: Number(import.meta.env.VITE_SESSION_DURATION_HOURS) || 24,

  // セッション有効期限（ミリ秒）
  get sessionDurationMs(): number {
    return this.sessionDurationHours * 60 * 60 * 1000;
  },
} as const;

/**
 * 認証設定が正しく設定されているか検証する
 */
export function validateAuthConfig(): void {
  if (authConfig.enabled) {
    if (!authConfig.passwordHash) {
      console.warn(
        '認証が有効ですが、VITE_DEFAULT_PASSWORD_HASHが設定されていません。'
      );
    }

    if (authConfig.sessionDurationHours <= 0) {
      console.warn(
        'セッション有効期限が0以下です。デフォルト値（24時間）を使用します。'
      );
    }
  }
}
