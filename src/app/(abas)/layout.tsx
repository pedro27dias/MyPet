import { TabNav } from "@/components/shell/tab-nav";

/** As abas (Início, Cuidados, Gastos, Guia) e o perfil do pet dividem a mesma barra de navegação. */
export default function AbasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TabNav />
    </>
  );
}
