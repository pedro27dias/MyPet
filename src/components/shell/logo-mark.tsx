/** Logo: cachorro correndo (rosa) num quadrado arredondado verde-oliva. `plain` = só a silhueta, na cor do texto. */
export function LogoMark({ size = 40, plain = false, className = "" }: { size?: number; plain?: boolean; className?: string }) {
  if (plain) return <span className={`logo-silhueta ${className}`} style={{ width: size }} aria-hidden />;
  return (
    <span
      className={`inline-grid shrink-0 place-items-center bg-olive text-pink ${className}`}
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
      aria-hidden
    >
      <span className="logo-silhueta" style={{ width: size * 0.66 }} />
    </span>
  );
}
