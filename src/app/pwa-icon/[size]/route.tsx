import { ImageResponse } from "next/og";
import { LogoArt } from "@/lib/logo";

/** Ícones do app instalado: /pwa-icon/192, /pwa-icon/512 e /pwa-icon/512?maskable=1 */
export async function GET(req: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  const { size: raw } = await ctx.params;
  const size = raw === "512" ? 512 : 192;
  const maskable = new URL(req.url).searchParams.has("maskable");
  return new ImageResponse(<LogoArt size={size} maskable={maskable} />, { width: size, height: size });
}
