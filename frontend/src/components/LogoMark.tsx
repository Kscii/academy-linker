// ============================================================
// LogoMark — Academy Linker brand icon (dark square + connector + orange circle)
// ============================================================

interface LogoMarkProps {
  size?: number; // height in px; width is auto (≈1.75× height)
}

export function LogoMark({ size = 48 }: LogoMarkProps) {
  // ViewBox is 70 × 40 — maintain aspect ratio
  const w = Math.round(size * 1.75);
  const h = size;

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 70 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="alOrange" cx="40%" cy="38%" r="65%">
          <stop offset="0%"   stopColor="#F7C96A" />
          <stop offset="100%" stopColor="#E8824A" />
        </radialGradient>
        <radialGradient id="alNavy" cx="30%" cy="30%" r="80%">
          <stop offset="0%"   stopColor="#3D4480" />
          <stop offset="100%" stopColor="#252851" />
        </radialGradient>
      </defs>

      {/* Dark square */}
      <rect x="1" y="1" width="30" height="30" rx="7" fill="url(#alNavy)" />

      {/* White dot on square (near connector side) */}
      <circle cx="23" cy="16" r="4" fill="white" opacity="0.88" />

      {/* Horizontal connector bar */}
      <rect x="31" y="13.5" width="11" height="5" rx="2.5" fill="#C8956A" />

      {/* Orange gradient circle */}
      <circle cx="53" cy="22" r="17" fill="url(#alOrange)" />

      {/* White dot on circle (near connector side) */}
      <circle cx="43" cy="22" r="4" fill="white" opacity="0.88" />
    </svg>
  );
}
