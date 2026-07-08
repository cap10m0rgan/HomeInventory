export function BlueprintMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="mark" aria-hidden="true">
      <rect width="64" height="64" rx="10" fill="var(--bp-bg-2)" stroke="var(--bp-line-strong)" />
      <g stroke="var(--bp-ink)" strokeWidth="2.4" fill="none" strokeLinecap="square">
        <path d="M9 9V17M9 9H17" />
        <path d="M55 9V17M55 9H47" />
        <path d="M9 55V47M9 55H17" />
        <path d="M55 55V47M55 55H47" />
      </g>
      <circle cx="32" cy="32" r="9" fill="none" stroke="var(--bp-stamp)" strokeWidth="2.6" />
      <path d="M32 23V41M23 32H41" stroke="var(--bp-stamp)" strokeWidth="2.6" />
    </svg>
  );
}
