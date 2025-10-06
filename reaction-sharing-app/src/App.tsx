import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WebRTCProvider } from './contexts/WebRTCContext';
import { LobbyView } from './components/lobby/LobbyView';
import { SessionView } from './components/session/SessionView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { validateConfig } from './config/environment';

// 設定を検証
try {
  validateConfig();
} catch (error) {
  console.error('Configuration error:', error);
}

function App() {
  console.log('🎯 App component rendering...');

  return (
    <ErrorBoundary>
      <WebRTCProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/" element={<LobbyView />} />
              <Route path="/room/:roomId" element={<SessionView />} />
            </Routes>
          </div>
        </Router>
      </WebRTCProvider>
    </ErrorBoundary>
  );
}

export default App;