import { useState, useEffect, useRef, useCallback } from 'react';
import { useSignaling } from './useSignaling';
import { BroadcastTimestampSync, ReactionReceiver } from '../services/broadcast';
import type { ReceivedReactionWithMetrics, LatencyStatistics } from '../types/broadcast';
import type { EmotionWithTimestampMessage } from '../types/signaling';

interface UseBroadcastOptions {
  roomId: string;
  userId: string;
  syncIntervalMs?: number; // Default: 50ms (20Hz)
  autoStart?: boolean;
}

interface UseBroadcastReturn {
  isActive: boolean;
  startBroadcast: () => void;
  stopBroadcast: () => void;
  receivedReactions: ReceivedReactionWithMetrics[];
  latencyStats: LatencyStatistics | null;
  resetStats: () => void;
  connectionState: string;
  joinRoom: () => Promise<void>;
}

export const useBroadcast = (options: UseBroadcastOptions): UseBroadcastReturn => {
  const { roomId, userId, syncIntervalMs = 50, autoStart = false } = options;

  const [isActive, setIsActive] = useState(false);
  const [receivedReactions, setReceivedReactions] = useState<ReceivedReactionWithMetrics[]>([]);
  const [latencyStats, setLatencyStats] = useState<LatencyStatistics | null>(null);

  const timestampSyncRef = useRef<BroadcastTimestampSync | null>(null);
  const reactionReceiverRef = useRef<ReactionReceiver | null>(null);

  // Handle emotion with timestamp messages
  const handleEmotionWithTimestamp = useCallback((message: EmotionWithTimestampMessage) => {
    console.log('[useBroadcast] Received emotion with timestamp:', message);
    if (reactionReceiverRef.current) {
      reactionReceiverRef.current.handleReactionWithMetrics(message);
    }
  }, []);

  // Setup signaling with emotion timestamp callback
  const {
    sendBroadcastTimestamp,
    connectionState,
    connect,
    joinRoom: joinSignalingRoom,
  } = useSignaling({
    onEmotionWithTimestamp: handleEmotionWithTimestamp,
  });

  // Join room on mount
  const joinRoom = useCallback(async () => {
    try {
      console.log('[useBroadcast] Connecting to WebSocket...');
      await connect();
      console.log('[useBroadcast] Connected! Joining room:', roomId, 'as user:', userId);
      await joinSignalingRoom(roomId, userId);
      console.log('[useBroadcast] ✅ Successfully joined room:', roomId);
    } catch (error) {
      console.error('[useBroadcast] ❌ Failed to join room:', error);
    }
  }, [connect, joinSignalingRoom, roomId, userId]);

  // Auto-join room
  useEffect(() => {
    console.log('[useBroadcast] Auto-joining room...');
    joinRoom();
  }, [joinRoom]);

  // Callbacks first (before useEffects that use them)
  const startBroadcast = useCallback(() => {
    console.log('[useBroadcast] startBroadcast called, timestampSyncRef:', !!timestampSyncRef.current, 'isActive:', isActive);
    if (timestampSyncRef.current && !isActive) {
      timestampSyncRef.current.startPeriodicSync(syncIntervalMs);
      setIsActive(true);
      console.log('[useBroadcast] ✅ Broadcasting started with interval:', syncIntervalMs, 'ms');
    } else {
      console.log('[useBroadcast] ❌ Cannot start broadcasting - timestampSyncRef:', !!timestampSyncRef.current, 'isActive:', isActive);
    }
  }, [isActive, syncIntervalMs]);

  // Initialize
  useEffect(() => {
    console.log('[useBroadcast] Initializing broadcast services...');

    // Create timestamp sync instance
    timestampSyncRef.current = new BroadcastTimestampSync(
      roomId,
      userId,
      sendBroadcastTimestamp
    );
    console.log('[useBroadcast] ✅ BroadcastTimestampSync created');

    // Create reaction receiver instance
    reactionReceiverRef.current = new ReactionReceiver();
    reactionReceiverRef.current.setReactionCallback((reaction) => {
      console.log('[useBroadcast] Reaction callback triggered:', reaction);
      setReceivedReactions((prev) => [...prev, reaction].slice(-100)); // Keep last 100
      // Update stats
      const stats = reactionReceiverRef.current?.getLatencyStatistics();
      if (stats) {
        setLatencyStats(stats);
      }
    });
    console.log('[useBroadcast] ✅ ReactionReceiver created');

    return () => {
      console.log('[useBroadcast] Cleaning up broadcast services...');
      timestampSyncRef.current?.cleanup();
    };
  }, [roomId, userId, sendBroadcastTimestamp]);

  // Auto start when connected
  useEffect(() => {
    if (autoStart && connectionState === 'connected' && timestampSyncRef.current && !isActive) {
      console.log('[useBroadcast] Auto-starting broadcast...');
      startBroadcast();
    }
  }, [autoStart, connectionState, isActive, startBroadcast]);

  const stopBroadcast = useCallback(() => {
    if (timestampSyncRef.current && isActive) {
      timestampSyncRef.current.stopPeriodicSync();
      setIsActive(false);
      console.log('[useBroadcast] Stopped broadcasting');
    }
  }, [isActive]);

  const resetStats = useCallback(() => {
    reactionReceiverRef.current?.resetStatistics();
    setReceivedReactions([]);
    setLatencyStats(null);
  }, []);

  return {
    isActive,
    startBroadcast,
    stopBroadcast,
    receivedReactions,
    latencyStats,
    resetStats,
    connectionState,
    joinRoom,
  };
};
