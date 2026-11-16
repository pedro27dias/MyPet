import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { AppProvider } from "@/components/app-provider";
import "./globals.css";

/** Textos e números: DM Sans (limpa). */
const appFont = DM_Sans({
  variable: "--font-app",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

/** Títulos: Fraunces itálica (serifada elegante). */
const titleFont = Fraunces({
  variable: "--font-titulo",
  subsets: ["latin"],
  style: ["italic", "normal"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "MyPet",
  description: "O que fazer e quando, para o seu cachorro.",
  applicationName: "MyPet",
  appleWebApp: { capable: true, title: "MyPet", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fff8f9",
  colorScheme: "light",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${appFont.variable} ${titleFont.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
