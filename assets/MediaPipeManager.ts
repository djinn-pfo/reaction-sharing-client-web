import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { DetectionResult } from '../types';

export class MediaPipeManager {
  private faceLandmarker: FaceLandmarker | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      console.log('Initializing MediaPipe Face Landmarker...');

      // FilesetResolver初期化
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );

      // Face Landmarker初期化
      this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 1
      });

      this.isInitialized = true;
      console.log('MediaPipe Face Landmarker initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MediaPipe:', error);
      throw error;
    }
  }

  async processFrame(videoElement: HTMLVideoElement, timestamp: number): Promise<DetectionResult> {
    if (!this.isInitialized || !this.faceLandmarker) {
      throw new Error('MediaPipe not initialized');
    }

    try {
      // Face detection
      const faceResults = await this.faceLandmarker.detectForVideo(videoElement, timestamp);

      return {
        faceLandmarks: faceResults.faceLandmarks[0] || null,
        faceTransformation: faceResults.facialTransformationMatrixes?.[0] || null,
        poseLandmarks: null, // Phase 2で実装
        timestamp
      };
    } catch (error) {
      console.error('Frame processing error:', error);
      return {
        faceLandmarks: null,
        faceTransformation: null,
        poseLandmarks: null,
        timestamp
      };
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.faceLandmarker !== null;
  }

  destroy(): void {
    if (this.faceLandmarker) {
      this.faceLandmarker.close();
      this.faceLandmarker = null;
    }
    this.isInitialized = false;
    console.log('MediaPipe manager destroyed');
  }
}