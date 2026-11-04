import type { CSSProperties } from 'react';
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  const paths: Record<string, string> = {
    pause: 'M8 5v14M16 5v14',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    up: 'M6 18 18 6M6 6h12v12',
    exit: 'M13 5h7v14h-7M3 12h12m-5-5 5 5-5 5',
    check: 'm5 12 4 4L19 6',
    close: 'm6 6 12 12M6 18 18 6',
    clock: 'M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    bag: 'M6 7h12l2 14H4L6 7Zm3 0V5a3 3 0 0 1 6 0v2',
    shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
    play: 'm8 5 11 7-11 7V5Z',
    headphones: 'M4 14v-3a8 8 0 0 1 16 0v3M4 12h3v8H4v-8Zm13 0h3v8h-3v-8Z',
    reset: 'M4 9a8 8 0 1 1 0 7M4 3v6h6',
    download: 'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
    info: 'M12 11v6m0-10v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    filter: 'M4 6h16M7 12h10m-6 6h2',
    star: 'm12 3 3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1 3-6Z',
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      <path d={paths[name] || paths.arrow} />
    </svg>
  );
}
