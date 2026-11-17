import test from "node:test";
import assert from "node:assert/strict";
import routes from "../routes.js";
import { applyPlaybackAction } from "../playback.js";

test("registers all three auth and 54 feature endpoints", () => {
  const endpoints = routes.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${layer.route.path}`));

  assert.equal(endpoints.length, 57);
  assert.equal(endpoints.filter((endpoint) => !endpoint.includes("/auth/")).length, 54);
  assert.ok(endpoints.includes("POST /auth/register"));
  assert.ok(endpoints.includes("POST /rooms/:id/tips"));
  assert.ok(endpoints.includes("PUT /admin/reports/:id"));
});

test("playback stores elapsed position when paused and resumes from that position", () => {
  const playback = {
    isPlaying: true,
    positionMs: 1500,
    startedAt: new Date(Date.now() - 2000)
  };

  applyPlaybackAction(playback, "pause");
  assert.equal(playback.isPlaying, false);
  assert.ok(playback.positionMs >= 3400);
  assert.ok(playback.positionMs <= 3600);

  applyPlaybackAction(playback, "play");
  assert.equal(playback.isPlaying, true);
  assert.ok(Math.abs(Date.now() - playback.startedAt.getTime()) < 100);
  assert.ok(playback.positionMs >= 3400);
});

test("seek clamps negative positions to zero", () => {
  const playback = { isPlaying: false, positionMs: 0, startedAt: new Date() };
  applyPlaybackAction(playback, "seek", -500);
  assert.equal(playback.positionMs, 0);
  assert.equal(playback.isPlaying, false);
});
