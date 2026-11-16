import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { AppProvider } from "@/components/app-provider";
import "./globals.css";

/** Nunito: arredondada e amigável. */
const appFont = Nunito({
  variable: "--font-app",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "MyPet",
  description: "O que fazer e quando, para o seu cachorro.",
  applicationName: "MyPet",
  appleWebApp: { capable: true, title: "MyPet", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fbf7f2",
  colorScheme: "light",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${appFont.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
