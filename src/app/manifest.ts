import type { MetadataRoute } from "next";

/** Nome, ícone e cores quando o app é instalado na tela inicial do celular. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyPet",
    short_name: "MyPet",
    description: "O que fazer e quando, para o seu cachorro.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf7f2",
    theme_color: "#fbf7f2",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
