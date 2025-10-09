import type {
  ConnectionState,
  SignalingMessage,
  WebSocketEventHandlers,
  WebSocketConfig,
} from '../../types/signaling';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig & {
    reconnectInterval: number;
    maxReconnectAttempts: number;
    heartbeatInterval: number;
    connectionTimeout: number;
  };
  private handlers: WebSocketEventHandlers = {};
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionTimer: NodeJS.Timeout | null = null;
  private isManualClose = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      userId: config.userId,
      reconnectInterval: config.reconnectInterval ?? 5000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      connectionTimeout: config.connectionTimeout ?? 10000,
    };
  }

  // イベントハンドラーを設定
  public setEventHandlers(handlers: WebSocketEventHandlers): void {
    this.handlers = handlers;
  }

  // 接続状態を取得
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  // WebSocket接続を開始
  public async connect(): Promise<void> {
    if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
      return;
    }

    this.isManualClose = false;
    this.setConnectionState('connecting');

    try {
      await this.establishConnection();
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.handleConnectionError();
    }
  }

  // WebSocket接続を切断
  public disconnect(): void {
    this.isManualClose = true;
    this.cleanup();

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
    }

    this.setConnectionState('disconnected');
  }

  // メッセージを送信
  public send(message: SignalingMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected. Cannot send message:', message);
      return false;
    }

    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now(),
      };

      // Debug Ion messages
      if (message.type?.startsWith('ion:')) {
        const payload = (message as any).payload;
        console.log('🚀 [WebSocket] Sending Ion message:', message.type);
        console.log('📦 [WebSocket] Full message structure:', JSON.stringify(messageWithTimestamp, null, 2));
        if (payload?.offer?.sdp) {
          console.log('🔍 [WebSocket] Payload check:', {
            hasOffer: !!payload.offer,
            sdpLength: payload.offer.sdp.length,
            sdpContainsIceUfrag: payload.offer.sdp.includes('a=ice-ufrag'),
            sdpType: payload.offer.type,
            config: payload.config,
            sid: payload.sid,
            uid: payload.uid,
          });
        }
      }

      this.ws.send(JSON.stringify(messageWithTimestamp));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  // バイナリデータを送信
  public sendBinary(data: ArrayBuffer): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected. Cannot send binary data');
      return false;
    }

    try {
      this.ws.send(data);
      return true;
    } catch (error) {
      console.error('Failed to send binary WebSocket message:', error);
      return false;
    }
  }

  // 実際の接続処理
  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // userIdがある場合はURLにクエリパラメータとして追加
        const url = new URL(this.config.url);
        if (this.config.userId) {
          url.searchParams.set('userId', this.config.userId);
        }

        console.log(`🔗 WebSocket connecting to: ${url.toString()}`);
        console.log('🏗️ Creating WebSocket instance...');
        console.log('🌐 navigator.userAgent:', navigator.userAgent);
        console.log('⚙️ WebSocket constructor available:', typeof WebSocket);

        this.ws = new WebSocket(url.toString());
        console.log('✅ WebSocket instance created, readyState:', this.ws.readyState);
        console.log('🔍 WebSocket URL:', this.ws.url);
        console.log('🔍 WebSocket protocol:', this.ws.protocol);

        // 接続タイムアウトを設定
        this.connectionTimer = setTimeout(() => {
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            this.ws.close();
            reject(new Error('Connection timeout'));
          }
        }, this.config.connectionTimeout);

        this.ws.onopen = () => {
          console.log('WebSocket onopen fired!');
          this.clearConnectionTimer();
          this.onWebSocketOpen();
          resolve();
        };

        this.ws.onclose = (event) => {
          this.clearConnectionTimer();
          this.onWebSocketClose(event);
          // 接続が確立される前に閉じられた場合のみreject
          if (this.connectionState !== 'connected') {
            reject(new Error(`WebSocket closed with code: ${event.code}`));
          }
        };

        this.ws.onerror = (error) => {
          console.log('WebSocket onerror fired, readyState:', this.ws?.readyState);
          console.log('WebSocket URL was:', this.ws?.url);
          console.log('Error details:', error);
          this.clearConnectionTimer();
          this.onWebSocketError(error);
          // onerrorでrejectしない（oncloseで処理する）
          // reject(error);
        };

        this.ws.onmessage = (event) => {
          this.onWebSocketMessage(event);
        };

      } catch (error) {
        this.clearConnectionTimer();
        reject(error);
      }
    });
  }

  // WebSocket開放イベント
  private onWebSocketOpen(): void {
    console.log('WebSocket connected successfully');
    console.log('WebSocket readyState:', this.ws?.readyState);
    console.log('WebSocket protocol:', this.ws?.protocol);
    console.log('Config heartbeatInterval:', this.config.heartbeatInterval);
    this.setConnectionState('connected');
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    this.handlers.onOpen?.();
    console.log('WebSocket onOpen handler completed');
  }

  // WebSocket切断イベント
  private onWebSocketClose(event: CloseEvent): void {
    console.log('🔌 WebSocket disconnected:', event.code, event.reason);
    console.log('📊 Close event details:', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      type: event.type
    });
    this.cleanup();
    this.handlers.onClose?.(event);

    if (!this.isManualClose && event.code !== 1000) {
      this.attemptReconnect();
    } else {
      this.setConnectionState('disconnected');
    }
  }

  // WebSocketエラーイベント
  private onWebSocketError(error: Event): void {
    console.error('WebSocket error:', error);
    this.handlers.onError?.(error);
  }

  // WebSocketメッセージ受信イベント
  private onWebSocketMessage(event: MessageEvent): void {
    try {
      console.log('🔄 Raw WebSocket message received:', event.data);
      const message: SignalingMessage = JSON.parse(event.data);
      console.log('📥 Parsed message:', message.type, message);

      // ハートビートレスポンス処理
      if (message.type === 'heartbeat') {
        return;
      }

      this.handlers.onMessage?.(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  // 再接続処理
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.setConnectionState('failed');
      return;
    }

    this.setConnectionState('reconnecting');
    this.reconnectAttempts++;

    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.establishConnection();
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
        this.attemptReconnect();
      }
    }, delay);
  }

  // 接続エラー処理
  private handleConnectionError(): void {
    if (!this.isManualClose) {
      this.attemptReconnect();
    }
  }

  // ハートビート開始
  private startHeartbeat(): void {
    // ハートビートが無効化されている場合は何もしない
    if (this.config.heartbeatInterval <= 0) {
      console.log('Heartbeat disabled');
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      console.log('Sending heartbeat...');
      this.send({ type: 'heartbeat', timestamp: Date.now() });
    }, this.config.heartbeatInterval);
  }

  // 接続状態を設定
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.handlers.onConnectionStateChange?.(state);
    }
  }

  // タイマーとリソースをクリーンアップ
  private cleanup(): void {
    this.clearConnectionTimer();
    this.clearReconnectTimer();
    this.clearHeartbeatTimer();
  }

  private clearConnectionTimer(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}