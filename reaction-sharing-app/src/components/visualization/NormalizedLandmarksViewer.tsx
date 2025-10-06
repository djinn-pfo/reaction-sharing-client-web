import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { NormalizedLandmarks } from '../../types/normalization';

interface NormalizedLandmarksViewerProps {
  normalizedData: NormalizedLandmarks | null;
  width?: number;
  height?: number;
}

// ランドマークポイントを描画するコンポーネント
const LandmarkPoints: React.FC<{ landmarks: NormalizedLandmarks }> = ({ landmarks }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  // landmarksが更新されたらbufferAttributeを更新
  React.useEffect(() => {
    if (geometryRef.current && landmarks.normalized) {
      const positions = new Float32Array(
        landmarks.normalized.flatMap(p => [p.x, p.y, p.z])
      );

      const positionAttribute = geometryRef.current.getAttribute('position') as THREE.BufferAttribute;
      if (positionAttribute) {
        positionAttribute.set(positions);
        positionAttribute.needsUpdate = true;
      }

      geometryRef.current.computeBoundingSphere();
    }
  }, [landmarks]);

  // 初期のランドマークの座標を配列に変換
  const positions = React.useMemo(() => {
    return new Float32Array(
      landmarks.normalized.flatMap(p => [p.x, p.y, p.z])
    );
  }, [landmarks.normalized]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={landmarks.normalized.length}
          usage={THREE.DynamicDrawUsage}
        />
      </bufferGeometry>
      <pointsMaterial size={5} color="#00ff88" sizeAttenuation={false} />
    </points>
  );
};

// バウンディングボックスを描画
const BoundingBox: React.FC<{ landmarks: NormalizedLandmarks }> = ({ landmarks }) => {
  const { min, max } = landmarks.boundingBox;
  const width = max.x - min.x;
  const height = max.y - min.y;
  const depth = max.z - min.z;
  const centerX = (min.x + max.x) / 2;
  const centerY = (min.y + max.y) / 2;
  const centerZ = (min.z + max.z) / 2;

  return (
    <lineSegments position={[centerX, centerY, centerZ]}>
      <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
      <lineBasicMaterial color="#ffff00" />
    </lineSegments>
  );
};

// 座標軸を描画
const Axes: React.FC = () => {
  return (
    <>
      {/* X軸（赤） */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([-300, 0, 0, 300, 0, 0]), 3]}
            count={2}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ff0000" />
      </line>
      {/* Y軸（緑） */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, -300, 0, 0, 300, 0]), 3]}
            count={2}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00ff00" />
      </line>
      {/* Z軸（青） */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, -300, 0, 0, 300]), 3]}
            count={2}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#0000ff" />
      </line>
    </>
  );
};

export const NormalizedLandmarksViewer: React.FC<NormalizedLandmarksViewerProps> = ({
  normalizedData,
  width = 600,
  height = 600
}) => {
  return (
    <div className="bg-gray-900 rounded-lg p-4" style={{ width, height }}>
      <h3 className="text-sm font-medium text-white mb-2">
        正規化後ランドマーク（3D）
      </h3>

      {normalizedData && normalizedData.normalized && normalizedData.normalized.length > 0 ? (
        <div className="border border-gray-700 rounded" style={{ width: '100%', height: height - 60 }}>
          <Canvas>
            <PerspectiveCamera makeDefault position={[0, 0, 800]} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />

            {/* 座標軸 */}
            <Axes />

            {/* グリッド */}
            <Grid
              args={[1000, 1000]}
              cellSize={50}
              cellThickness={0.5}
              cellColor="#444444"
              sectionSize={100}
              sectionThickness={1}
              sectionColor="#666666"
              fadeDistance={2000}
              fadeStrength={1}
              position={[0, -250, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            />

            {/* 正規化後のランドマークポイント */}
            <LandmarkPoints landmarks={normalizedData} />

            {/* バウンディングボックス */}
            <BoundingBox landmarks={normalizedData} />

            {/* カメラコントロール */}
            <OrbitControls
              enableDamping
              dampingFactor={0.05}
              rotateSpeed={0.5}
              target={[0, 0, 0]}
            />
          </Canvas>
        </div>
      ) : (
        <div
          className="flex items-center justify-center border border-gray-700 rounded"
          style={{ width: '100%', height: height - 60 }}
        >
          <p className="text-gray-500">正規化データを待機中...</p>
        </div>
      )}

      {/* 情報表示 */}
      {normalizedData && normalizedData.normalized && (
        <div className="mt-2 text-xs text-gray-400 space-y-1">
          <div>ランドマーク数: {normalizedData.normalized.length}</div>
          <div>
            Rotation: Yaw={normalizedData.rotation?.yaw?.toFixed(1) || 0}°
            Pitch={normalizedData.rotation?.pitch?.toFixed(1) || 0}°
            Roll={normalizedData.rotation?.roll?.toFixed(1) || 0}°
          </div>
          <div>
            Scale: {normalizedData.scaleFactor?.x?.toFixed(3) || 1}
          </div>
          <div>
            BBox: {normalizedData.boundingBox?.width?.toFixed(0) || 0} ×
            {normalizedData.boundingBox?.height?.toFixed(0) || 0} ×
            {normalizedData.boundingBox?.depth?.toFixed(0) || 0}
          </div>
        </div>
      )}
    </div>
  );
};
