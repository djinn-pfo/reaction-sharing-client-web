import type {
  SignalingMessage,
  JoinRoomMessage,
  LeaveRoomMessage,
  WebRTCSignalingMessage,
  PeerJoinedMessage,
  PeerLeftMessage,
  ErrorMessage,
} from '../../types/signaling';

// 感情データ受信メッセージ型
export interface EmotionBroadcastMessage extends SignalingMessage {
  type: 'emotion.broadcast';
  data: {
    userId: string;
    intensity: number;
    confidence: number;
    timestamp: number;
  };
}

// 感情処理確認メッセージ型
export interface EmotionProcessedMessage extends SignalingMessage {
  type: 'emotion.processed';
  data: {
    message: string;
  };
}

// メッセージハンドラーのコールバック型
export interface MessageHandlerCallbacks {
  onRoomJoined?: (message: SignalingMessage) => void;
  onRoomLeft?: (message: SignalingMessage) => void;
  onPeerJoined?: (message: PeerJoinedMessage) => void;
  onPeerLeft?: (message: PeerLeftMessage) => void;
  onWebRTCSignaling?: (message: WebRTCSignalingMessage) => void;
  onEmotionBroadcast?: (message: EmotionBroadcastMessage) => void;
  onEmotionProcessed?: (message: EmotionProcessedMessage) => void;
  onError?: (message: ErrorMessage) => void;
  onUnknownMessage?: (message: SignalingMessage) => void;
}

export class MessageHandler {
  private callbacks: MessageHandlerCallbacks = {};

  // コールバックを設定
  public setCallbacks(callbacks: MessageHandlerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // 個別のコールバックを設定
  public onRoomJoined(callback: (message: SignalingMessage) => void): void {
    this.callbacks.onRoomJoined = callback;
  }

  public onRoomLeft(callback: (message: SignalingMessage) => void): void {
    this.callbacks.onRoomLeft = callback;
  }

  public onPeerJoined(callback: (message: PeerJoinedMessage) => void): void {
    this.callbacks.onPeerJoined = callback;
  }

  public onPeerLeft(callback: (message: PeerLeftMessage) => void): void {
    this.callbacks.onPeerLeft = callback;
  }

  public onWebRTCSignaling(callback: (message: WebRTCSignalingMessage) => void): void {
    this.callbacks.onWebRTCSignaling = callback;
  }

  public onEmotionBroadcast(callback: (message: EmotionBroadcastMessage) => void): void {
    this.callbacks.onEmotionBroadcast = callback;
  }

  public onEmotionProcessed(callback: (message: EmotionProcessedMessage) => void): void {
    this.callbacks.onEmotionProcessed = callback;
  }

  public onError(callback: (message: ErrorMessage) => void): void {
    this.callbacks.onError = callback;
  }

  public onUnknownMessage(callback: (message: SignalingMessage) => void): void {
    this.callbacks.onUnknownMessage = callback;
  }

  // メッセージを処理
  public handleMessage(message: SignalingMessage): void {
    try {
      console.log('📨 Received message:', message.type, message);
      switch (message.type) {
        case 'room-joined':
          this.callbacks.onRoomJoined?.(message);
          break;

        case 'room-left':
          this.callbacks.onRoomLeft?.(message);
          break;

        case 'peer-joined':
          this.callbacks.onPeerJoined?.(message as PeerJoinedMessage);
          break;

        case 'peer-left':
          this.callbacks.onPeerLeft?.(message as PeerLeftMessage);
          break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
        case 'webrtc-offer':
        case 'webrtc-answer':
          this.callbacks.onWebRTCSignaling?.(message as WebRTCSignalingMessage);
          break;

        case 'joined':
          console.log('✅ Successfully joined room:', message);
          this.callbacks.onRoomJoined?.(message);
          break;

        case 'emotion.broadcast':
          console.log('📥 Received emotion broadcast:', message);
          this.callbacks.onEmotionBroadcast?.(message as EmotionBroadcastMessage);
          break;

        case 'emotion.processed':
          console.log('✅ Emotion data processed:', message);
          this.callbacks.onEmotionProcessed?.(message as EmotionProcessedMessage);
          break;

        case 'error':
          this.callbacks.onError?.(message as ErrorMessage);
          break;

        default:
          console.warn('Unknown message type:', message.type);
          this.callbacks.onUnknownMessage?.(message);
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error, message);
    }
  }

  // メッセージファクトリー関数

  // ルーム参加メッセージを作成
  public static createJoinRoomMessage(room: string, username: string): JoinRoomMessage {
    return {
      type: 'join',
      room,
      username,
      timestamp: Date.now(),
    };
  }

  // ルーム退出メッセージを作成
  public static createLeaveRoomMessage(room: string): LeaveRoomMessage {
    return {
      type: 'leave',
      room,
      timestamp: Date.now(),
    };
  }

  // WebRTC Offerメッセージを作成
  public static createOfferMessage(
    from: string,
    to: string,
    offer: RTCSessionDescriptionInit
  ): WebRTCSignalingMessage {
    return {
      type: 'offer',
      from,
      to,
      data: offer,
      timestamp: Date.now(),
    };
  }

  // WebRTC Answerメッセージを作成
  public static createAnswerMessage(
    from: string,
    to: string,
    answer: RTCSessionDescriptionInit
  ): WebRTCSignalingMessage {
    return {
      type: 'answer',
      from,
      to,
      data: answer,
      timestamp: Date.now(),
    };
  }

  // ICE候補メッセージを作成
  public static createIceCandidateMessage(
    from: string,
    to: string,
    candidate: RTCIceCandidateInit
  ): WebRTCSignalingMessage {
    return {
      type: 'ice-candidate',
      from,
      to,
      data: candidate,
      timestamp: Date.now(),
    };
  }

  // メッセージバリデーション
  public static validateMessage(message: any): message is SignalingMessage {
    if (!message || typeof message !== 'object') {
      return false;
    }

    if (typeof message.type !== 'string') {
      return false;
    }

    if (typeof message.timestamp !== 'number') {
      return false;
    }

    return true;
  }

  // WebRTCシグナリングメッセージの検証
  public static validateWebRTCMessage(message: SignalingMessage): message is WebRTCSignalingMessage {
    if (!['offer', 'answer', 'ice-candidate'].includes(message.type)) {
      return false;
    }

    const webrtcMessage = message as WebRTCSignalingMessage;

    if (typeof webrtcMessage.from !== 'string' || typeof webrtcMessage.to !== 'string') {
      return false;
    }

    if (!webrtcMessage.data) {
      return false;
    }

    return true;
  }

  // エラーメッセージかどうかの判定
  public static isErrorMessage(message: SignalingMessage): message is ErrorMessage {
    return message.type === 'error' &&
           typeof (message as ErrorMessage).error === 'object' &&
           typeof (message as ErrorMessage).error.code === 'string' &&
           typeof (message as ErrorMessage).error.message === 'string';
  }
}