import { useEffect, useRef, useState, useCallback } from 'react';
import { IonSessionManager } from '../services/ionSfu/IonSessionManager';
import type { IonMessage } from '../types/ion';

export interface UseIonSessionOptions {
  roomId: string;
  userId: string;
  autoJoin?: boolean;
  noPublish?: boolean;
  noSubscribe?: boolean;
  sendIonMessage: (msg: IonMessage) => void;
  onIonMessage?: (msg: IonMessage) => void;
}

export function useIonSession(options: UseIonSessionOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [error, setError] = useState<Error | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const sessionRef = useRef<IonSessionManager | null>(null);
  // Queue for messages received before session is ready
  const pendingMessagesRef = useRef<IonMessage[]>([]);

  // Initialize session manager
  // IMPORTANT: Wait for role determination before creating session
  // noPublish and noSubscribe depend on isBroadcaster being determined
  useEffect(() => {
    // Don't create session until role is determined
    if (options.noPublish === undefined || options.noSubscribe === undefined) {
      console.log('🔧 [useIonSession] Waiting for role determination (noPublish/noSubscribe undefined)');
      return;
    }

    console.log('🔧 [useIonSession] Initializing session manager', {
      noPublish: options.noPublish,
      noSubscribe: options.noSubscribe,
    });

    const session = new IonSessionManager(
      {
        roomId: options.roomId,
        userId: options.userId,
        noPublish: options.noPublish,
        noSubscribe: options.noSubscribe,
      },
      options.sendIonMessage
    );

    session.setEventHandlers({
      onRemoteTrack: () => {
        console.log('📺 [useIonSession] New remote stream received');
        setRemoteStreams(session.getRemoteStreams());
      },
      onConnectionStateChange: (state) => {
        console.log('🔌 [useIonSession] Connection state changed:', state);
        setConnectionState(state);
      },
      onError: (err) => {
        console.error('❌ [useIonSession] Error:', err);
        setError(err);
      },
    });

    sessionRef.current = session;

    // Process any pending messages that arrived before session was ready
    if (pendingMessagesRef.current.length > 0) {
      console.log(`📬 [useIonSession] Processing ${pendingMessagesRef.current.length} pending messages`);
      pendingMessagesRef.current.forEach((msg) => {
        console.log(`📬 [useIonSession] Processing queued message: ${msg.type}`);
        session.handleMessage(msg);
      });
      pendingMessagesRef.current = [];
    }

    return () => {
      console.log('🧹 [useIonSession] Cleaning up session');
      session.leave();
    };
  }, [options.roomId, options.userId, options.noPublish, options.noSubscribe]);

  // Handle incoming Ion messages - handled via handleMessage function below
  // This useEffect is no longer needed as we export handleMessage directly

  // Get local media and join
  const join = useCallback(async (stream?: MediaStream) => {
    try {
      console.log('🚀 [useIonSession] Starting join process');
      setError(null);

      let mediaStream = stream;

      // Get media if not provided
      if (!mediaStream) {
        console.log('📹 [useIonSession] Getting user media');
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: 30 },
          audio: true,
        });
      }

      setLocalStream(mediaStream);

      if (sessionRef.current) {
        console.log('📤 [useIonSession] Sending join request to Ion-SFU');
        await sessionRef.current.join(mediaStream);
        setIsJoined(true);
        console.log('✅ [useIonSession] Join process completed');
      } else {
        // Session not initialized yet - throw error to allow retry
        console.warn('⚠️ [useIonSession] Session not initialized yet, cannot join');
        throw new Error('IonSession not initialized - will retry');
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('❌ [useIonSession] Failed to join:', error);
      throw error;
    }
  }, []);

  // Leave room
  const leave = useCallback(() => {
    console.log('🚪 [useIonSession] Leaving room');
    if (sessionRef.current) {
      sessionRef.current.leave();
      setLocalStream(null);
      setRemoteStreams([]);
      setIsJoined(false);
      setConnectionState('closed');
    }
  }, []);

  // Auto-join if enabled
  useEffect(() => {
    if (options.autoJoin && !isJoined) {
      console.log('🤖 [useIonSession] Auto-joining');
      join();
    }
  }, [options.autoJoin, isJoined, join]);

  // Expose handleMessage for parent components
  const handleMessage = useCallback((message: IonMessage) => {
    if (sessionRef.current) {
      sessionRef.current.handleMessage(message);
    } else {
      // Queue message if session not ready yet
      console.warn(`⚠️ [useIonSession] Session not ready, queuing message: ${message.type}`);
      pendingMessagesRef.current.push(message);
    }
  }, []);

  return {
    localStream,
    remoteStreams,
    connectionState,
    error,
    isJoined,
    join,
    leave,
    handleMessage, // Export this so parent can route Ion messages
  };
}
