import { SoonScreen } from "@/components/shell/soon-screen";

export const metadata = { title: "Cuidados · MyPet" };

export default function CuidadosPage() {
  return (
    <SoonScreen
      title="Cuidados"
      text="Aqui vai ficar a lista de todos os lembretes (remédios, vacinas, vermífugo, antipulgas, consultas), com a próxima data e o histórico de cada um."
    />
  );
}
