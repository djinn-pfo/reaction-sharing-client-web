import React, { useRef, useEffect } from 'react';

interface FaceLandmark {
  x: number;
  y: number;
  z?: number;
}

interface FaceLandmarkCanvasProps {
  landmarks: FaceLandmark[] | null;
  videoWidth: number;
  videoHeight: number;
  className?: string;
}

export const FaceLandmarkCanvas: React.FC<FaceLandmarkCanvasProps> = ({
  landmarks,
  videoWidth,
  videoHeight,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !landmarks || landmarks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景を設定
    ctx.fillStyle = '#1f2937'; // gray-800
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ランドマークを描画
    ctx.fillStyle = '#60a5fa'; // blue-400
    ctx.strokeStyle = '#3b82f6'; // blue-500
    ctx.lineWidth = 1;

    const scaleX = canvas.width / videoWidth;
    const scaleY = canvas.height / videoHeight;

    // 顔の輪郭を描画
    drawFaceContour(ctx, landmarks, scaleX, scaleY);

    // 目を描画
    drawEyes(ctx, landmarks, scaleX, scaleY);

    // 鼻を描画
    drawNose(ctx, landmarks, scaleX, scaleY);

    // 口を描画
    drawMouth(ctx, landmarks, scaleX, scaleY);

    // 眉毛を描画
    drawEyebrows(ctx, landmarks, scaleX, scaleY);

  }, [landmarks, videoWidth, videoHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={360}
      className={`w-full h-full object-cover rounded-lg ${className}`}
    />
  );
};

// 顔の輪郭を描画
function drawFaceContour(ctx: CanvasRenderingContext2D, landmarks: FaceLandmark[], scaleX: number, scaleY: number) {
  // MediaPipeの顔輪郭のインデックス（顔の周囲）
  const faceOvalIndices = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
  ];

  ctx.beginPath();
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;

  faceOvalIndices.forEach((index, i) => {
    if (index < landmarks.length) {
      const point = landmarks[index];
      const x = point.x * scaleX;
      const y = point.y * scaleY;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
  });

  ctx.closePath();
  ctx.stroke();
}

// 目を描画
function drawEyes(ctx: CanvasRenderingContext2D, landmarks: FaceLandmark[], scaleX: number, scaleY: number) {
  // 左目
  const leftEyeIndices = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
  // 右目
  const rightEyeIndices = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];

  [leftEyeIndices, rightEyeIndices].forEach(eyeIndices => {
    ctx.beginPath();
    ctx.strokeStyle = '#34d399'; // emerald-400
    ctx.lineWidth = 2;

    eyeIndices.forEach((index, i) => {
      if (index < landmarks.length) {
        const point = landmarks[index];
        const x = point.x * scaleX;
        const y = point.y * scaleY;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    });

    ctx.closePath();
    ctx.stroke();
  });
}

// 鼻を描画
function drawNose(ctx: CanvasRenderingContext2D, landmarks: FaceLandmark[], scaleX: number, scaleY: number) {
  const noseIndices = [1, 2, 5, 4, 6, 19, 20, 94, 125, 141, 235, 236, 3, 51, 48, 115, 131, 134, 102, 49, 220, 305, 292, 344, 440, 345, 122, 6, 202, 214, 234, 10];

  ctx.beginPath();
  ctx.strokeStyle = '#fbbf24'; // amber-400
  ctx.lineWidth = 2;

  noseIndices.forEach((index, i) => {
    if (index < landmarks.length) {
      const point = landmarks[index];
      const x = point.x * scaleX;
      const y = point.y * scaleY;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
  });

  ctx.stroke();
}

// 口を描画
function drawMouth(ctx: CanvasRenderingContext2D, landmarks: FaceLandmark[], scaleX: number, scaleY: number) {
  // 外側の唇
  const outerLipIndices = [61, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];
  // 内側の唇
  const innerLipIndices = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 78];

  [outerLipIndices, innerLipIndices].forEach((lipIndices, lipIndex) => {
    ctx.beginPath();
    ctx.strokeStyle = lipIndex === 0 ? '#f87171' : '#ef4444'; // red-400/500
    ctx.lineWidth = 2;

    lipIndices.forEach((index, i) => {
      if (index < landmarks.length) {
        const point = landmarks[index];
        const x = point.x * scaleX;
        const y = point.y * scaleY;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    });

    ctx.closePath();
    ctx.stroke();
  });
}

// 眉毛を描画
function drawEyebrows(ctx: CanvasRenderingContext2D, landmarks: FaceLandmark[], scaleX: number, scaleY: number) {
  // 左眉毛
  const leftEyebrowIndices = [46, 53, 52, 51, 48, 115, 131, 134, 102, 48, 64, 68];
  // 右眉毛
  const rightEyebrowIndices = [276, 283, 282, 295, 285, 336, 296, 334, 293, 300, 276, 283];

  [leftEyebrowIndices, rightEyebrowIndices].forEach(eyebrowIndices => {
    ctx.beginPath();
    ctx.strokeStyle = '#a78bfa'; // violet-400
    ctx.lineWidth = 2;

    eyebrowIndices.forEach((index, i) => {
      if (index < landmarks.length) {
        const point = landmarks[index];
        const x = point.x * scaleX;
        const y = point.y * scaleY;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    });

    ctx.stroke();
  });
}