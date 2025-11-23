/**
 * パスワードをSHA-256でハッシュ化する
 * @param password - ハッシュ化するパスワード
 * @returns ハッシュ化されたパスワード（16進数文字列）
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * ランダムなセッショントークンを生成する
 * @returns ランダムなトークン文字列
 */
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * パスワードを検証する
 * @param password - 検証するパスワード
 * @param expectedHash - 期待されるハッシュ値
 * @returns パスワードが正しい場合true
 */
export async function verifyPassword(
  password: string,
  expectedHash: string
): Promise<boolean> {
  const hash = await hashPassword(password);
  return hash === expectedHash;
}
