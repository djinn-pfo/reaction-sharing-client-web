// WebRTC接続状態
export type RTCConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

// ピア情報
export interface PeerInfo {
  id: string;
  username: string;
  connection: RTCPeerConnection;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  dataChannel?: RTCDataChannel;
  connectionState: RTCConnectionState;
}

// WebRTC設定
export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  dataChannelConfig: RTCDataChannelInit;
  mediaConstraints: MediaStreamConstraints;
}

// ProcessResult構造体の特徴量データ
export interface FeatureResults {
  reference?: any;
  density?: any;
  mouth?: any;
}

// ProcessResult構造体（バックエンドから返される）
export interface ProcessResult {
  features: FeatureResults;
  velocity: number;
  intensity: number;
  confidence: number;
}

// 受信した感情データ
export interface ReceivedEmotionData {
  userId: string;
  timestamp: number;
  intensity: number;
  laughLevel: "low" | "medium" | "high";
  confidence: number;
  velocity?: number;
  features?: FeatureResults;
}

// WebRTCコンテキストの状態
export interface WebRTCState {
  isInitialized: boolean;
  localStream: MediaStream | null;
  peers: Map<string, PeerInfo>;
  connectionState: RTCConnectionState;
  error: string | null;
  receivedEmotions: Map<string, ReceivedEmotionData[]>;
}

// WebRTCアクション
export type WebRTCAction =
  | { type: 'INITIALIZE'; payload: { localStream: MediaStream } }
  | { type: 'ADD_PEER'; payload: { peerId: string; username: string; connection: RTCPeerConnection } }
  | { type: 'REMOVE_PEER'; payload: { peerId: string } }
  | { type: 'UPDATE_PEER_CONNECTION_STATE'; payload: { peerId: string; state: RTCConnectionState } }
  | { type: 'SET_PEER_REMOTE_STREAM'; payload: { peerId: string; stream: MediaStream } }
  | { type: 'SET_PEER_DATA_CHANNEL'; payload: { peerId: string; dataChannel: RTCDataChannel } }
  | { type: 'SET_CONNECTION_STATE'; payload: { state: RTCConnectionState } }
  | { type: 'SET_ERROR'; payload: { error: string } }
  | { type: 'CLEAR_ERROR' }
  | { type: 'ADD_RECEIVED_EMOTION'; payload: { userId: string; emotionData: ReceivedEmotionData } }
  | { type: 'CLEANUP' };

// WebRTCコンテキストの値
export interface WebRTCContextValue {
  state: WebRTCState;
  actions: {
    initializeWebRTC: (constraints?: MediaStreamConstraints) => Promise<void>;
    createPeerConnection: (peerId: string, username: string) => Promise<RTCPeerConnection>;
    addPeer: (peerId: string, username: string, connection: RTCPeerConnection) => void;
    removePeer: (peerId: string) => void;
    sendDataToPeer: (peerId: string, data: any) => boolean;
    broadcastData: (data: any) => void;
    sendEmotionData: (landmarks: any[], userId: string, confidence?: number) => boolean;
    setupDataChannel: (dataChannel: RTCDataChannel, peerId: string) => void;
    cleanup: () => void;
  };
}