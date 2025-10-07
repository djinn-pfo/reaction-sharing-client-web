/**
 * Broadcast Timestamp Synchronization Client Example
 *
 * This example demonstrates:
 * 1. Broadcaster sending frame timestamps at 20Hz (50ms interval)
 * 2. Viewer receiving timestamps and sending reactions
 * 3. Broadcaster receiving reactions with latency metrics
 */

// ========================================
// Broadcaster Implementation
// ========================================

class BroadcastTimestampSync {
  constructor(websocket, roomId, userId) {
    this.ws = websocket;
    this.roomId = roomId;
    this.userId = userId;
    this.sequenceNumber = 0;
    this.syncInterval = null;
  }

  /**
   * Send frame timestamp to viewers
   * Call this for every video frame being broadcast
   */
  sendFrameTimestamp(videoFrameTimestamp) {
    const frameId = this.generateUUID();
    const message = {
      type: 'broadcast-timestamp',
      room: this.roomId,
      from: this.userId,
      data: {
        frameId: frameId,
        broadcastTimestamp: videoFrameTimestamp || Date.now(),
        sequenceNumber: this.sequenceNumber++
      },
      timestamp: Date.now()
    };

    this.ws.send(JSON.stringify(message));
    console.log(`[Broadcaster] Sent timestamp: frameId=${frameId.slice(0, 8)}, seq=${this.sequenceNumber - 1}`);
    return frameId;
  }

  /**
   * Start periodic timestamp sync at 20Hz (50ms interval)
   * Ensures viewers always have recent broadcast timestamps
   */
  startPeriodicSync(intervalMs = 50) {
    console.log(`[Broadcaster] Starting periodic timestamp sync at ${1000 / intervalMs}Hz`);
    this.syncInterval = setInterval(() => {
      this.sendFrameTimestamp();
    }, intervalMs);
  }

  /**
   * Stop periodic timestamp sync
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      console.log('[Broadcaster] Stopped periodic timestamp sync');
    }
  }

  /**
   * Generate UUID v4
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// ========================================
// Viewer Implementation
// ========================================

class ViewerReactionSender {
  constructor(websocket, roomId, userId, broadcasterUserId) {
    this.ws = websocket;
    this.roomId = roomId;
    this.userId = userId;
    this.broadcasterUserId = broadcasterUserId;
    this.latestBroadcastTimestamp = null;
    this.latestFrameId = null;

    // Listen for broadcast timestamps
    this.setupMessageListener();
  }

  setupMessageListener() {
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'broadcast-timestamp') {
        this.latestBroadcastTimestamp = msg.data.broadcastTimestamp;
        this.latestFrameId = msg.data.frameId;
        console.log(`[Viewer] Received broadcast timestamp: frameId=${this.latestFrameId.slice(0, 8)}, t=${this.latestBroadcastTimestamp}`);
      }
    });
  }

  /**
   * Send reaction with broadcast timestamp
   * @param {number} intensity - Emotion intensity (0-100)
   * @param {number} confidence - Confidence score (0.0-1.0)
   */
  sendReactionWithTimestamp(intensity, confidence) {
    if (!this.latestBroadcastTimestamp) {
      console.warn('[Viewer] No broadcast timestamp available yet');
      return;
    }

    const message = {
      type: 'emotion-with-timestamp',
      room: this.roomId,
      from: this.userId,
      to: this.broadcasterUserId,
      data: {
        userId: this.userId,
        intensity: intensity,
        confidence: confidence,
        broadcastTimestamp: this.latestBroadcastTimestamp,
        reactionSentTime: Date.now(),
        frameId: this.latestFrameId
      },
      timestamp: Date.now()
    };

    this.ws.send(JSON.stringify(message));
    console.log(`[Viewer] Sent reaction: intensity=${intensity}, frameId=${this.latestFrameId.slice(0, 8)}`);
  }
}

// ========================================
// Reaction Receiver (Broadcaster Side)
// ========================================

class ReactionReceiver {
  constructor(websocket) {
    this.ws = websocket;
    this.latencyStats = {
      samples: [],
      violations: 0,
      total: 0
    };

    this.setupMessageListener();
  }

  setupMessageListener() {
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'emotion-with-timestamp' && msg.metrics) {
        this.handleReactionWithMetrics(msg);
      }
    });
  }

  handleReactionWithMetrics(msg) {
    const metrics = msg.metrics;
    const data = msg.data;

    // Track statistics
    this.latencyStats.total++;
    this.latencyStats.samples.push(metrics.broadcastToReceivedMs);
    if (!metrics.withinConstraint) {
      this.latencyStats.violations++;
    }

    // Display reaction with quality indicator
    this.displayReaction(data, metrics);

    // Alert if latency violation
    if (!metrics.withinConstraint) {
      console.warn(`[Broadcaster] ⚠️ LATENCY VIOLATION: ${metrics.broadcastToReceivedMs}ms > 500ms for user ${data.userId}`);
    }
  }

  displayReaction(data, metrics) {
    // UI implementation: show reaction with latency quality indicator
    const qualityEmoji = metrics.withinConstraint ? '✅' : '❌';
    const qualityClass = metrics.withinConstraint ? 'good-latency' : 'bad-latency';

    console.log(
      `[Broadcaster] ${qualityEmoji} Reaction from ${data.userId}: ` +
      `intensity=${data.intensity}, latency=${metrics.broadcastToReceivedMs}ms [${qualityClass}]`
    );
  }

  getLatencyStatistics() {
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
}

// ========================================
// Usage Example
// ========================================

// Example: Broadcaster
function setupBroadcaster() {
  const ws = new WebSocket('ws://localhost:8080/ws?userId=broadcaster-001');
  const roomId = 'room-002';  // Broadcast room
  const userId = 'broadcaster-001';

  ws.onopen = () => {
    console.log('[Broadcaster] WebSocket connected');

    // Join room
    ws.send(JSON.stringify({
      type: 'join',
      room: roomId,
      from: userId,
      timestamp: Date.now()
    }));

    // Create timestamp sync
    const timestampSync = new BroadcastTimestampSync(ws, roomId, userId);

    // Start periodic sync at 20Hz (50ms interval)
    timestampSync.startPeriodicSync(50);

    // Create reaction receiver
    const reactionReceiver = new ReactionReceiver(ws);

    // After 10 seconds, show latency statistics
    setTimeout(() => {
      const stats = reactionReceiver.getLatencyStatistics();
      if (stats) {
        console.log('[Broadcaster] Latency Statistics:', {
          mean: `${stats.mean.toFixed(2)}ms`,
          median: `${stats.median}ms`,
          p95: `${stats.p95}ms`,
          p99: `${stats.p99}ms`,
          violations: stats.violations,
          total: stats.total,
          violationRate: `${(stats.violationRate * 100).toFixed(2)}%`
        });
      }
    }, 10000);
  };

  ws.onerror = (error) => {
    console.error('[Broadcaster] WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('[Broadcaster] WebSocket closed');
  };
}

// Example: Viewer
function setupViewer() {
  const ws = new WebSocket('ws://localhost:8080/ws?userId=viewer-001');
  const roomId = 'room-002';  // Broadcast room
  const userId = 'viewer-001';
  const broadcasterUserId = 'broadcaster-001';

  ws.onopen = () => {
    console.log('[Viewer] WebSocket connected');

    // Join room
    ws.send(JSON.stringify({
      type: 'join',
      room: roomId,
      from: userId,
      timestamp: Date.now()
    }));

    // Create reaction sender
    const reactionSender = new ViewerReactionSender(ws, roomId, userId, broadcasterUserId);

    // Simulate sending reactions every 100ms
    setInterval(() => {
      // Simulate emotion detection
      const intensity = Math.floor(Math.random() * 100);
      const confidence = Math.random() * 0.5 + 0.5; // 0.5-1.0

      reactionSender.sendReactionWithTimestamp(intensity, confidence);
    }, 100);
  };

  ws.onerror = (error) => {
    console.error('[Viewer] WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('[Viewer] WebSocket closed');
  };
}

// Uncomment to run examples:
// setupBroadcaster();  // Run as broadcaster
// setupViewer();       // Run as viewer
