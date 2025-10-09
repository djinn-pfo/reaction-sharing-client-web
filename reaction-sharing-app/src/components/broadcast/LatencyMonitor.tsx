import type { LatencyStatistics } from '../../types/broadcast';

interface LatencyMonitorProps {
  stats: LatencyStatistics | null;
}

export const LatencyMonitor: React.FC<LatencyMonitorProps> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-white mb-2">レイテンシ統計</h3>
        <p className="text-gray-400 text-sm">データなし</p>
      </div>
    );
  }

  const violationRatePercent = (stats.violationRate * 100).toFixed(2);
  const isGoodQuality = stats.violationRate < 0.05; // Less than 5% violations

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-white mb-3">レイテンシ統計</h3>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-gray-400">平均</div>
          <div className="text-white font-mono">{stats.mean.toFixed(2)}ms</div>
        </div>

        <div>
          <div className="text-gray-400">中央値</div>
          <div className="text-white font-mono">{stats.median}ms</div>
        </div>

        <div>
          <div className="text-gray-400">P95</div>
          <div className="text-white font-mono">{stats.p95}ms</div>
        </div>

        <div>
          <div className="text-gray-400">P99</div>
          <div className="text-white font-mono">{stats.p99}ms</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">制約違反率</span>
          <span className={`font-mono ${isGoodQuality ? 'text-green-400' : 'text-red-400'}`}>
            {violationRatePercent}%
          </span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-gray-400">違反数 / 総数</span>
          <span className="text-white font-mono">
            {stats.violations} / {stats.total}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isGoodQuality ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-xs text-gray-400">
            {isGoodQuality ? '良好な品質' : '品質改善が必要'}
          </span>
        </div>
      </div>
    </div>
  );
};
