import { useEffect, useRef, useState } from 'react';
export function videoTimeAt(positionMs: number, offsetMs: number, duration: number) {
  return Math.max(
    0,
    Math.min(
      Number.isFinite(duration) ? Math.max(0, duration - 0.02) : Infinity,
      (positionMs - offsetMs) / 1000,
    ),
  );
}
export function ReplayVideo({
  src,
  position,
  speed,
  playing,
  offset = 0,
  onReady,
  onError,
}: {
  src: string;
  position: number;
  speed: number;
  playing: boolean;
  offset?: number;
  onReady: () => void;
  onError: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || video.readyState < 1) return;
    const target = videoTimeAt(position, offset, video.duration);
    video.playbackRate = speed;
    if (
      (!playing || !video.seeking) &&
      Math.abs(video.currentTime - target) > (playing ? 0.15 : 0.02)
    )
      video.currentTime = target;
    if (playing && position >= offset && target < video.duration - 0.03) {
      if (video.paused) void video.play().catch(() => {});
    } else video.pause();
  }, [position, speed, playing, offset, loaded]);
  return (
    <video
      ref={ref}
      src={src.startsWith('blob:') ? src : `${src}${src.includes('?') ? '&' : '?'}playback=2`}
      muted
      playsInline
      preload="auto"
      onLoadedMetadata={() => setLoaded(true)}
      onLoadedData={onReady}
      onError={onError}
      aria-label="Recorded agent browser"
    />
  );
}
