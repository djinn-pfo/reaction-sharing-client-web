import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { config } from '../config/environment';
import type { FaceLandmark } from '../hooks/useMediaPipe';
import type {
  WebRTCState,
  WebRTCAction,
  WebRTCContextValue,
  RTCConnectionState,
} from '../types/webrtc';

// 初期状態
const initialState: WebRTCState = {
  isInitialized: false,
  localStream: null,
  peers: new Map(),
  connectionState: 'new',
  error: null,
  receivedEmotions: new Map(),
};

// WebRTCReducer
const webrtcReducer = (state: WebRTCState, action: WebRTCAction): WebRTCState => {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        isInitialized: true,
        localStream: action.payload.localStream,
        error: null,
      };

    case 'ADD_PEER': {
      const newPeers = new Map(state.peers);
      newPeers.set(action.payload.peerId, {
        id: action.payload.peerId,
        username: action.payload.username,
        connection: action.payload.connection,
        connectionState: 'new',
      });
      return {
        ...state,
        peers: newPeers,
      };
    }

    case 'REMOVE_PEER': {
      const newPeers = new Map(state.peers);
      const peer = newPeers.get(action.payload.peerId);
      if (peer) {
        // リソースのクリーンアップ
        peer.connection.close();
        peer.dataChannel?.close();
        newPeers.delete(action.payload.peerId);
      }
      return {
        ...state,
        peers: newPeers,
      };
    }

    case 'UPDATE_PEER_CONNECTION_STATE': {
      const newPeers = new Map(state.peers);
      const peer = newPeers.get(action.payload.peerId);
      if (peer) {
        newPeers.set(action.payload.peerId, {
          ...peer,
          connectionState: action.payload.state,
        });
      }
      return {
        ...state,
        peers: newPeers,
      };
    }

    case 'SET_PEER_REMOTE_STREAM': {
      const newPeers = new Map(state.peers);
      const peer = newPeers.get(action.payload.peerId);
      if (peer) {
        newPeers.set(action.payload.peerId, {
          ...peer,
          remoteStream: action.payload.stream,
        });
      }
      return {
        ...state,
        peers: newPeers,
      };
    }

    case 'SET_PEER_DATA_CHANNEL': {
      const newPeers = new Map(state.peers);
      const peer = newPeers.get(action.payload.peerId);
      if (peer) {
        newPeers.set(action.payload.peerId, {
          ...peer,
          dataChannel: action.payload.dataChannel,
        });
      }
      return {
        ...state,
        peers: newPeers,
      };
    }

    case 'SET_CONNECTION_STATE':
      return {
        ...state,
        connectionState: action.payload.state,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload.error,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'ADD_RECEIVED_EMOTION': {
      const { userId, emotionData } = action.payload;
      const newReceivedEmotions = new Map(state.receivedEmotions);
      const userEmotions = newReceivedEmotions.get(userId) || [];

      // 最新の50件のみ保持（グラフ表示用）
      const updatedEmotions = [...userEmotions, emotionData].slice(-50);
      newReceivedEmotions.set(userId, updatedEmotions);

      return {
        ...state,
        receivedEmotions: newReceivedEmotions,
      };
    }

    case 'CLEANUP':
      // 全てのピア接続をクリーンアップ
      state.peers.forEach((peer) => {
        peer.connection.close();
        peer.dataChannel?.close();
      });

      // ローカルストリームを停止
      state.localStream?.getTracks().forEach(track => track.stop());

      return {
        ...initialState,
      };

    default:
      return state;
  }
};

// コンテキスト作成
const WebRTCContext = createContext<WebRTCContextValue | null>(null);

// WebRTCプロバイダー
export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(webrtcReducer, initialState);

  // WebRTC初期化
  const initializeWebRTC = useCallback(async (constraints?: MediaStreamConstraints) => {
    try {
      dispatch({ type: 'CLEAR_ERROR' });

      const defaultConstraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      const localStream = await navigator.mediaDevices.getUserMedia(
        constraints || defaultConstraints
      );

      dispatch({
        type: 'INITIALIZE',
        payload: { localStream },
      });

    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: { error: `WebRTC初期化に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}` },
      });
      throw error;
    }
  }, []);

  // ピア接続作成
  const createPeerConnection = useCallback(async (peerId: string, _username: string): Promise<RTCPeerConnection> => {
    try {
      const rtcConfig: RTCConfiguration = {
        iceServers: config.stunServers.map(url => ({ urls: url })),
        iceCandidatePoolSize: 10,
      };

      const connection = new RTCPeerConnection(rtcConfig);

      // ローカルストリームを追加
      if (state.localStream) {
        state.localStream.getTracks().forEach(track => {
          connection.addTrack(track, state.localStream!);
        });
      }

      // イベントハンドラー設定
      connection.onconnectionstatechange = () => {
        dispatch({
          type: 'UPDATE_PEER_CONNECTION_STATE',
          payload: {
            peerId,
            state: connection.connectionState as RTCConnectionState,
          },
        });
      };

      connection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        dispatch({
          type: 'SET_PEER_REMOTE_STREAM',
          payload: { peerId, stream: remoteStream },
        });
      };

      connection.ondatachannel = (event) => {
        const dataChannel = event.channel;
        setupDataChannel(dataChannel, peerId);
        dispatch({
          type: 'SET_PEER_DATA_CHANNEL',
          payload: { peerId, dataChannel },
        });
      };

      return connection;
    } catch (error) {
      console.error('Failed to create peer connection:', error);
      throw error;
    }
  }, [state.localStream]);

  // データチャネルのセットアップ
  const setupDataChannel = useCallback((dataChannel: RTCDataChannel, peerId: string) => {
    dataChannel.onopen = () => {
      console.log(`Data channel opened for peer: ${peerId}`);
    };

    dataChannel.onclose = () => {
      console.log(`Data channel closed for peer: ${peerId}`);
    };

    dataChannel.onerror = (error) => {
      console.error(`Data channel error for peer ${peerId}:`, error);
    };

    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`📥 Received emotion data from peer ${peerId}:`, data);

        // バックエンドからの感情データを処理
        if (data.userId && data.data && typeof data.data.intensity === 'number') {
          const emotionData = {
            userId: data.userId,
            timestamp: data.timestamp || Date.now(),
            intensity: data.data.intensity,
            laughLevel: data.data.laughLevel || 'low',
            confidence: data.data.confidence || 0.0
          };

          // stateに追加
          dispatch({
            type: 'ADD_RECEIVED_EMOTION',
            payload: { userId: data.userId, emotionData }
          });

          console.log(`😊 Processed emotion: ${data.userId} intensity=${data.data.intensity}`);
        }
      } catch (error) {
        console.error('Failed to parse data channel message:', error);
      }
    };
  }, []);

  // ピア追加
  const addPeer = useCallback((peerId: string, username: string, connection: RTCPeerConnection) => {
    dispatch({
      type: 'ADD_PEER',
      payload: { peerId, username, connection },
    });
  }, []);

  // ピア削除
  const removePeer = useCallback((peerId: string) => {
    dispatch({
      type: 'REMOVE_PEER',
      payload: { peerId },
    });
  }, []);

  // ピアにデータ送信
  const sendDataToPeer = useCallback((peerId: string, data: any): boolean => {
    const peer = state.peers.get(peerId);
    if (!peer?.dataChannel || peer.dataChannel.readyState !== 'open') {
      console.warn(`Cannot send data to peer ${peerId}: data channel not ready`);
      return false;
    }

    try {
      peer.dataChannel.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Failed to send data to peer ${peerId}:`, error);
      return false;
    }
  }, [state.peers]);

  // 全ピアにデータ配信
  const broadcastData = useCallback((data: any) => {
    let successCount = 0;
    state.peers.forEach((_peer, peerId) => {
      if (sendDataToPeer(peerId, data)) {
        successCount++;
      }
    });
    console.log(`Broadcasted data to ${successCount}/${state.peers.size} peers`);
  }, [state.peers, sendDataToPeer]);

  // 正規化済みランドマークデータ送信（サーバ側で感情計算）
  const sendEmotionData = useCallback((normalizedLandmarks: FaceLandmark[], userId: string, confidence: number = 0.9) => {
    if (!normalizedLandmarks || normalizedLandmarks.length === 0) {
      console.warn('No normalized landmarks to send');
      return false;
    }

    // 正規化済みランドマークをサーバに送信（感情値はサーバ側で計算）
    const landmarkData = {
      userId,
      timestamp: Date.now(),
      type: "mediapipe",
      data: {
        confidence,
        landmarks: flattenLandmarks(normalizedLandmarks),
        velocityModel: "nonlinear_damper"
      }
    };

    console.log('📤 Sending normalized landmark data via WebRTC Data Channel:', {
      userId,
      landmarkCount: normalizedLandmarks.length,
      confidence,
      peerCount: state.peers.size
    });

    broadcastData(landmarkData);
    return true;
  }, [broadcastData, state.peers.size]);


  // ランドマークを平坦化（APIの形式に合わせて）
  const flattenLandmarks = useCallback((landmarks: FaceLandmark[]): number[] => {
    const flattened: number[] = [];
    landmarks.forEach(landmark => {
      flattened.push(landmark.x, landmark.y, landmark.z || 0);
    });
    return flattened;
  }, []);

  // クリーンアップ
  const cleanup = useCallback(() => {
    dispatch({ type: 'CLEANUP' });
  }, []);

  const contextValue: WebRTCContextValue = {
    state,
    actions: {
      initializeWebRTC,
      createPeerConnection,
      addPeer,
      removePeer,
      sendDataToPeer,
      broadcastData,
      sendEmotionData,
      setupDataChannel,
      cleanup,
    },
  };

  return (
    <WebRTCContext.Provider value={contextValue}>
      {children}
    </WebRTCContext.Provider>
  );
};

// WebRTCコンテキストを使用するカスタムフック
export const useWebRTC = (): WebRTCContextValue => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};