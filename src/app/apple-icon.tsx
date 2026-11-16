import { ImageResponse } from "next/og";
import { LogoArt } from "@/lib/logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícone do iPhone ("Adicionar à Tela de Início"). */
export default function AppleIcon() {
  return new ImageResponse(<LogoArt size={180} maskable />, size);
}
