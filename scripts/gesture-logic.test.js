import test from "node:test";
import assert from "node:assert/strict";
import { applyDeadZone, cameraDistance, classifyHand, measureTwoPalmDistance, orbitCamera, relativeZoomDistance, smoothPoint, zoomCameraToDistance } from "../src/lib/gestureLogic.js";

function makePalm() {
  const points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  points[0] = { x: 0.5, y: 0.8 };
  points[5] = { x: 0.35, y: 0.55 };
  points[17] = { x: 0.65, y: 0.55 };
  points[4] = { x: 0.2, y: 0.48 };
  points[8] = { x: 0.32, y: 0.15 };
  points[6] = { x: 0.34, y: 0.34 };
  points[12] = { x: 0.45, y: 0.08 };
  points[10] = { x: 0.45, y: 0.32 };
  points[16] = { x: 0.56, y: 0.12 };
  points[14] = { x: 0.55, y: 0.34 };
  points[20] = { x: 0.68, y: 0.2 };
  points[18] = { x: 0.65, y: 0.38 };
  return points;
}

test("classifies an open palm for rotation", () => {
  assert.equal(classifyHand(makePalm()).gesture, "palm");
});

test("measures the gap between two palms relative to palm size", () => {
  const handA = makePalm();
  const handB = makePalm().map((point) => ({ x: point.x + 0.5, y: point.y }));
  const apart = measureTwoPalmDistance(handA, handB);
  const closerHand = handB.map((point) => ({ x: point.x - 0.2, y: point.y }));
  const together = measureTwoPalmDistance(handA, closerHand);
  assert.ok(apart > together);
  assert.ok(apart > 1);
});

test("classifies a curled hand as a fist", () => {
  const hand = makePalm();
  for (const [tip, x] of [[8, 0.46], [12, 0.5], [16, 0.54], [20, 0.58]]) hand[tip] = { x, y: 0.58 };
  hand[4] = { x: 0.1, y: 0.5 };
  assert.equal(classifyHand(hand).gesture, "fist");
});

test("smoothing and dead zone reject tiny tracking noise", () => {
  assert.deepEqual(smoothPoint({ x: 0.5, y: 0.5 }, { x: 0.6, y: 0.4 }, 0.25), { x: 0.525, y: 0.475 });
  assert.equal(applyDeadZone(0.004, 0.008), 0);
  assert.equal(applyDeadZone(0.02, 0.008), 0.012);
});

test("orbit control clamps movement and preserves target", () => {
  const camera = { position: [0, 0, 10], target: [0, 0, 0] };
  const updated = orbitCamera(camera, 2, 2, 2, 6, 18);
  assert.equal(updated.target, camera.target);
  assert.ok(Math.hypot(...updated.position) <= 18.0001);
  assert.ok(Math.hypot(...updated.position) >= 6);
});

test("camera zoom moves smoothly to a clamped distance and does not change the target", () => {
  const camera = { position: [0, 0, 10], target: [0, 0, 0] };
  const updated = zoomCameraToDistance(camera, 15, 6.5, 18);
  assert.equal(cameraDistance(updated), 15);
  assert.equal(updated.target, camera.target);
  assert.equal(cameraDistance(zoomCameraToDistance(camera, 30, 6.5, 18)), 18);
  assert.equal(cameraDistance(zoomCameraToDistance(camera, 2, 6.5, 18)), 6.5);
});

test("two-palm distance produces a meaningful zoom in and zoom out", () => {
  const start = 10;
  const settings = { sensitivity: 3, minScale: 0.04, maxScale: 6, deadZone: 0.015 };
  assert.ok(relativeZoomDistance(start, 1.6, 1.45, settings) < start);
  assert.ok(relativeZoomDistance(start, 1.6, 2.0, settings) > start);
  assert.equal(relativeZoomDistance(start, 1.6, 3.0, settings), start * 6);
});
