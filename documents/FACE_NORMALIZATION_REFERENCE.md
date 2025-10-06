# Face Normalization System - Reference Manual

## Overview
This system provides real-time 3D face normalization using MediaPipe Face Landmarker. It normalizes facial landmarks to a standard 500×500×500 coordinate space, independent of head position and orientation.

## Core Components

### 1. FaceNormalizer (`/core/normalizer/FaceNormalizer.ts`)

**Purpose**: Core normalization logic for transforming 3D facial landmarks.

**Key Methods**:
```typescript
class FaceNormalizer {
  // Main normalization method
  normalize(landmarks: Point3D[], transformMatrix?: any): NormalizedLandmarks

  // Calculate 3D bounding box
  calculateBoundingBox(landmarks: Point3D[]): BoundingBox3D

  // Scale normalization to 500×500×500
  normalizeScale(landmarks: Point3D[], bbox: BoundingBox3D): { points: Point3D[], scaleFactor: Point3D }

  // Center to origin
  centerToOrigin(landmarks: Point3D[]): { points: Point3D[], translation: Point3D }

  // Rotate to front-facing position
  rotateToFront(landmarks: Point3D[], transformMatrix?: any): { points: Point3D[], rotation: HeadPose }

  // Update normalization parameters
  updateParams(params: Partial<NormalizationParams>): void
}
```

**Configuration Options**:
```typescript
interface NormalizationParams {
  targetSize: number;           // Default: 500
  preserveAspectRatio: boolean; // Default: true
  centerToOrigin: boolean;      // Default: true
  rotateToFront: boolean;       // Default: true
}
```

### 2. Rotation Utilities (`/utils/rotationUtils.ts`)

**Purpose**: Matrix operations and Euler angle calculations for head pose estimation.

**Key Functions**:
```typescript
// Extract 3x3 rotation matrix from 4x4 transformation matrix
extractRotationMatrix(transformMatrix: number[][]): number[][]

// Convert rotation matrix to Euler angles (MediaPipe-specific)
matrixToEulerAnglesMediaPipe(rotationMatrix: number[][]): HeadPose

// Apply rotation to 3D points
applyRotationToPoints(points: Point3D[], rotationMatrix: number[][]): Point3D[]

// Calculate inverse of 3x3 matrix
invertMatrix3x3(matrix: number[][]): number[][]
```

### 3. MediaPipeManager (`/services/MediaPipeManager.ts`)

**Purpose**: Manages MediaPipe Face Landmarker initialization and frame processing.

**Key Methods**:
```typescript
class MediaPipeManager {
  // Initialize MediaPipe
  async initialize(): Promise<void>

  // Process video frame
  async processFrame(videoElement: HTMLVideoElement, timestamp: number): Promise<DetectionResult>

  // Check if ready
  isReady(): boolean

  // Cleanup
  destroy(): void
}
```

**MediaPipe Configuration**:
- Model: Face Landmarker (468 3D landmarks)
- Output: Face landmarks + transformation matrix
- Running mode: VIDEO
- Delegate: GPU (for performance)

### 4. NormalizationDashboard Component (`/components/normalization/NormalizationDashboard.tsx`)

**Purpose**: Complete UI implementation with calibration and visualization.

**Key Features**:
- Real-time video processing
- Manual calibration system
- Face direction indicators
- 3D visualization
- Status display

**Calibration System**:
```typescript
// State management
const [baseRotation, setBaseRotation] = useState<HeadPose | null>(null);
const baseRotationRef = useRef<HeadPose | null>(null);
const isCalibratingRef = useRef<boolean>(false);

// Start calibration (collects 90 frames)
const startCalibration = () => { ... }

// Calculate relative rotation from base
const getRelativeRotation = (current: HeadPose, base: HeadPose | null): HeadPose

// Check if facing camera (within thresholds)
const checkFacingCamera = (rotation: HeadPose): boolean
```

**Thresholds**:
```typescript
const FACE_DIRECTION_THRESHOLDS = {
  maxPitch: 3,   // ±3 degrees
  maxYaw: 20     // ±20 degrees
};
```

### 5. ThreeVisualization Component (`/components/normalization/ThreeVisualization.tsx`)

**Purpose**: 3D visualization using React Three Fiber.

**Features**:
- Point cloud rendering
- Bounding box display
- Grid and axes helpers
- Camera controls

## Type Definitions (`/types/index.ts`)

```typescript
interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface HeadPose {
  yaw: number;   // Horizontal rotation (left/right)
  pitch: number; // Vertical rotation (up/down)
  roll: number;  // Tilt rotation
}

interface BoundingBox3D {
  min: Point3D;
  max: Point3D;
  width: number;
  height: number;
  depth: number;
  center: Point3D;
}

interface NormalizedLandmarks {
  original: Point3D[];
  normalized: Point3D[];
  boundingBox: BoundingBox3D;
  scaleFactor: Point3D;
  rotation: HeadPose;
  translation: Point3D;
}

interface DetectionResult {
  faceLandmarks: any[] | null;
  faceTransformation: any | null;
  poseLandmarks: any[] | null;
  timestamp: number;
}
```

## Dependencies

### Required NPM Packages
```json
{
  "@mediapipe/tasks-vision": "^0.10.3",
  "@react-three/fiber": "^8.x.x",
  "@react-three/drei": "^9.x.x",
  "three": "^0.x.x",
  "react": "^18.x.x",
  "typescript": "^4.x.x"
}
```

### Browser Requirements
- WebGL support for Three.js
- WebRTC/getUserMedia for camera access
- Modern browser (Chrome, Firefox, Safari, Edge)

## Integration Guide

### Step 1: Copy Core Files
Copy these files/folders to your project:
```
/core/normalizer/FaceNormalizer.ts
/utils/rotationUtils.ts
/services/MediaPipeManager.ts
/types/index.ts (or merge type definitions)
```

### Step 2: Basic Usage
```typescript
import { MediaPipeManager } from './services/MediaPipeManager';
import { FaceNormalizer } from './core/normalizer/FaceNormalizer';

// Initialize
const mediaPipeManager = new MediaPipeManager();
const faceNormalizer = new FaceNormalizer();

await mediaPipeManager.initialize();

// Process frame
const result = await mediaPipeManager.processFrame(videoElement, timestamp);
if (result.faceLandmarks) {
  const landmarks = result.faceLandmarks.map(lm => ({
    x: lm.x * videoWidth,
    y: lm.y * videoHeight,
    z: (lm.z || 0) * videoWidth
  }));

  const normalized = faceNormalizer.normalize(
    landmarks,
    result.faceTransformation
  );

  // Use normalized.normalized for processed landmarks
  // Use normalized.rotation for head pose
}
```

### Step 3: Implement Calibration (Optional)
```typescript
// Calibration state
const baseRotationRef = useRef<HeadPose | null>(null);
const calibrationFrames: HeadPose[] = [];

// Collect frames during calibration
if (isCalibrating) {
  calibrationFrames.push(normalized.rotation);
  if (calibrationFrames.length >= 90) {
    // Calculate average
    const avgRotation = calibrationFrames.reduce(
      (acc, frame) => ({
        yaw: acc.yaw + frame.yaw / calibrationFrames.length,
        pitch: acc.pitch + frame.pitch / calibrationFrames.length,
        roll: acc.roll + frame.roll / calibrationFrames.length
      }),
      { yaw: 0, pitch: 0, roll: 0 }
    );
    baseRotationRef.current = avgRotation;
  }
}

// Calculate relative rotation
const getRelativeRotation = (current: HeadPose, base: HeadPose | null): HeadPose => {
  if (!base) return current;
  return {
    yaw: current.yaw - base.yaw,
    pitch: current.pitch - base.pitch,
    roll: current.roll - base.roll
  };
};
```

### Step 4: Optional - Add 3D Visualization
Copy `/components/normalization/ThreeVisualization.tsx` for 3D rendering.

## Key Implementation Notes

### 1. State Management with useRef
For real-time processing, use `useRef` instead of `useState` for values that need immediate updates:
```typescript
const isProcessingRef = useRef<boolean>(false);
const isCalibratingRef = useRef<boolean>(false);
const baseRotationRef = useRef<HeadPose | null>(null);
```

### 2. Coordinate System
- MediaPipe outputs normalized coordinates (0-1)
- Convert to pixel coordinates: `x * width, y * height, z * width`
- Z-axis uses same scale as width for consistency

### 3. Rotation Calculation
The system uses MediaPipe-specific Euler angle extraction (Method 3):
- Yaw: `atan2(-R[0][2], R[2][2])`
- Pitch: `asin(R[1][2])`
- Roll: `atan2(-R[1][0], R[1][1])`

### 4. Performance Optimization
- Use `requestAnimationFrame` for smooth rendering
- Process frames only when face is detected
- Cleanup resources properly with `destroy()` methods

## Troubleshooting

### Issue: Calibration not working
- Ensure `isCalibratingRef.current = true` is set
- Check that face is detected during calibration
- Verify 90 frames are collected

### Issue: Rotation values seem wrong
- Confirm using `matrixToEulerAnglesMediaPipe` method
- Check transformation matrix is valid
- Verify coordinate conversion (multiply by width/height)

### Issue: Performance problems
- Reduce frame processing rate if needed
- Ensure GPU delegate is enabled
- Check browser WebGL support

## Example Projects

### Minimal Integration
```typescript
// Simple normalization without UI
const normalizer = new FaceNormalizer();
const normalized = normalizer.normalize(landmarks);
console.log('Normalized landmarks:', normalized.normalized);
console.log('Head rotation:', normalized.rotation);
```

### Full Dashboard Integration
See `NormalizationDashboard.tsx` for complete implementation with:
- Camera feed display
- Real-time processing
- Calibration UI
- 3D visualization
- Status indicators

## Support & Contribution

For issues or improvements:
1. Check MediaPipe documentation for model updates
2. Verify browser compatibility
3. Test with different lighting conditions
4. Consider adding error recovery mechanisms

## License
This normalization system is provided as-is for research and development purposes.