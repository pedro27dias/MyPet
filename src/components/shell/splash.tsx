import { LogoMark } from "./logo-mark";

/** Tela de carregamento (logo pulsando). */
export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="animate-pulse">
        <LogoMark size={64} />
      </div>
    </div>
  );
}
