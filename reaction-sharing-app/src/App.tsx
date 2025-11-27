import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WebRTCProvider } from './contexts/WebRTCContext';
import { AuthProvider } from './contexts/AuthContext';
import { LobbyView } from './components/lobby/LobbyView';
import { SessionView } from './components/session/SessionView';
import { BroadcasterView, ViewerView } from './components/broadcast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Footer } from './components/common/Footer';
import { LoginView } from './components/auth/LoginView';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { validateConfig } from './config/environment';
import { validateAuthConfig } from './config/auth.config';

// 設定を検証
try {
  validateConfig();
  validateAuthConfig();
} catch (error) {
  console.error('Configuration error:', error);
}

function App() {
  console.log('🎯 App component rendering...');

  // Viteのbase設定から自動的にbasenameを取得
  const basename = import.meta.env.BASE_URL;
  console.log('🔗 Router basename:', basename);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <WebRTCProvider>
          <Router basename={basename}>
            <div className="min-h-screen bg-gray-50 flex flex-col">
              <main className="flex-1">
                <Routes>
                  <Route path="/login" element={<LoginView />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <LobbyView />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/room/:roomId"
                    element={
                      <ProtectedRoute>
                        <SessionView />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/broadcast/:roomId"
                    element={
                      <ProtectedRoute>
                        <BroadcasterView />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/watch/:roomId"
                    element={
                      <ProtectedRoute>
                        <ViewerView />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </WebRTCProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;