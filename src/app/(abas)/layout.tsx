import { TabNav } from "@/components/shell/tab-nav";

/** As 4 abas (Início, Cuidados, Guia, Pet) dividem a mesma barra de navegação. */
export default function AbasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TabNav />
    </>
  );
}
