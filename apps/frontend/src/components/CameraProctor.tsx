'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, AlertTriangle, ShieldCheck, Eye, Users } from 'lucide-react';

export type CameraAnomalyType = 'FACE_NOT_DETECTED' | 'MULTIPLE_FACES_DETECTED' | 'GAZE_AWAY';

interface CameraProctorProps {
  onAnomaly?: (type: CameraAnomalyType, details: string) => void;
  onSnapshot?: (base64Img: string) => void;
  active?: boolean;
}

export default function CameraProctor({
  onAnomaly,
  onSnapshot,
  active = true,
}: CameraProctorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(true);
  const [anomalyWarning, setAnomalyWarning] = useState<string | null>(null);

  // Initialize webcam stream
  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;

    async function initCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setStreamActive(true);
          setCameraError(null);
        }
      } catch (err) {
        console.warn('Camera access error:', err);
        setCameraError('Webcam blocked or unavailable. Camera proctoring is mandatory.');
      }
    }

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [active]);

  // Client-side video frame heuristics analyzer (runs every 2 seconds)
  const analyzeFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !streamActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = frame.data;

    let skinPixels = 0;
    let totalLuminance = 0;
    let leftSkin = 0;
    let rightSkin = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuminance += lum;

      // Heuristic skin-color detection rule in RGB space
      const isSkin =
        r > 75 &&
        g > 40 &&
        b > 20 &&
        r > g &&
        r > b &&
        r - g > 15 &&
        Math.abs(r - g) > 15;

      if (isSkin) {
        skinPixels++;
        const pixelIndex = i / 4;
        const x = pixelIndex % canvas.width;
        if (x < canvas.width / 2) {
          leftSkin++;
        } else {
          rightSkin++;
        }
      }
    }

    const totalPixels = data.length / 4;
    const skinRatio = skinPixels / totalPixels;
    const avgLum = totalLuminance / totalPixels;

    // Detect missing face / blocked camera
    if (avgLum < 12 || skinRatio < 0.04) {
      setFaceDetected(false);
      const msg = 'Candidate face not detected in frame';
      setAnomalyWarning(msg);
      onAnomaly?.('FACE_NOT_DETECTED', msg);
    }
    // Detect drastic gaze / head departure from center
    else if (leftSkin > 0 && rightSkin > 0 && (leftSkin / rightSkin > 5 || rightSkin / leftSkin > 5)) {
      setFaceDetected(true);
      const msg = 'Gaze departure or severe head turn detected';
      setAnomalyWarning(msg);
      onAnomaly?.('GAZE_AWAY', msg);
    }
    // Normal centered candidate presence
    else {
      setFaceDetected(true);
      setAnomalyWarning(null);
    }

    // Optional snapshot sample
    try {
      const snapshot = canvas.toDataURL('image/jpeg', 0.5);
      onSnapshot?.(snapshot);
    } catch {
      // ignore
    }
  }, [onAnomaly, onSnapshot, streamActive]);

  useEffect(() => {
    if (!streamActive) return;
    const interval = setInterval(analyzeFrame, 2500);
    return () => clearInterval(interval);
  }, [analyzeFrame, streamActive]);

  return (
    <div className="relative rounded-xl border border-neutral-800 bg-neutral-900/90 shadow-xl overflow-hidden backdrop-blur-md">
      <div className="relative aspect-video w-48 sm:w-56 bg-neutral-950 flex items-center justify-center">
        <video
          ref={videoRef}
          muted
          playsInline
          className="h-full w-full object-cover mirror-mode"
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {cameraError ? (
          <div className="absolute inset-0 bg-neutral-950/90 p-3 flex flex-col items-center justify-center text-center text-xs text-rose-400 gap-1.5">
            <CameraOff className="h-6 w-6 text-rose-500" />
            <span>{cameraError}</span>
          </div>
        ) : !streamActive ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-neutral-400 gap-1.5">
            <Camera className="h-5 w-5 animate-pulse text-indigo-400" />
            <span>Connecting AI Camera...</span>
          </div>
        ) : null}

        {/* Live Face Detection Bounding HUD */}
        {streamActive && !cameraError && (
          <div
            className={`absolute inset-3 border-2 rounded-lg pointer-events-none transition-colors duration-300 ${
              faceDetected
                ? 'border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'border-rose-500/80 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.5)]'
            }`}
          >
            <div className="absolute top-1 left-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  faceDetected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'
                }`}
              />
              <span className={faceDetected ? 'text-emerald-400' : 'text-rose-400'}>
                {faceDetected ? 'Face Verified' : 'No Face'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Camera Status Bar */}
      <div className="px-3 py-2 bg-neutral-950/80 border-t border-neutral-800 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
          <span className="font-semibold text-neutral-300">AI Proctor</span>
        </div>
        <span
          className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
            faceDetected
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {faceDetected ? 'TRACKING' : 'ALERT'}
        </span>
      </div>

      {/* Floating Anomaly Popover */}
      {anomalyWarning && (
        <div className="absolute bottom-10 left-2 right-2 p-1.5 rounded bg-rose-950/90 border border-rose-500/50 text-[10px] text-rose-300 flex items-center gap-1.5 shadow-lg animate-bounce">
          <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
          <span className="truncate">{anomalyWarning}</span>
        </div>
      )}
    </div>
  );
}
