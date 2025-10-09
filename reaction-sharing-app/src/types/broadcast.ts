// 配信タイムスタンプデータ
export interface BroadcastTimestampData {
  frameId: string;
  broadcastTimestamp: number;
  sequenceNumber: number;
}

// リアクションデータ（タイムスタンプ付き）
export interface EmotionWithTimestampData {
  userId: string;
  intensity: number;
  confidence: number;
  broadcastTimestamp: number;
  reactionSentTime: number;
  frameId: string;
}

// レイテンシメトリクス
export interface LatencyMetrics {
  broadcastToReceivedMs: number;
  withinConstraint: boolean;
  frameId: string;
}

// レイテンシ統計
export interface LatencyStatistics {
  mean: number;
  median: number;
  p95: number;
  p99: number;
  violations: number;
  total: number;
  violationRate: number;
}

// リアクション受信データ（メトリクス付き）
export interface ReceivedReactionWithMetrics {
  data: EmotionWithTimestampData;
  metrics: LatencyMetrics;
}
