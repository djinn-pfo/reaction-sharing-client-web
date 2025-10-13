// WebSocket接続状態
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

// WebSocketメッセージの基本型
export interface BaseMessage {
  type: string;
  timestamp: number;
}

// シグナリングメッセージ型
export interface SignalingMessage extends BaseMessage {
  room?: string;
  from?: string;
  to?: string;
  data?: any;
}

// ルーム参加メッセージ
export interface JoinRoomMessage extends BaseMessage {
  type: 'join';
  room: string;
  username: string;
}

// ルーム参加完了通知
export interface RoomJoinedMessage extends SignalingMessage {
  type: 'room-joined' | 'joined';
  room: string;
  userId?: string;
  data?: {
    message?: string;
    userId?: string;
    participantCount?: number;
    participantNumber?: number;
    isBroadcaster?: boolean;
    role?: 'broadcaster' | 'viewer';
    // Legacy support
    peers?: string[];
    peerIds?: string[];
  };
}

// ルーム退出メッセージ
export interface LeaveRoomMessage extends BaseMessage {
  type: 'leave';
  room: string;
}

// WebRTCシグナリングメッセージ
export interface WebRTCSignalingMessage extends BaseMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to: string;
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

// ピア参加通知
export interface PeerJoinedMessage extends BaseMessage {
  type: 'peer-joined';
  peerId: string;
  username: string;
}

// ピア退出通知
export interface PeerLeftMessage extends BaseMessage {
  type: 'peer-left';
  peerId: string;
}

// エラーメッセージ
export interface ErrorMessage extends BaseMessage {
  type: 'error';
  error: {
    code: string;
    message: string;
  };
}

// ハートビートメッセージ
export interface HeartbeatMessage extends BaseMessage {
  type: 'heartbeat';
}

// WebSocketイベントハンドラー型
export interface WebSocketEventHandlers {
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  onMessage?: (message: SignalingMessage) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
}

// WebSocketクライアント設定
export interface WebSocketConfig {
  url: string;
  userId?: string;  // ユーザーID（URLクエリパラメータに追加される）
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
}

// 配信タイムスタンプメッセージ
export interface BroadcastTimestampMessage extends BaseMessage {
  type: 'broadcast-timestamp';
  room: string;
  from: string;
  data: {
    frameId: string;
    broadcastTimestamp: number;
    sequenceNumber: number;
  };
}

// タイムスタンプ付き感情メッセージ
export interface EmotionWithTimestampMessage extends BaseMessage {
  type: 'emotion-with-timestamp';
  room: string;
  from: string;
  to: string;
  data: {
    userId: string;
    intensity: number;
    confidence: number;
    broadcastTimestamp: number;
    reactionSentTime: number;
    frameId: string;
  };
  metrics?: {
    broadcastToReceivedMs: number;
    withinConstraint: boolean;
    frameId: string;
  };
}

// 笑い声トリガーメッセージ
export interface LaughTriggerMessage extends BaseMessage {
  type: 'laugh:trigger';
  room: string;
  from: string;
  data: {
    presetId: string;
    level: 'small' | 'medium' | 'large';
  };
}