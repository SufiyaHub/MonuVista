import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { Camera, Hand, Pause, Play, RotateCcw } from "lucide-react";
import {
  applyDeadZone,
  cameraDistance,
  classifyHand,
  measureTwoPalmDistance,
  orbitCamera,
  relativeZoomDistance,
  smoothPoint,
  zoomCameraToDistance,
} from "../lib/gestureLogic.js";

const MEDIAPIPE_ASSETS = `${import.meta.env.BASE_URL}mediapipe`;
const MEDIAPIPE_WASM = MEDIAPIPE_ASSETS;
const HAND_MODEL = `${MEDIAPIPE_ASSETS}/hand_landmarker.task`;
const DEAD_ZONE = 0.0004;
const ROTATION_SENSITIVITY_X = 11;
const ROTATION_SENSITIVITY_Y = 8;
const TWO_HAND_ZOOM_SENSITIVITY = 3;
const MIN_ZOOM_SCALE = 0.04;
const MAX_ZOOM_SCALE = 6;
const FIST_HOLD_MS = 2500;
const RESET_COOLDOWN_MS = 1800;
const MANUAL_CONTROL_GRACE_MS = 1100;

export default function GestureController({ viewerApi, viewerError, manualInteractionKey, manualInteractionEndKey }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const frameRef = useRef(null);
  const mountedRef = useRef(true);
  const lastVideoTimeRef = useRef(-1);
  const filteredCenterRef = useRef(null);
  const filteredZoomRatioRef = useRef(null);
  const previousCenterRef = useRef(null);
  const zoomStartRatioRef = useRef(null);
  const zoomStartDistanceRef = useRef(null);
  const candidateGestureRef = useRef({ gesture: "unknown", frames: 0 });
  const activeGestureRef = useRef("unknown");
  const fistStartedAtRef = useRef(null);
  const fistResetDoneRef = useRef(false);
  const lastResetAtRef = useRef(0);
  const lastManualControlAtRef = useRef(0);
  const manualControlActiveRef = useRef(false);
  const cameraRef = useRef(null);
  const initialCameraRef = useRef(null);
  const pausedRef = useRef(false);
  const [status, setStatus] = useState("Mouse and touch controls are available.");
  const [enabled, setEnabled] = useState(false);
  const [paused, setPaused] = useState(false);
  const [starting, setStarting] = useState(false);

  const clearTrackingHistory = useCallback(() => {
    lastVideoTimeRef.current = -1;
    filteredCenterRef.current = null;
    filteredZoomRatioRef.current = null;
    previousCenterRef.current = null;
    zoomStartRatioRef.current = null;
    zoomStartDistanceRef.current = null;
    candidateGestureRef.current = { gesture: "unknown", frames: 0 };
    activeGestureRef.current = "unknown";
    fistStartedAtRef.current = null;
    fistResetDoneRef.current = false;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      landmarkerRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!viewerApi) return undefined;
    let active = true;
    viewerApi.getCameraLookAt((error, camera) => {
      if (!active || error || !camera?.position || !camera?.target) return;
      const initialCamera = { position: [...camera.position], target: [...camera.target] };
      initialCameraRef.current = initialCamera;
      cameraRef.current = initialCamera;
    });
    return () => { active = false; };
  }, [viewerApi]);

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    clearTrackingHistory();
    manualControlActiveRef.current = false;
    setEnabled(false);
    setPaused(false);
    pausedRef.current = false;
    setStatus("Hand tracking disabled. Mouse and touch controls are available.");
  }, [clearTrackingHistory]);

  const resetView = useCallback((showMessage = true) => {
    const initialCamera = initialCameraRef.current;
    if (!viewerApi || !initialCamera) return;
    cameraRef.current = { position: [...initialCamera.position], target: [...initialCamera.target] };
    viewerApi.setCameraLookAt(initialCamera.position, initialCamera.target, 0.55);
    if (showMessage) setStatus("View reset. Show an open palm to rotate again.");
  }, [viewerApi]);

  const onManualInteraction = useCallback(() => {
    lastManualControlAtRef.current = performance.now();
    manualControlActiveRef.current = true;
    clearTrackingHistory();
    setStatus("Paused while using the viewer controls.");
  }, [clearTrackingHistory]);

  useEffect(() => {
    if (manualInteractionKey) onManualInteraction();
  }, [manualInteractionKey, onManualInteraction]);

  useEffect(() => {
    if (!manualInteractionEndKey) return;
    manualControlActiveRef.current = false;
    lastManualControlAtRef.current = performance.now();
    clearTrackingHistory();
    viewerApi?.getCameraLookAt((error, camera) => {
      if (!error && camera?.position && camera?.target) {
        cameraRef.current = { position: [...camera.position], target: [...camera.target] };
      }
    });
    if (enabled && !paused) setStatus("Tracking active. Show an open palm to rotate.");
  }, [manualInteractionEndKey, clearTrackingHistory, enabled, paused, viewerApi]);

  async function enableCamera() {
    if (starting || enabled) return;
    if (!viewerApi || !initialCameraRef.current) {
      setStatus("The 3D viewer is still loading. Try again in a moment.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Camera access is unavailable. Use mouse and touch controls instead.");
      return;
    }

    setStarting(true);
    setStatus("Initializing hand tracking…");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Camera preview is unavailable.");
      video.srcObject = stream;
      await video.play();

      const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
      const options = {
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.65,
        minHandPresenceConfidence: 0.65,
        minTrackingConfidence: 0.6,
      };
      let landmarker;
      try {
        landmarker = await HandLandmarker.createFromOptions(fileset, {
          ...options,
          baseOptions: { modelAssetPath: HAND_MODEL, delegate: "GPU" },
        });
      } catch {
        landmarker = await HandLandmarker.createFromOptions(fileset, {
          ...options,
          baseOptions: { modelAssetPath: HAND_MODEL, delegate: "CPU" },
        });
      }
      if (!mountedRef.current) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;
      clearTrackingHistory();
      setEnabled(true);
      setStatus("Show one open palm to rotate, or two open palms to zoom. Hold a fist to reset.");

      const detect = () => {
        if (!landmarkerRef.current || !videoRef.current || pausedRef.current) {
          frameRef.current = requestAnimationFrame(detect);
          return;
        }
        const currentVideo = videoRef.current;
        if (currentVideo.readyState >= 2 && currentVideo.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = currentVideo.currentTime;
          const now = performance.now();
          if (manualControlActiveRef.current || now - lastManualControlAtRef.current < MANUAL_CONTROL_GRACE_MS) {
            clearTrackingHistory();
            frameRef.current = requestAnimationFrame(detect);
            return;
          }
          const result = landmarkerRef.current.detectForVideo(currentVideo, now);
          const hands = result.landmarks || [];
          if (!hands.length) {
            clearTrackingHistory();
            setStatus((previous) => previous === "Hand not detected. Show your palm to continue." ? previous : "Hand not detected. Show your palm to continue.");
          } else {
            const classifications = hands.map(classifyHand);
            const hasTwoOpenPalms = hands.length >= 2
              && classifications[0].gesture === "palm"
              && classifications[1].gesture === "palm";
            const fistIndex = classifications.findIndex((hand) => hand.gesture === "fist");
            let recognized;
            if (hasTwoOpenPalms) {
              recognized = {
                gesture: "twoHandZoom",
                zoomRatio: measureTwoPalmDistance(hands[0], hands[1]),
              };
            } else if (fistIndex >= 0) {
              recognized = { gesture: "fist" };
            } else if (hands.length === 1) {
              recognized = classifications[0];
            } else {
              recognized = { gesture: "unknown" };
            }
            const landmarks = hands[0];
            const wrist = landmarks[0];
            const middleMcp = landmarks[9];
            const center = {
              x: (wrist.x + middleMcp.x) / 2,
              y: (wrist.y + middleMcp.y) / 2,
            };
            filteredCenterRef.current = smoothPoint(filteredCenterRef.current, center, 0.45);
            if (recognized.zoomRatio === null || recognized.zoomRatio === undefined) {
              filteredZoomRatioRef.current = null;
            } else {
              filteredZoomRatioRef.current = filteredZoomRatioRef.current === null
                ? recognized.zoomRatio
                : filteredZoomRatioRef.current + (recognized.zoomRatio - filteredZoomRatioRef.current) * 0.32;
            }

            const candidate = candidateGestureRef.current;
            if (candidate.gesture === recognized.gesture) candidate.frames += 1;
            else candidateGestureRef.current = { gesture: recognized.gesture, frames: 1 };
            const stableGesture = candidateGestureRef.current.frames >= 3
              ? candidateGestureRef.current.gesture
              : activeGestureRef.current;

            if (recognized.gesture !== "fist") fistStartedAtRef.current = null;
            if (stableGesture !== activeGestureRef.current) {
              activeGestureRef.current = stableGesture;
              previousCenterRef.current = filteredCenterRef.current;
              fistStartedAtRef.current = stableGesture === "fist" ? now : null;
              fistResetDoneRef.current = false;
              if (stableGesture === "twoHandZoom" && cameraRef.current) {
                zoomStartRatioRef.current = filteredZoomRatioRef.current;
                zoomStartDistanceRef.current = cameraDistance(cameraRef.current);
              } else {
                zoomStartRatioRef.current = null;
                zoomStartDistanceRef.current = null;
              }
              const messages = {
                palm: "Hand detected. Move your open palm to rotate the monument.",
                twoHandZoom: "Two palms detected. Bring them together to zoom in; spread them apart to zoom out.",
                fist: "Fist detected. Hold for 2.5 seconds to reset the view.",
                unknown: "Hand detected. Show one open palm to rotate or two to zoom.",
              };
              setStatus(messages[stableGesture] || "Hand detected.");
            }

            if (stableGesture === "fist") {
              const fistIsStable = candidateGestureRef.current.gesture === "fist" && candidateGestureRef.current.frames >= 3;
              if (fistIsStable && fistStartedAtRef.current === null) fistStartedAtRef.current = now;
              if (fistIsStable && !fistResetDoneRef.current && fistStartedAtRef.current !== null && now - fistStartedAtRef.current >= FIST_HOLD_MS && now - lastResetAtRef.current >= RESET_COOLDOWN_MS) {
                fistResetDoneRef.current = true;
                lastResetAtRef.current = now;
                resetView(false);
                setStatus("View reset. Open your hand to continue.");
              }
            } else if ((stableGesture === "palm" && recognized.gesture === "palm")
              || (stableGesture === "twoHandZoom" && recognized.gesture === "twoHandZoom")) {
              const currentCenter = filteredCenterRef.current;
              const previousCenter = previousCenterRef.current;
              previousCenterRef.current = currentCenter;
              if (previousCenter && cameraRef.current) {
                let yawDelta = 0;
                let pitchDelta = 0;
                if (stableGesture === "palm") {
                  const dx = applyDeadZone(currentCenter.x - previousCenter.x, DEAD_ZONE);
                  const dy = applyDeadZone(currentCenter.y - previousCenter.y, DEAD_ZONE);
                  yawDelta = -dx * ROTATION_SENSITIVITY_X;
                  pitchDelta = -dy * ROTATION_SENSITIVITY_Y;
                } else if (filteredZoomRatioRef.current !== null && zoomStartRatioRef.current !== null && zoomStartDistanceRef.current !== null) {
                  const wantedDistance = relativeZoomDistance(
                    zoomStartDistanceRef.current,
                    zoomStartRatioRef.current,
                    filteredZoomRatioRef.current,
                    {
                      sensitivity: TWO_HAND_ZOOM_SENSITIVITY,
                      minScale: MIN_ZOOM_SCALE,
                      maxScale: MAX_ZOOM_SCALE,
                      deadZone: 0.015,
                    },
                  );
                  const currentDistance = cameraDistance(cameraRef.current);
                  const smoothedDistance = currentDistance + (wantedDistance - currentDistance) * 0.55;
                  const initialPosition = initialCameraRef.current.position;
                  const initialTarget = initialCameraRef.current.target;
                  const initialDistance = cameraDistance({ position: initialPosition, target: initialTarget });
                  const zoomedCamera = zoomCameraToDistance(
                    cameraRef.current,
                    smoothedDistance,
                    initialDistance * MIN_ZOOM_SCALE,
                    initialDistance * MAX_ZOOM_SCALE,
                  );
                  cameraRef.current = zoomedCamera;
                  if (Math.abs(smoothedDistance - currentDistance) > 0.001) {
                    viewerApi.setCameraLookAt(zoomedCamera.position, zoomedCamera.target, 0);
                  }
                  frameRef.current = requestAnimationFrame(detect);
                  return;
                }
                const initialPosition = initialCameraRef.current.position;
                const initialTarget = initialCameraRef.current.target;
                const initialDistance = Math.hypot(
                  initialPosition[0] - initialTarget[0],
                  initialPosition[1] - initialTarget[1],
                  initialPosition[2] - initialTarget[2],
                );
                const updatedCamera = orbitCamera(
                  cameraRef.current,
                  yawDelta,
                  pitchDelta,
                  0,
                  initialDistance * MIN_ZOOM_SCALE,
                  initialDistance * MAX_ZOOM_SCALE,
                );
                cameraRef.current = updatedCamera;
                if (yawDelta || pitchDelta) {
                  // Zero duration avoids stacking overlapping camera animations; landmark filtering smooths input.
                  viewerApi.setCameraLookAt(updatedCamera.position, updatedCamera.target, 0);
                }
              }
            }
          }
        }
        frameRef.current = requestAnimationFrame(detect);
      };
      frameRef.current = requestAnimationFrame(detect);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      if (!mountedRef.current) return;
      console.error("Hand gesture initialization failed:", error);
      setEnabled(false);
      setStatus(error?.name === "NotAllowedError"
        ? "Camera permission was denied. Mouse and touch controls are still available."
        : error?.name === "NotFoundError"
          ? "No camera was found. Mouse and touch controls are still available."
          : "Hand tracking could not start. Check camera access and local tracking assets, then try again.");
    } finally {
      if (mountedRef.current) setStarting(false);
    }
  }

  function togglePause() {
    setPaused((wasPaused) => {
      const nextPaused = !wasPaused;
      pausedRef.current = nextPaused;
      clearTrackingHistory();
      setStatus(nextPaused ? "Paused. Resume when you are ready." : "Tracking active. Show an open palm to rotate.");
      return nextPaused;
    });
  }

  return (
    <section className="gesture-panel">
      <div className="panel-title">
        <Hand size={20} />
        <h3>Interaction Controls</h3>
      </div>
      <div className="control-grid">
        <button type="button" onClick={enabled ? stopCamera : enableCamera} disabled={starting || (!viewerApi && !enabled)}>
          <Camera size={16} />
          {starting ? "Starting…" : enabled ? "Disable Hand Gesture" : "Enable Hand Gesture"}
        </button>
        {enabled && (
          <button type="button" onClick={togglePause}>
            {paused ? <Play size={16} /> : <Pause size={16} />}
            {paused ? "Resume Tracking" : "Pause Tracking"}
          </button>
        )}
        <button type="button" onClick={() => resetView()} disabled={!viewerApi || !initialCameraRef.current}>
          <RotateCcw size={16} />
          Reset View
        </button>
      </div>
      <p className="gesture-status" role="status">
        <span className={`gesture-status-dot ${enabled && !paused ? "active" : ""}`} />
        {viewerError || status}
      </p>
      <div className="gesture-guide" aria-label="Hand Gesture Controls">
        <strong>Hand Gesture Controls</strong>
        <span>✋ Open palm + move — rotate</span>
        <span>👐 Two open palms; bring them together / spread apart — zoom in / out</span>
        <span>✊ Hold a fist for 2.5 seconds — reset view</span>
        <small>Show your open palm to begin. Hand tracking pauses while you use the viewer.</small>
      </div>
      <video
        className={enabled ? "webcam-preview visible" : "webcam-preview"}
        ref={videoRef}
        autoPlay
        muted
        playsInline
      />
    </section>
  );
}
