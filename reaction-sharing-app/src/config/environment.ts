interface AppConfig {
  env: 'development' | 'production';
  appName: string;
  apiBaseUrl: string;
  signalingUrl: string;
  ionSfuUrl: string;
  laughApiUrl: string;
  staticBaseUrl: string;
  iceServers: RTCIceServer[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxParticipants: number;
  videoResolution: string;
  targetFps: number;
}

// Parse ICE servers (STUN + TURN with credentials)
const parseIceServers = (): RTCIceServer[] => {
  const serverUrls = (import.meta.env.VITE_STUN_SERVERS || 'stun:stun.l.google.com:19302')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);

  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnPassword = import.meta.env.VITE_TURN_PASSWORD;

  return serverUrls.map((url: string) => {
    if (url.startsWith('turn:')) {
      // TURN server requires credentials
      return {
        urls: url,
        username: turnUsername,
        credential: turnPassword,
      };
    } else {
      // STUN server
      return { urls: url };
    }
  });
};

export const config: AppConfig = {
  env: import.meta.env.MODE as 'development' | 'production',
  appName: import.meta.env.VITE_APP_NAME || 'ReactionSharingPlatform',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://192.168.3.39:8080',
  signalingUrl: import.meta.env.VITE_SIGNALING_URL || 'ws://192.168.3.39:8080/ws',
  ionSfuUrl: import.meta.env.VITE_ION_SFU_URL || 'http://192.168.3.39:7000',
  laughApiUrl: import.meta.env.VITE_LAUGH_API_URL || 'http://localhost:5001',
  staticBaseUrl: import.meta.env.VITE_STATIC_BASE_URL || 'http://localhost:8080',
  iceServers: parseIceServers(),
  logLevel: import.meta.env.VITE_LOG_LEVEL as AppConfig['logLevel'] || 'info',
  maxParticipants: parseInt(import.meta.env.VITE_MAX_PARTICIPANTS || '30'),
  videoResolution: import.meta.env.VITE_VIDEO_RESOLUTION || '360p',
  targetFps: parseInt(import.meta.env.VITE_TARGET_FPS || '30'),
};

// 本番環境チェック
export const isProd = () => config.env === 'production';
export const isDev = () => config.env === 'development';

// 環境変数の検証
export const validateConfig = (): void => {
  const required: (keyof AppConfig)[] = [
    'apiBaseUrl',
    'signalingUrl',
    'ionSfuUrl',
    'laughApiUrl',
    'staticBaseUrl'
  ];

  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map(k => `VITE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`).join(', ')}`
    );
  }

  console.log(`🚀 App running in ${config.env} mode:`, {
    appName: config.appName,
    apiBaseUrl: config.apiBaseUrl,
    signalingUrl: config.signalingUrl,
    ionSfuUrl: config.ionSfuUrl,
    laughApiUrl: config.laughApiUrl,
    staticBaseUrl: config.staticBaseUrl,
    logLevel: config.logLevel,
    maxParticipants: config.maxParticipants,
    videoResolution: config.videoResolution,
    targetFps: config.targetFps,
  });
};