import { FoodScreen } from "@/components/guia/food";

export const metadata = { title: "Alimentação · MyPet" };

export default async function AlimentacaoPage({ searchParams }: PageProps<"/guia/alimentacao">) {
  const { especie } = await searchParams;
  return <FoodScreen initialSpecies={especie === "gato" ? "gato" : especie === "cachorro" ? "cachorro" : undefined} />;
}
