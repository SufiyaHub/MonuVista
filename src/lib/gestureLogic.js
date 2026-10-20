export function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function smoothPoint(previous, next, alpha = 0.28) {
  if (!previous) return { x: next.x, y: next.y };
  return {
    x: previous.x + (next.x - previous.x) * alpha,
    y: previous.y + (next.y - previous.y) * alpha,
  };
}

export function classifyHand(landmarks) {
  if (!landmarks || landmarks.length < 21) return { gesture: "unknown" };
  const wrist = landmarks[0];
  const palmWidth = distance2D(landmarks[5], landmarks[17]);
  if (palmWidth < 0.001) return { gesture: "unknown" };
  const thumbIndexRatio = distance2D(landmarks[4], landmarks[8]) / palmWidth;
  if (thumbIndexRatio < 0.4) return { gesture: "unknown" };

  const fingerPairs = [[8, 6], [12, 10], [16, 14], [20, 18]];
  const extended = fingerPairs.map(([tip, joint]) =>
    distance2D(landmarks[tip], wrist) > distance2D(landmarks[joint], wrist) * 1.08,
  );
  const extendedFingers = extended.filter(Boolean).length;
  if (extendedFingers <= 1) return { gesture: "fist" };
  if (extendedFingers >= 3) return { gesture: "palm" };
  return { gesture: "unknown" };
}

export function measureTwoPalmDistance(handA, handB) {
  if (!handA || !handB || handA.length < 18 || handB.length < 18) return null;
  const centerA = { x: (handA[0].x + handA[9].x) / 2, y: (handA[0].y + handA[9].y) / 2 };
  const centerB = { x: (handB[0].x + handB[9].x) / 2, y: (handB[0].y + handB[9].y) / 2 };
  const widthA = distance2D(handA[5], handA[17]);
  const widthB = distance2D(handB[5], handB[17]);
  const averageWidth = (widthA + widthB) / 2;
  if (averageWidth < 0.001) return null;
  return distance2D(centerA, centerB) / averageWidth;
}

export function applyDeadZone(value, deadZone) {
  return Math.abs(value) < deadZone ? 0 : value - Math.sign(value) * deadZone;
}

export function orbitCamera(camera, deltaX, deltaY, zoomDelta = 0, minDistance = 0.3, maxDistance = Infinity) {
  const [px, py, pz] = camera.position;
  const [tx, ty, tz] = camera.target;
  const offsetX = px - tx;
  const offsetY = py - ty;
  const offsetZ = pz - tz;
  const distance = Math.hypot(offsetX, offsetY, offsetZ);
  if (!distance) return camera;

  const yaw = Math.atan2(offsetX, offsetZ) + Math.max(-0.14, Math.min(0.14, deltaX));
  const pitch = Math.max(-1.35, Math.min(1.35,
    Math.atan2(offsetY, Math.hypot(offsetX, offsetZ)) + Math.max(-0.1, Math.min(0.1, deltaY)),
  ));
  const nextDistance = Math.max(minDistance, Math.min(maxDistance,
    distance * (1 + Math.max(-0.018, Math.min(0.018, zoomDelta))),
  ));
  const horizontalDistance = nextDistance * Math.cos(pitch);
  return {
    target: camera.target,
    position: [
      tx + horizontalDistance * Math.sin(yaw),
      ty + nextDistance * Math.sin(pitch),
      tz + horizontalDistance * Math.cos(yaw),
    ],
  };
}

export function zoomCameraToDistance(camera, desiredDistance, minDistance, maxDistance) {
  const [px, py, pz] = camera.position;
  const [tx, ty, tz] = camera.target;
  const offsetX = px - tx;
  const offsetY = py - ty;
  const offsetZ = pz - tz;
  const distance = Math.hypot(offsetX, offsetY, offsetZ);
  if (!distance) return camera;

  const nextDistance = Math.max(minDistance, Math.min(maxDistance, desiredDistance));
  const yaw = Math.atan2(offsetX, offsetZ);
  const pitch = Math.atan2(offsetY, Math.hypot(offsetX, offsetZ));
  const horizontalDistance = nextDistance * Math.cos(pitch);
  return {
    target: camera.target,
    position: [
      tx + horizontalDistance * Math.sin(yaw),
      ty + nextDistance * Math.sin(pitch),
      tz + horizontalDistance * Math.cos(yaw),
    ],
  };
}

export function cameraDistance(camera) {
  const [px, py, pz] = camera.position;
  const [tx, ty, tz] = camera.target;
  return Math.hypot(px - tx, py - ty, pz - tz);
}

export function relativeZoomDistance(startDistance, startRatio, currentRatio, {
  sensitivity = 3,
  minScale = 0.04,
  maxScale = 6,
  deadZone = 0.015,
} = {}) {
  const change = applyDeadZone(currentRatio - startRatio, deadZone);
  return Math.max(startDistance * minScale, Math.min(startDistance * maxScale,
    startDistance * Math.exp(change * sensitivity),
  ));
}
