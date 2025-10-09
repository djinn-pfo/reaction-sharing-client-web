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

  // Initialize session manager
  useEffect(() => {
    console.log('🔧 [useIonSession] Initializing session manager');

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
      onRemoteTrack: (stream) => {
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

    return () => {
      console.log('🧹 [useIonSession] Cleaning up session');
      session.leave();
    };
  }, [options.roomId, options.userId, options.sendIonMessage, options.noPublish, options.noSubscribe]);

  // Handle incoming Ion messages
  useEffect(() => {
    if (!options.onIonMessage) return;

    // Wrap the onIonMessage callback to route to session manager
    const handleIonMessage = (message: IonMessage) => {
      if (sessionRef.current) {
        sessionRef.current.handleMessage(message);
      }
    };

    // Register this handler - note: parent should call this via onIonMessage callback
    // This is just for documentation
    return () => {
      // Cleanup if needed
    };
  }, [options.onIonMessage]);

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
