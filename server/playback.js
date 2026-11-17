export function applyPlaybackAction(playback, action, positionMs) {
  const now = new Date();
  if (action === "play") {
    playback.isPlaying = true;
    playback.startedAt = now;
  } else if (action === "pause") {
    if (playback.isPlaying && playback.startedAt) {
      playback.positionMs += Math.max(0, now.getTime() - playback.startedAt.getTime());
    }
    playback.isPlaying = false;
  } else if (action === "seek") {
    playback.positionMs = Math.max(0, Number(positionMs) || 0);
    if (playback.isPlaying) playback.startedAt = now;
  }
  playback.updatedAt = now;
  return playback;
}
