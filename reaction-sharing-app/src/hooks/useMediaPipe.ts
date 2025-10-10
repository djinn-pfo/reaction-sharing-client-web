import { useEffect, useRef, useState, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { LandmarkCompressor } from '../utils/compression';
import { FaceNormalizer } from '../core/normalizer/FaceNormalizer';
import type { Point3D, NormalizedLandmarks } from '../types';

export interface EmotionData {
  happiness: number;
  sadness: number;
  surprise: number;
  anger: number;
  neutral: number;
  timestamp: number;
}

export interface FaceLandmark {
  x: number;
  y: number;
  z?: number;
}

export interface MediaPipeState {
  isInitialized: boolean;
  isProcessing: boolean;
  error: string | null;
  landmarks: FaceLandmark[] | null;
  normalizedLandmarks: Point3D[] | null;
  normalizationData: NormalizedLandmarks | null;
  compressionStats: {
    isInitialized: boolean;
    compressionRatio: number;
  };
}

export interface MediaPipeHookOptions {
  onLandmarkData?: (data: Uint8Array, metadata: { compressionType: 'delta-delta' | 'full' }) => void;
  sendInterval?: number; // ms (デフォルト: 100ms = 10fps)
  enableSending?: boolean;
}

// 型定義を別途エクスポート
export type { EmotionData as EmotionDataType };

export const useMediaPipe = (_options: MediaPipeHookOptions = {}) => {

  const [state, setState] = useState<MediaPipeState>({
    isInitialized: false,
    isProcessing: false,
    error: null,
    landmarks: null,
    normalizedLandmarks: null,
    normalizationData: null,
    compressionStats: {
      isInitialized: false,
      compressionRatio: 0
    }
  });

  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const compressorRef = useRef<LandmarkCompressor>(new LandmarkCompressor());
  const faceNormalizerRef = useRef<FaceNormalizer>(new FaceNormalizer());
  const sendTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initializeMediaPipe = async () => {
      try {
        setState(prev => ({ ...prev, error: null }));

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );

        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.45, // 精度を下げて高速化
          minTrackingConfidence: 0.45,  // トラッキング精度も調整
          outputFaceBlendshapes: false, // 不要な出力を無効化（感情検出はバックエンドで行う）
          outputFacialTransformationMatrixes: true // MediaPipe公式仕様に従った設定
        });

        faceLandmarkerRef.current = faceLandmarker;

        setState(prev => ({
          ...prev,
          isInitialized: true,
          error: null
        }));

        console.log('MediaPipe FaceLandmarker initialized successfully');
      } catch (error) {
        console.error('Failed to initialize MediaPipe:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'MediaPipe初期化エラー',
          isInitialized: false
        }));
      }
    };

    initializeMediaPipe();

    return () => {
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
    };
  }, []);

  const processVideoFrame = (video: HTMLVideoElement): void => {
    if (!faceLandmarkerRef.current || !state.isInitialized || !video || video.videoWidth === 0) {
      return;
    }

    try {
      // Don't update state here - causes infinite loop on every frame
      const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());

      let landmarks: FaceLandmark[] | null = null;
      let normalizedLandmarks: Point3D[] | null = null;
      let normalizationData: NormalizedLandmarks | null = null;

      // ランドマークデータを取得（FaceNormalizerで完全正規化）
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        // 元のランドマークをピクセル座標に変換
        const rawLandmarks: Point3D[] = results.faceLandmarks[0].map(landmark => ({
          x: landmark.x * video.videoWidth,
          y: landmark.y * video.videoHeight,
          z: landmark.z * video.videoWidth
        }));

        // transformation matrixを取得（複数の可能性を試す）
        let transformMatrix = null;

        // DEBUG: MediaPipeの結果オブジェクトのプロパティを確認（一度だけ）
        if (!(window as any).mediaPipePropsLogged) {
          console.log('🔍 Available MediaPipe result properties:', Object.keys(results));
          (window as any).mediaPipePropsLogged = true;
        }

        // 正しいプロパティ名を使用（MediaPipe公式仕様）
        const possibleMatrixProps = [
          'facialTransformationMatrixes' // MediaPipe公式の正しいプロパティ名
        ];

        for (const prop of possibleMatrixProps) {
          if ((results as any)[prop] && (results as any)[prop].length > 0) {
            transformMatrix = (results as any)[prop][0];
            break;
          }
        }

        try {
          // FaceNormalizerで完全正規化
          normalizationData = faceNormalizerRef.current.normalize(rawLandmarks, transformMatrix);
          normalizedLandmarks = normalizationData.normalized;

          // 元の形式のlandmarksも保持（互換性のため）
          landmarks = rawLandmarks.map(point => ({
            x: point.x,
            y: point.y,
            z: point.z
          }));

          // ログは削除（スパム防止）

        } catch (error) {
          console.error('❌ Normalization failed:', error);
          // フォールバック：元のランドマークのみ使用
          landmarks = rawLandmarks.map(point => ({
            x: point.x,
            y: point.y,
            z: point.z
          }));
        }

        setState(prev => ({
          ...prev,
          landmarks,
          normalizedLandmarks,
          normalizationData,
          compressionStats: compressorRef.current.getCompressionStats()
        }));
      } else {
        setState(prev => ({
          ...prev,
          landmarks: null,
          normalizedLandmarks: null,
          normalizationData: null,
          compressionStats: compressorRef.current.getCompressionStats()
        }));
      }
    } catch (error) {
      console.error('Error processing video frame:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '映像処理エラー'
      }));
    }
  };

  // 圧縮状態をリセット（新しいセッション開始時）
  const resetCompression = useCallback(() => {
    compressorRef.current.reset();
    setState(prev => ({
      ...prev,
      compressionStats: {
        isInitialized: false,
        compressionRatio: 0
      }
    }));
  }, []);

  // クリーンアップ処理
  useEffect(() => {
    return () => {
      if (sendTimerRef.current) {
        clearTimeout(sendTimerRef.current);
      }
    };
  }, []);

  return {
    ...state,
    processVideoFrame,
    resetCompression,
    canvasRef,
  };
};

