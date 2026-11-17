import type { MetadataRoute } from "next";

/** Nome, ícone e cores quando o app é instalado na tela inicial do celular. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyPet",
    short_name: "MyPet",
    description: "O que fazer e quando, para o seu cachorro ou gato.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff8f9",
    theme_color: "#fff8f9",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
