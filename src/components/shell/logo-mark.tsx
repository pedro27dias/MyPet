/** Logo (pegada) para usar nas telas. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="inline-grid place-items-center bg-primary"
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
      aria-hidden
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 100 100">
        <ellipse cx="50" cy="66" rx="22" ry="19" fill="white" />
        <ellipse cx="22" cy="42" rx="9" ry="11" fill="white" />
        <ellipse cx="38" cy="24" rx="9" ry="11.5" fill="white" />
        <ellipse cx="62" cy="24" rx="9" ry="11.5" fill="white" />
        <ellipse cx="78" cy="42" rx="9" ry="11" fill="white" />
        <circle cx="50" cy="66" r="6" fill="var(--peach)" />
      </svg>
    </span>
  );
}
