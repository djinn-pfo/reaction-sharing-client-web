import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authConfig } from '../config/auth.config';
import { verifyPassword, generateSessionToken } from '../utils/auth';
import { saveSession, getSession, clearSession } from '../utils/storage';

/**
 * 認証状態の型定義
 */
interface AuthState {
  authenticated: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * 認証コンテキストの型定義
 */
interface AuthContextType extends AuthState {
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProviderのProps
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * 認証プロバイダーコンポーネント
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    authenticated: false,
    loading: true,
    error: null,
  });

  // 初期化時にセッションをチェック
  useEffect(() => {
    const initAuth = () => {
      // 認証が無効な場合は常に認証済み状態
      if (!authConfig.enabled) {
        setAuthState({
          authenticated: true,
          loading: false,
          error: null,
        });
        return;
      }

      // セッションの有効性をチェック
      const session = getSession();
      setAuthState({
        authenticated: session !== null,
        loading: false,
        error: null,
      });
    };

    initAuth();
  }, []);

  /**
   * ログイン処理
   */
  const login = async (password: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // パスワード検証
      const isValid = await verifyPassword(password, authConfig.passwordHash);

      if (!isValid) {
        setAuthState({
          authenticated: false,
          loading: false,
          error: 'パスワードが正しくありません',
        });
        return false;
      }

      // セッショントークン生成
      const token = generateSessionToken();
      const expiresAt = Date.now() + authConfig.sessionDurationMs;

      // セッション保存
      saveSession({ token, expiresAt });

      setAuthState({
        authenticated: true,
        loading: false,
        error: null,
      });

      return true;
    } catch (error) {
      console.error('Login error:', error);
      setAuthState({
        authenticated: false,
        loading: false,
        error: 'ログイン中にエラーが発生しました',
      });
      return false;
    }
  };

  /**
   * ログアウト処理
   */
  const logout = () => {
    clearSession();
    setAuthState({
      authenticated: false,
      loading: false,
      error: null,
    });
  };

  /**
   * 認証状態をチェック
   */
  const checkAuth = (): boolean => {
    if (!authConfig.enabled) {
      return true;
    }

    const session = getSession();
    const isAuth = session !== null;

    // 状態が変わった場合は更新
    if (isAuth !== authState.authenticated) {
      setAuthState(prev => ({
        ...prev,
        authenticated: isAuth,
      }));
    }

    return isAuth;
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * 認証コンテキストを使用するカスタムフック
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
