import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authConfig } from '../../config/auth.config';

/**
 * ProtectedRouteのProps
 */
interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * 認証が必要なルートを保護するコンポーネント
 *
 * 認証が無効な場合は常に子コンポーネントを表示
 * 認証が有効な場合は、認証済みなら子コンポーネント、未認証ならログイン画面へリダイレクト
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authenticated, loading } = useAuth();

  // 認証機能が無効な場合は保護しない
  if (!authConfig.enabled) {
    return <>{children}</>;
  }

  // ローディング中は空表示（または必要に応じてローディング画面を表示）
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未認証の場合はログイン画面へリダイレクト
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  // 認証済みの場合は子コンポーネントを表示
  return <>{children}</>;
}
