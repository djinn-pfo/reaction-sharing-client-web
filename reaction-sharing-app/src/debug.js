// デバッグ用：コンソールでWebSocket接続テスト
console.log('🐛 debug.js loaded!');

// WebSocket API確認
console.log('=== WebSocket Debug Info ===');
console.log('WebSocket type:', typeof WebSocket);
console.log('WebSocket constructor:', WebSocket);
console.log('User Agent:', navigator.userAgent);

// 直接接続テスト
if (typeof WebSocket !== 'undefined') {
  console.log('✅ WebSocket API is available');

  // テスト関数を定義
  window.testWebSocket = function(url = 'ws://192.168.3.39:8080/ws?userId=debug') {
    console.log('Testing WebSocket connection to:', url);

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('✅ WebSocket connected successfully!');
      ws.close();
    };

    ws.onerror = (error) => {
      console.log('❌ WebSocket error:', error);
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket closed:', event.code, event.reason);
    };

    // 5秒後にタイムアウト
    setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        console.log('⏰ Connection timeout');
        ws.close();
      }
    }, 5000);

    return ws;
  };

  console.log('Use testWebSocket() to test connection');
} else {
  console.log('❌ WebSocket API is NOT available');
}