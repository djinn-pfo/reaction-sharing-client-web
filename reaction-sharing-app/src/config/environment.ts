interface AppConfig {
  appName: string;
  apiBaseUrl: string;
  signalingUrl: string;
  ionSfuUrl: string;
  stunServers: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxParticipants: number;
  videoResolution: string;
  targetFps: number;
}

export const config: AppConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'ReactionSharingPlatform',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.10:8080',
  signalingUrl: import.meta.env.VITE_SIGNALING_URL || 'ws://192.168.1.10:8080/ws',
  ionSfuUrl: import.meta.env.VITE_ION_SFU_URL || 'http://192.168.1.10:7000',
  stunServers: (import.meta.env.VITE_STUN_SERVERS || 'stun:stun.l.google.com:19302').split(','),
  logLevel: import.meta.env.VITE_LOG_LEVEL as AppConfig['logLevel'] || 'info',
  maxParticipants: parseInt(import.meta.env.VITE_MAX_PARTICIPANTS || '30'),
  videoResolution: import.meta.env.VITE_VIDEO_RESOLUTION || '360p',
  targetFps: parseInt(import.meta.env.VITE_TARGET_FPS || '30'),
};

// 環境変数の検証
export const validateConfig = (): void => {
  const required = ['signalingUrl', 'apiBaseUrl'];

  for (const key of required) {
    if (!config[key as keyof AppConfig]) {
      throw new Error(`Missing required environment variable: VITE_${key.toUpperCase()}`);
    }
  }

  console.log('App configuration loaded:', {
    ...config,
    // センシティブ情報をマスク
    apiBaseUrl: config.apiBaseUrl.replace(/\/\/.*@/, '//***@'),
  });
};