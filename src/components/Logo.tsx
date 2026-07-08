export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="logo-mark" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--accent)" />
      <path
        d="M32 12 L52 28 V50 a2 2 0 0 1-2 2H14 a2 2 0 0 1-2-2V28 Z"
        fill="none"
        stroke="var(--accent-ink)"
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
      <rect x="27" y="36" width="10" height="16" fill="var(--accent-ink)" />
    </svg>
  );
}
