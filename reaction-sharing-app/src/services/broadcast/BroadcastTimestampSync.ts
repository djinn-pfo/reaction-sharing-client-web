import { generateUUID } from '../../utils/uuid';
import type { BroadcastTimestampMessage } from '../../types/signaling';

/**
 * Broadcast Timestamp Synchronization
 * Sends frame timestamps to viewers at regular intervals
 */
export class BroadcastTimestampSync {
  private roomId: string;
  private userId: string;
  private sequenceNumber: number = 0;
  private syncInterval: NodeJS.Timeout | null = null;
  private sendMessageFn: (message: BroadcastTimestampMessage) => boolean;

  constructor(
    roomId: string,
    userId: string,
    sendMessageFn: (message: BroadcastTimestampMessage) => boolean
  ) {
    this.roomId = roomId;
    this.userId = userId;
    this.sendMessageFn = sendMessageFn;
  }

  /**
   * Send frame timestamp to viewers
   * Call this for every video frame being broadcast
   */
  sendFrameTimestamp(videoFrameTimestamp?: number): string {
    const frameId = generateUUID();
    const message: BroadcastTimestampMessage = {
      type: 'broadcast-timestamp',
      room: this.roomId,
      from: this.userId,
      data: {
        frameId,
        broadcastTimestamp: videoFrameTimestamp || Date.now(),
        sequenceNumber: this.sequenceNumber++
      },
      timestamp: Date.now()
    };

    this.sendMessageFn(message);
    console.log(`[Broadcaster] Sent timestamp: frameId=${frameId.slice(0, 8)}, seq=${this.sequenceNumber - 1}`);
    return frameId;
  }

  /**
   * Start periodic timestamp sync at specified Hz
   * Default: 20Hz (50ms interval)
   */
  startPeriodicSync(intervalMs: number = 50): void {
    console.log(`[Broadcaster] Starting periodic timestamp sync at ${1000 / intervalMs}Hz`);
    this.syncInterval = setInterval(() => {
      this.sendFrameTimestamp();
    }, intervalMs);
  }

  /**
   * Stop periodic timestamp sync
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[Broadcaster] Stopped periodic timestamp sync');
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopPeriodicSync();
  }
}
