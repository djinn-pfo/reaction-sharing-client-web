import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebRTC } from '../contexts/WebRTCContext';
import { WebSocketClient, MessageHandler, type EmotionBroadcastMessage, type EmotionProcessedMessage } from '../services/signaling';
import { config } from '../config/environment';
import { encodeBinaryMessage, type BinaryLandmarkMessage } from '../utils/compression';
import type { EmotionData } from './useMediaPipe';
import type {
  ConnectionState,
  SignalingMessage,
  WebRTCSignalingMessage,
  PeerJoinedMessage,
  PeerLeftMessage,
} from '../types/signaling';

interface UseSignalingOptions {
  autoConnect?: boolean;
}

interface UseSignalingReturn {
  connectionState: ConnectionState;
  isConnected: boolean;
  error: string | null;
  receivedEmotions: Map<string, any[]>;
  connect: () => Promise<void>;
  disconnect: () => void;
  joinRoom: (roomId: string, username: string) => Promise<void>;
  leaveRoom: (roomId: string) => void;
  sendSignalingMessage: (message: SignalingMessage) => boolean;
  sendEmotionData: (landmarks: any[], userId: string, confidence?: number, normalizedLandmarks?: any[]) => boolean;
  getWebSocketState: () => ConnectionState | null;
}

export const useSignaling = (options: UseSignalingOptions = {}): UseSignalingReturn => {
  const { autoConnect = false } = options;
  const { state: webrtcState, actions: webrtcActions } = useWebRTC();

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [receivedEmotions, setReceivedEmotions] = useState<Map<string, any[]>>(new Map());

  // connectionStateの変更を監視
  useEffect(() => {
    console.log('📊 React connectionState updated to:', connectionState);
  }, [connectionState]);

  const wsClientRef = useRef<WebSocketClient | null>(null);
  const messageHandlerRef = useRef<MessageHandler | null>(null);
  const pendingOffers = useRef<Map<string, RTCSessionDescriptionInit>>(new Map());

  // WebSocketクライアントとメッセージハンドラーの初期化
  useEffect(() => {
    // React Strict Modeでの重複実行を防ぐ
    if (wsClientRef.current) {
      console.log('WebSocket client already exists, skipping initialization');
      return;
    }

    // ユーザーIDを生成（シンプルな形式でテスト）
    const userName = localStorage.getItem('userName') || 'testuser';
    const userId = 'debug'; // デバッグ用に固定値を使用

    // WebSocketクライアント作成
    console.log('Creating WebSocket with userId:', userId);
    wsClientRef.current = new WebSocketClient({
      url: config.signalingUrl,
      userId: userId,  // userIdを追加
      reconnectInterval: 5000,
      maxReconnectAttempts: 1, // 1回だけ接続試行
      heartbeatInterval: 0, // ハートビートを無効化してテスト
    });

    // メッセージハンドラー作成
    messageHandlerRef.current = new MessageHandler();

    // WebSocketイベントハンドラー設定
    wsClientRef.current.setEventHandlers({
      onOpen: () => {
        console.log('Signaling connected');
        setError(null);
      },
      onClose: () => {
        console.log('Signaling disconnected');
      },
      onError: (error) => {
        console.error('Signaling error:', error);
        setError('シグナリングサーバーとの接続でエラーが発生しました');
      },
      onMessage: (message) => {
        messageHandlerRef.current?.handleMessage(message);
      },
      onConnectionStateChange: (state) => {
        console.log('🔄 Connection state changed to:', state);
        console.log('🔍 React setConnectionState called with:', state);
        setConnectionState(state);
        console.log('🔍 setConnectionState call completed');
      },
    });

    // メッセージハンドラーのコールバック設定
    messageHandlerRef.current.setCallbacks({
      onPeerJoined: handlePeerJoined,
      onPeerLeft: handlePeerLeft,
      onWebRTCSignaling: handleWebRTCSignaling,
      onEmotionBroadcast: handleEmotionBroadcast,
      onEmotionProcessed: handleEmotionProcessed,
      onError: (errorMessage) => {
        setError(errorMessage.error.message);
      },
    });

    // 自動接続
    if (autoConnect) {
      connect();
    }

    return () => {
      wsClientRef.current?.disconnect();
    };
  }, [autoConnect]);

  // 感情データブロードキャスト処理
  const handleEmotionBroadcast = useCallback((message: EmotionBroadcastMessage) => {
    try {
      console.log('😊 Received emotion broadcast from:', message.from);
      console.log('📊 Emotion data:', message.data);

      // バックエンドの実際の形式: landmarks_processed形式
      const { userId, timestamp, type: dataType, data: emotionData } = message.data;

      // 受信したデータ構造を確認
      console.log('🔍 Received data structure:', { userId, timestamp, dataType, emotionData });

      let intensity, confidence, velocity, features;

      // 新しいProcessResult構造体の形式をチェック
      if (emotionData?.intensity !== undefined) {
        // ProcessResult構造体形式
        intensity = emotionData.intensity || 0;
        confidence = emotionData.confidence || 0;
        velocity = emotionData.velocity || 0;
        features = emotionData.features || {};
        console.log('📊 ProcessResult format detected:', { intensity, confidence, velocity, features });
      } else if (dataType === 'landmarks_processed' && emotionData?.unified) {
        // 旧形式（unified）
        intensity = emotionData.unified.value || 0;
        confidence = emotionData.unified.confidence || 0;
        console.log('📊 Legacy unified format detected:', { intensity, confidence });
      } else {
        // 直接形式
        intensity = message.data.intensity || 0;
        confidence = message.data.confidence || 0;
        console.log('📊 Direct format detected:', { intensity, confidence });
      }

      console.log(`🎯 Extracted values: intensity=${intensity}, confidence=${confidence}`);

      // 感情データが0の場合の詳細デバッグ
      if (intensity === 0) {
        console.log('⚠️ Zero intensity detected. Data structure check:');
        console.log('- dataType:', dataType);
        console.log('- emotionData:', emotionData);
        console.log('- emotionData.unified:', emotionData?.unified);
        console.log('- Full message.data:', message.data);
      }

      const newEmotion = {
        userId,
        timestamp: timestamp || Date.now(),
        intensity: Math.abs(intensity), // 負の値の場合は絶対値を取る
        laughLevel: Math.abs(intensity) > 4200 ? 'high' : Math.abs(intensity) > 1800 ? 'medium' : 'low',
        confidence: confidence || 0,
        velocity: velocity || 0,
        features: features || {}
      };

      // 受信した感情データを状態に保存
      setReceivedEmotions(prev => {
        const newMap = new Map(prev);
        const userEmotions = newMap.get(userId) || [];

        const updatedEmotions = [...userEmotions, newEmotion].slice(-50);
        newMap.set(userId, updatedEmotions);

        console.log(`📈 Updated emotions for user ${userId}:`, updatedEmotions.length, 'total entries');
        console.log(`🎯 Latest emotion (intensity: ${intensity}):`, newEmotion);
        return newMap;
      });

    } catch (error) {
      console.error('Failed to handle emotion broadcast:', error);
    }
  }, []);

  // 感情処理確認メッセージ処理
  const handleEmotionProcessed = useCallback((message: EmotionProcessedMessage) => {
    console.log('✅ Emotion processing confirmed:', message.data.message);
  }, []);

  // ピア参加処理
  const handlePeerJoined = useCallback(async (message: PeerJoinedMessage) => {
    try {
      console.log('Peer joined:', message.peerId, message.username);

      // ピア接続を作成
      const connection = await webrtcActions.createPeerConnection(message.peerId, message.username);

      // データチャネルを作成（感情データ共有用）
      const dataChannel = connection.createDataChannel('emotions', {
        ordered: false, // リアルタイム性を重視
      });

      // ピアを追加
      webrtcActions.addPeer(message.peerId, message.username, connection);

      // Offerを作成して送信
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);

      const offerMessage = MessageHandler.createOfferMessage(
        currentUsername || 'anonymous',
        message.peerId,
        offer
      );

      sendSignalingMessage(offerMessage);

    } catch (error) {
      console.error('Failed to handle peer joined:', error);
      setError('ピア接続の作成に失敗しました');
    }
  }, [webrtcActions, currentUsername]);

  // ピア退出処理
  const handlePeerLeft = useCallback((message: PeerLeftMessage) => {
    console.log('Peer left:', message.peerId);
    webrtcActions.removePeer(message.peerId);
  }, [webrtcActions]);

  // WebRTCシグナリング処理
  const handleWebRTCSignaling = useCallback(async (message: WebRTCSignalingMessage) => {
    try {
      console.log('🔗 Received WebRTC signaling:', message.type, 'from:', message.from);

      // バックエンドからのOfferの場合は新しいピア接続を作成
      if ((message.type === 'webrtc-offer' || message.type === 'offer') && message.from === 'backend') {
        console.log('🔗 Creating new peer connection for backend');

        // バックエンドとのピア接続を作成
        const connection = await webrtcActions.createPeerConnection('backend', 'Backend Server');

        // Data Channelの受信準備
        connection.ondatachannel = (event) => {
          const dataChannel = event.channel;
          console.log('📥 Data channel received from backend:', dataChannel.label);

          // WebRTCContextのsetupDataChannelを使用
          webrtcActions.setupDataChannel?.(dataChannel, 'backend');
        };

        // ピアを追加
        webrtcActions.addPeer('backend', 'Backend Server', connection);

        // Offerを設定
        const offerData = message.data?.offer || message.data;
        await connection.setRemoteDescription(offerData as RTCSessionDescriptionInit);

        // Answerを作成して送信
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);

        const answerMessage = {
          type: 'webrtc-answer',
          from: currentUsername || 'anonymous',
          to: 'backend',
          room: currentRoomId,
          data: {
            answer: answer,
            peerId: 'backend'
          },
          timestamp: Date.now()
        };

        sendSignalingMessage(answerMessage);
        console.log('✅ Sent answer to backend');
        return;
      }

      // 既存のピア接続がある場合の処理
      const peer = webrtcState.peers.get(message.from);
      if (!peer) {
        console.warn('Received signaling for unknown peer:', message.from);
        return;
      }

      const { connection } = peer;

      switch (message.type) {
        case 'offer':
        case 'webrtc-offer':
          // Offerを受信
          const offerData = message.data?.offer || message.data;
          await connection.setRemoteDescription(offerData as RTCSessionDescriptionInit);

          // Answerを作成して送信
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);

          const answerMessage = MessageHandler.createAnswerMessage(
            currentUsername || 'anonymous',
            message.from,
            answer
          );

          sendSignalingMessage(answerMessage);
          break;

        case 'answer':
        case 'webrtc-answer':
          // Answerを受信
          const answerData = message.data?.answer || message.data;
          await connection.setRemoteDescription(answerData as RTCSessionDescriptionInit);
          break;

        case 'ice-candidate':
          // ICE候補を受信
          const candidateData = message.data?.candidate || message.data;
          const candidate = new RTCIceCandidate(candidateData as RTCIceCandidateInit);
          await connection.addIceCandidate(candidate);
          break;
      }
    } catch (error) {
      console.error('Failed to handle WebRTC signaling:', error);
      setError('WebRTCシグナリングの処理に失敗しました');
    }
  }, [webrtcState.peers, currentUsername, currentRoomId, webrtcActions]);

  // 接続
  const connect = useCallback(async () => {
    try {
      console.log('📡 connect() called - attempting WebSocket connection...');
      console.log('🔍 wsClientRef.current:', wsClientRef.current);
      console.log('🔍 Current connectionState:', connectionState);

      if (!wsClientRef.current) {
        throw new Error('WebSocket client not initialized');
      }

      // 現在のWebSocket状態を確認
      const currentState = wsClientRef.current.getConnectionState();
      console.log('🔍 WebSocket client state before connect:', currentState);

      setError(null);
      console.log('🚀 Calling wsClientRef.current.connect()...');
      await wsClientRef.current.connect();

      // 接続後の状態を確認
      const newState = wsClientRef.current.getConnectionState();
      console.log('✅ wsClientRef.current.connect() completed successfully');
      console.log('🔍 WebSocket client state after connect:', newState);
    } catch (error) {
      console.error('❌ Failed to connect to signaling server:', error);
      setError('シグナリングサーバーへの接続に失敗しました');
      throw error;
    }
  }, [connectionState]);

  // 切断
  const disconnect = useCallback(() => {
    console.log('🔌 disconnect() called');
    if (wsClientRef.current) {
      console.log('🔍 WebSocket state before disconnect:', wsClientRef.current.getConnectionState());
      wsClientRef.current.disconnect();
    }
    webrtcActions.cleanup();
    setCurrentRoomId(null);
    setCurrentUsername(null);
  }, [webrtcActions]);

  // ルーム参加
  const joinRoom = useCallback(async (roomId: string, username: string) => {
    try {
      console.log('🏠 joinRoom開始:', { roomId, username, connectionState, wsClient: !!wsClientRef.current });

      if (!wsClientRef.current) {
        throw new Error('WebSocket client not initialized');
      }

      // 🔧 緊急修正: connectionStateの代わりにWebSocketの状態を直接チェック
      const wsState = wsClientRef.current.getConnectionState();
      console.log('🔍 WebSocket状態:', wsState);

      if (wsState !== 'connected') {
        throw new Error(`WebSocket not connected, state: ${wsState}`);
      }

      // WebRTCを初期化
      await webrtcActions.initializeWebRTC();

      // ルーム参加メッセージを送信
      console.log('📤 ルーム参加メッセージを作成中...');
      const joinMessage = MessageHandler.createJoinRoomMessage(roomId, username);
      console.log('📤 送信メッセージ:', joinMessage);

      const success = sendSignalingMessage(joinMessage);
      console.log('📤 メッセージ送信結果:', success);

      if (!success) {
        throw new Error('Failed to send join room message');
      }

      setCurrentRoomId(roomId);
      setCurrentUsername(username);
      setError(null);

      // バックエンドとのWebRTC接続を開始
      console.log('🔗 バックエンドとのWebRTC接続を開始...');
      const startPeerMessage = {
        type: 'start-peer-connection',
        data: {
          remoteUserId: 'backend' // バックエンドとの接続
        },
        timestamp: Date.now()
      };

      const peerSuccess = sendSignalingMessage(startPeerMessage);
      console.log('🔗 WebRTC接続開始メッセージ送信結果:', peerSuccess);

    } catch (error) {
      console.error('❌ Failed to join room:', error);
      setError(`ルーム参加に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }, [connectionState, webrtcActions]);

  // ルーム退出
  const leaveRoom = useCallback((roomId: string) => {
    if (wsClientRef.current && currentRoomId === roomId) {
      const leaveMessage = MessageHandler.createLeaveRoomMessage(roomId);
      sendSignalingMessage(leaveMessage);

      webrtcActions.cleanup();
      setCurrentRoomId(null);
      setCurrentUsername(null);
    }
  }, [currentRoomId, webrtcActions]);

  // シグナリングメッセージ送信
  const sendSignalingMessage = useCallback((message: SignalingMessage): boolean => {
    if (!wsClientRef.current) {
      console.warn('WebSocket client not initialized');
      return false;
    }

    return wsClientRef.current.send(message);
  }, []);


  // 感情データ送信（WebSocket API準拠）
  const sendEmotionData = useCallback((landmarks: any[], userId: string, confidence: number = 0.9, normalizedLandmarks?: any[]): boolean => {
    if (!wsClientRef.current || !currentRoomId) {
      console.warn('Cannot send emotion data: WebSocket not connected or not in room');
      return false;
    }

    // 正規化されたランドマークがあればそれを優先、なければ元のランドマークを使用
    const landmarksToSend = normalizedLandmarks && normalizedLandmarks.length > 0 ? normalizedLandmarks : landmarks;

    if (!landmarksToSend || landmarksToSend.length === 0) {
      console.warn('No landmarks to send');
      return false;
    }

    // 正規化されたランドマークデータを送信
    const emotionMessage = {
      type: 'emotion',
      room: currentRoomId,
      data: {
        landmarks: flattenLandmarks(landmarksToSend),
        confidence: confidence,
        type: 'normalized-mediapipe', // 正規化済みを示すフラグ
        isNormalized: !!normalizedLandmarks // 正規化されているかどうかの明示的なフラグ
      }
    };

    console.log('📤 Sending emotion data via WebSocket:', {
      userId,
      originalLandmarkCount: landmarks.length,
      normalizedLandmarkCount: normalizedLandmarks?.length || 0,
      isNormalized: !!normalizedLandmarks,
      confidence,
      room: currentRoomId
    });

    console.log('📦 Full emotion message:', emotionMessage);

    return sendSignalingMessage(emotionMessage);
  }, [currentRoomId]);

  // ランドマークを平坦化（APIの形式に合わせて）
  const flattenLandmarks = useCallback((landmarks: any[]): number[] => {
    const flattened: number[] = [];
    landmarks.forEach(landmark => {
      flattened.push(landmark.x || 0, landmark.y || 0, landmark.z || 0);
    });
    return flattened;
  }, []);

  // WebSocket の状態を取得
  const getWebSocketState = useCallback((): ConnectionState | null => {
    return wsClientRef.current?.getConnectionState() || null;
  }, []);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    error,
    receivedEmotions,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendSignalingMessage,
    sendEmotionData,
    getWebSocketState,
  };
};