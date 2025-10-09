import type {
  BroadcastTimestampMessage,
  EmotionWithTimestampMessage
} from '../../types/signaling';

/**
 * Viewer Reaction Sender
 * Receives broadcast timestamps and sends reactions with timing info
 */
export class ViewerReactionSender {
  private roomId: string;
  private userId: string;
  private broadcasterUserId: string;
  private latestBroadcastTimestamp: number | null = null;
  private latestFrameId: string | null = null;
  private sendMessageFn: (message: EmotionWithTimestampMessage) => boolean;

  constructor(
    roomId: string,
    userId: string,
    broadcasterUserId: string,
    sendMessageFn: (message: EmotionWithTimestampMessage) => boolean
  ) {
    this.roomId = roomId;
    this.userId = userId;
    this.broadcasterUserId = broadcasterUserId;
    this.sendMessageFn = sendMessageFn;
  }

  /**
   * Handle incoming broadcast timestamp
   */
  handleBroadcastTimestamp(message: BroadcastTimestampMessage): void {
    const now = Date.now();
    const latency = now - message.data.broadcastTimestamp;

    this.latestBroadcastTimestamp = message.data.broadcastTimestamp;
    this.latestFrameId = message.data.frameId;

    console.log(
      `[Viewer] Received broadcast timestamp: frameId=${this.latestFrameId.slice(0, 8)}, ` +
      `latency=${latency}ms (sent at ${message.data.broadcastTimestamp}, received at ${now})`
    );

    if (latency > 100) {
      console.warn(`[Viewer] ⚠️ High timestamp latency: ${latency}ms`);
    }
  }

  /**
   * Send reaction with broadcast timestamp
   */
  sendReactionWithTimestamp(intensity: number, confidence: number): boolean {
    if (!this.latestBroadcastTimestamp || !this.latestFrameId) {
      console.warn('[Viewer] No broadcast timestamp available yet');
      return false;
    }

    const message: EmotionWithTimestampMessage = {
      type: 'emotion-with-timestamp',
      room: this.roomId,
      from: this.userId,
      to: this.broadcasterUserId,
      data: {
        userId: this.userId,
        intensity,
        confidence,
        broadcastTimestamp: this.latestBroadcastTimestamp,
        reactionSentTime: Date.now(),
        frameId: this.latestFrameId
      },
      timestamp: Date.now()
    };

    console.log('[Viewer] Attempting to send reaction:', {
      type: message.type,
      room: message.room,
      from: message.from,
      to: message.to,
      intensity,
      confidence,
      frameId: this.latestFrameId.slice(0, 8)
    });

    const success = this.sendMessageFn(message);
    if (success) {
      console.log(
        `[Viewer] ✅ Sent reaction: intensity=${intensity}, frameId=${this.latestFrameId.slice(0, 8)}`
      );
    } else {
      console.error('[Viewer] ❌ Failed to send reaction');
    }
    return success;
  }

  /**
   * Get current broadcast timestamp info
   */
  getCurrentTimestampInfo(): { broadcastTimestamp: number; frameId: string } | null {
    if (!this.latestBroadcastTimestamp || !this.latestFrameId) {
      return null;
    }
    return {
      broadcastTimestamp: this.latestBroadcastTimestamp,
      frameId: this.latestFrameId
    };
  }
}
