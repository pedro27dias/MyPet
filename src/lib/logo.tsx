/** Logo do MyPet: pegada branca num quadrado verde-água arredondado (usada nos ícones). */
export function LogoArt({ size, maskable = false }: { size: number; maskable?: boolean }) {
  const pad = maskable ? size * 0.16 : 0;
  const inner = size - pad * 2;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: maskable ? "#3f8f7f" : "transparent",
      }}
    >
      <div
        style={{
          width: inner,
          height: inner,
          borderRadius: maskable ? 0 : inner * 0.24,
          background: "#3f8f7f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width={inner * 0.62} height={inner * 0.62} viewBox="0 0 100 100">
          <ellipse cx="50" cy="66" rx="22" ry="19" fill="#fff" />
          <ellipse cx="22" cy="42" rx="9" ry="11" fill="#fff" />
          <ellipse cx="38" cy="24" rx="9" ry="11.5" fill="#fff" />
          <ellipse cx="62" cy="24" rx="9" ry="11.5" fill="#fff" />
          <ellipse cx="78" cy="42" rx="9" ry="11" fill="#fff" />
          <circle cx="50" cy="66" r="6" fill="#f2a07b" />
        </svg>
      </div>
    </div>
  );
}
