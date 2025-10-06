import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '../Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // ここでエラーログを外部サービスに送信可能
    // logger.error('React Error Boundary', { error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-red-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              エラーが発生しました
            </h1>

            <p className="text-gray-600 mb-6">
              申し訳ありません。予期しないエラーが発生しました。
              <br />
              ページをリロードするか、しばらく時間をおいて再度お試しください。
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mb-4 p-4 bg-gray-100 rounded border text-sm">
                <summary className="cursor-pointer font-medium">エラー詳細</summary>
                <pre className="mt-2 text-xs overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={this.handleReset}
                className="flex-1"
              >
                もう一度試す
              </Button>
              <Button
                variant="primary"
                onClick={this.handleReload}
                className="flex-1"
              >
                ページをリロード
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}