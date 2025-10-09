import { useState, useEffect, useRef, useCallback } from 'react';
import { useSignaling } from './useSignaling';
import { ViewerReactionSender } from '../services/viewer';
import type { BroadcastTimestampMessage } from '../types/signaling';

interface UseViewerOptions {
  roomId: string;
  userId: string;
  broadcasterUserId: string;
}

interface UseViewerReturn {
  hasTimestamp: boolean;
  currentTimestampInfo: { broadcastTimestamp: number; frameId: string } | null;
  sendReaction: (intensity: number, confidence: number) => boolean;
  connectionState: string;
  joinRoom: () => Promise<void>;
}

export const useViewer = (options: UseViewerOptions): UseViewerReturn => {
  const { roomId, userId, broadcasterUserId } = options;

  const [hasTimestamp, setHasTimestamp] = useState(false);
  const [currentTimestampInfo, setCurrentTimestampInfo] = useState<{
    broadcastTimestamp: number;
    frameId: string;
  } | null>(null);

  const reactionSenderRef = useRef<ViewerReactionSender | null>(null);

  // Handle broadcast timestamp messages
  const handleBroadcastTimestamp = useCallback((message: BroadcastTimestampMessage) => {
    console.log('[useViewer] Received broadcast timestamp:', message);
    if (reactionSenderRef.current) {
      reactionSenderRef.current.handleBroadcastTimestamp(message);
      const info = reactionSenderRef.current.getCurrentTimestampInfo();
      setCurrentTimestampInfo(info);
      setHasTimestamp(info !== null);
      console.log('[useViewer] Updated timestamp info:', info);
    }
  }, []);

  // Setup signaling with broadcast timestamp callback
  const {
    sendEmotionWithTimestamp,
    connectionState,
    connect,
    joinRoom: joinSignalingRoom,
  } = useSignaling({
    onBroadcastTimestamp: handleBroadcastTimestamp,
  });

  // Join room on mount
  const joinRoom = useCallback(async () => {
    try {
      console.log('[useViewer] Connecting to WebSocket...');
      await connect();
      console.log('[useViewer] Connected! Joining room:', roomId, 'as user:', userId);
      await joinSignalingRoom(roomId, userId);
      console.log('[useViewer] ✅ Successfully joined room:', roomId);
    } catch (error) {
      console.error('[useViewer] ❌ Failed to join room:', error);
    }
  }, [connect, joinSignalingRoom, roomId, userId]);

  // Auto-join room
  useEffect(() => {
    console.log('[useViewer] Auto-joining room...');
    joinRoom();
  }, [joinRoom]);

  // Initialize
  useEffect(() => {
    reactionSenderRef.current = new ViewerReactionSender(
      roomId,
      userId,
      broadcasterUserId,
      sendEmotionWithTimestamp
    );

    console.log('[useViewer] Initialized viewer reaction sender');
  }, [roomId, userId, broadcasterUserId, sendEmotionWithTimestamp]);

  const sendReaction = useCallback((intensity: number, confidence: number): boolean => {
    if (!reactionSenderRef.current) {
      console.warn('[useViewer] Reaction sender not initialized');
      return false;
    }

    return reactionSenderRef.current.sendReactionWithTimestamp(intensity, confidence);
  }, []);

  return {
    hasTimestamp,
    currentTimestampInfo,
    sendReaction,
    connectionState,
    joinRoom,
  };
};
