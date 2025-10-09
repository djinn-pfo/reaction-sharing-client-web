import type { EmotionWithTimestampMessage } from '../../types/signaling';
import type {
  LatencyStatistics,
  ReceivedReactionWithMetrics
} from '../../types/broadcast';

/**
 * Reaction Receiver (Broadcaster Side)
 * Receives reactions from viewers and tracks latency metrics
 */
export class ReactionReceiver {
  private latencyStats: {
    samples: number[];
    violations: number;
    total: number;
  } = {
    samples: [],
    violations: 0,
    total: 0
  };

  private reactionCallback?: (reaction: ReceivedReactionWithMetrics) => void;

  /**
   * Set callback for received reactions
   */
  setReactionCallback(callback: (reaction: ReceivedReactionWithMetrics) => void): void {
    this.reactionCallback = callback;
  }

  /**
   * Handle incoming reaction with metrics
   */
  handleReactionWithMetrics(message: EmotionWithTimestampMessage): void {
    console.log('[ReactionReceiver] Received reaction message:', {
      type: message.type,
      from: message.from,
      hasMetrics: !!message.metrics,
      data: message.data
    });

    const metrics = message.metrics;
    const data = message.data;

    if (!metrics) {
      console.warn('[ReactionReceiver] ❌ Received reaction without metrics - backend may not be calculating them');
      return;
    }

    console.log('[ReactionReceiver] ✅ Processing reaction with metrics:', metrics);

    // Track statistics
    this.latencyStats.total++;
    this.latencyStats.samples.push(metrics.broadcastToReceivedMs);
    if (!metrics.withinConstraint) {
      this.latencyStats.violations++;
    }

    // Call reaction callback
    if (this.reactionCallback) {
      this.reactionCallback({ data, metrics });
    }

    // Display reaction with quality indicator
    this.displayReaction(data, metrics);

    // Alert if latency violation
    if (!metrics.withinConstraint) {
      console.warn(
        `[Broadcaster] ⚠️ LATENCY VIOLATION: ${metrics.broadcastToReceivedMs}ms > 500ms for user ${data.userId}`
      );
    }
  }

  private displayReaction(
    data: EmotionWithTimestampMessage['data'],
    metrics: NonNullable<EmotionWithTimestampMessage['metrics']>
  ): void {
    const qualityEmoji = metrics.withinConstraint ? '✅' : '❌';
    const qualityClass = metrics.withinConstraint ? 'good-latency' : 'bad-latency';

    console.log(
      `[Broadcaster] ${qualityEmoji} Reaction from ${data.userId}: ` +
      `intensity=${data.intensity}, latency=${metrics.broadcastToReceivedMs}ms [${qualityClass}]`
    );
  }

  /**
   * Get latency statistics
   */
  getLatencyStatistics(): LatencyStatistics | null {
    if (this.latencyStats.samples.length === 0) {
      return null;
    }

    const sorted = [...this.latencyStats.samples].sort((a, b) => a - b);
    return {
      mean: this.latencyStats.samples.reduce((a, b) => a + b, 0) / this.latencyStats.samples.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      violations: this.latencyStats.violations,
      total: this.latencyStats.total,
      violationRate: this.latencyStats.violations / this.latencyStats.total
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.latencyStats = {
      samples: [],
      violations: 0,
      total: 0
    };
  }
}
