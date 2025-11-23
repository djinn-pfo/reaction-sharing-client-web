/**
 * セッションデータの型定義
 */
export interface SessionData {
  token: string;
  expiresAt: number;
}

const SESSION_STORAGE_KEY = 'auth_session';

/**
 * セッションデータをLocalStorageに保存する
 * @param sessionData - 保存するセッションデータ
 */
export function saveSession(sessionData: SessionData): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

/**
 * LocalStorageからセッションデータを取得する
 * @returns セッションデータ、または存在しない場合null
 */
export function getSession(): SessionData | null {
  try {
    const data = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!data) return null;

    const sessionData: SessionData = JSON.parse(data);

    // 有効期限チェック
    if (sessionData.expiresAt < Date.now()) {
      clearSession();
      return null;
    }

    return sessionData;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/**
 * LocalStorageからセッションデータを削除する
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}

/**
 * セッションが有効かチェックする
 * @returns セッションが有効な場合true
 */
export function isSessionValid(): boolean {
  const session = getSession();
  return session !== null;
}
