/**
 * Guia de alimentação (cães e gatos): resumo, seções detalhadas e a busca "Pode comer?".
 * Informações gerais (WSAVA, AAHA, ASPCA, AKC, Hill's, International Cat Care, PetMD).
 */
import type { Species } from "./types";
import { normalize } from "./breeds";

export type FoodStatus = "ok" | "cuidado" | "nao";

export const STATUS_ICON: Record<FoodStatus, string> = { ok: "✅", cuidado: "⚠️", nao: "❌" };
export const STATUS_LABEL: Record<FoodStatus, string> = { ok: "Pode, com moderação", cuidado: "Com cuidado", nao: "Não pode" };

export const FOOD_DISCLAIMER = "Informações gerais baseadas em fontes veterinárias (WSAVA, AAHA, ASPCA, AKC, Hill's). Cada pet é único. Na dúvida, consulte o veterinário.";

export const FOOD_SOURCES = [
  "WSAVA – Guia de petiscos para cães e gatos",
  "ASPCA Animal Poison Control – alimentos humanos a evitar",
  "AKC – frutas e alimentos para cães",
  "Hill's – ovos para cães",
  "Battersea / International Cat Care – alimentos tóxicos e lírios para gatos",
  "PetMD – frutas para gatos",
];

/** Resumo (aba Guia) */
export const SUMMARY = {
  golden: "Petiscos + comida humana = no máximo 10% das calorias do dia. A base é sempre a ração ou alimento completo.",
  never: ["Chocolate", "Café e cafeína", "Álcool", "Xilitol", "Uva e uva-passa", "Cebola e alho", "Macadâmia", "Ossos", "Massa crua", "Ovo e carne crus"],
  okDog: ["Carnes cozidas sem tempero e sem osso", "Ovo cozido", "Algumas frutas sem semente (maçã, banana, melancia)"],
  okCat: ["Frango ou peixe cozidos, sem tempero e sem osso", "Ovo cozido (pouquinho)", "Água fresca sempre (não leite)"],
  lily: "Lírios são extremamente tóxicos para gatos (folhas, flores, pólen e até a água do vaso).",
};

export interface FoodSection {
  id: string;
  emoji: string;
  title: string;
  /** só para esta espécie (sem = as duas) */
  only?: Species;
  intro?: string;
  items: { text: string; status?: FoodStatus }[];
  steps?: string[];
}

export const SECTIONS: FoodSection[] = [
  {
    id: "base",
    emoji: "🥣",
    title: "A base da alimentação",
    items: [
      { text: "A base do pet deve ser sempre uma ração ou alimento completo e balanceado, próprio para a espécie e a fase de vida." },
      { text: "Petisco nunca substitui refeição." },
      { text: "Comida humana não é necessária. Se oferecer, que seja como petisco ocasional." },
      { text: "Cachorros são onívoros (comem de tudo um pouco) e não precisam de frutas e verduras, mas algumas são seguras como petisco." },
      { text: "Gatos são carnívoros estritos: precisam de nutrientes que vêm da carne. Frutas e verduras não fazem falta para eles." },
    ],
  },
  {
    id: "dez",
    emoji: "📏",
    title: "A regra dos 10%",
    items: [
      { text: "Segundo a WSAVA e a AAHA, petiscos (incluindo comida humana) devem somar no máximo 10% das calorias do dia." },
      { text: "Os outros 90% vêm do alimento completo." },
      { text: "Petiscos demais levam ao sobrepeso, um dos problemas mais comuns em cães e gatos." },
      { text: "Em gatos castrados ou que vivem só dentro de casa, exagerar nos petiscos e reduzir a ração para compensar pode deixar a dieta desequilibrada." },
      { text: "Ofereça pedaços pequenos, no tamanho certo para não engasgar." },
    ],
  },
  {
    id: "proibidos",
    emoji: "❌",
    title: "Proibidos (cães e gatos)",
    items: [
      { status: "nao", text: "Chocolate: tem teobromina e cafeína, tóxicas para cães e gatos. Quanto mais amargo/concentrado em cacau, mais perigoso." },
      { status: "nao", text: "Café, chá, energéticos e refrigerantes com cafeína." },
      { status: "nao", text: "Álcool: absorvido muito rápido. Qualquer quantidade é emergência." },
      { status: "nao", text: "Massa crua com fermento: cresce no estômago, causa gases e dor, e produz álcool." },
      { status: "nao", text: "Xilitol: adoçante de chiclete, balas, doces diet, alguns bolos, algumas pastas de amendoim e pasta de dente. Em cães, pode causar queda grave de açúcar no sangue e lesão no fígado." },
      { status: "nao", text: "Uva e uva-passa (inclusive em bolos e pães): podem causar insuficiência renal, mesmo em pequenas quantidades em alguns animais." },
      { status: "nao", text: "Cebola, alho, cebolinha e alho-poró: crus, cozidos ou EM PÓ. Atenção a caldos, molhos, temperos prontos e restos de comida temperada." },
      { status: "nao", text: "Macadâmia (cães)." },
      { status: "nao", text: "Ossos cozidos ou crus: podem engasgar, quebrar dentes e perfurar ou entupir o intestino." },
      { status: "nao", text: "Comidas muito salgadas (batata frita, salgadinhos, pipoca com sal): o excesso de sal pode intoxicar." },
      { status: "nao", text: "Carne, peixe e ovo crus: risco de bactérias como Salmonella, que podem passar também para as pessoas da casa." },
      { status: "nao", text: "Caroços e sementes de frutas (cereja, manga, pêssego, ameixa, maçã): têm substâncias tóxicas e podem engasgar ou entupir o intestino." },
    ],
  },
  {
    id: "cuidado",
    emoji: "⚠️",
    title: "Com cuidado",
    items: [
      { status: "cuidado", text: "Leite e derivados: muitos cães e gatos têm pouca enzima para digerir a lactose, o que pode dar diarreia. A maioria dos gatos adultos tem intolerância. Gato precisa de água fresca, não de leite." },
      { status: "cuidado", text: "Queijo e iogurte (cães): só em pequenas quantidades. Iogurte apenas natural, sem açúcar e sem adoçante." },
      { status: "cuidado", text: "Comidas gordurosas (pele de frango, bacon, frituras, sobras de churrasco): podem causar vômito, diarreia e pancreatite." },
      { status: "cuidado", text: "Comidas temperadas ou industrializadas: muito sal, açúcar e temperos." },
      { status: "cuidado", text: "Coco e óleo de coco: podem dar diarreia. Água de coco tem muito potássio e não deve ser oferecida." },
      { status: "cuidado", text: "Abacate: as fontes divergem. Por segurança, evitar." },
      { status: "cuidado", text: "Amendoim (cães): só sem sal, sem casca e com moderação. Pasta de amendoim só se não tiver xilitol." },
    ],
  },
  {
    id: "ovo",
    emoji: "🥚",
    title: "Ovo",
    items: [
      { status: "ok", text: "Pode, desde que BEM COZIDO (cozido ou mexido), sem sal, sem óleo e sem tempero." },
      { status: "cuidado", text: "Frito: evitar (gordura extra)." },
      { status: "nao", text: "Cru: não. Tem risco de Salmonella, e a clara crua tem avidina, uma proteína que impede a absorção da biotina (vitamina importante para pele e pelo). Cozinhar desativa esse efeito." },
      { text: "Cães com doença renal, doença no fígado, pancreatite ou diabetes: só com liberação do veterinário." },
      { text: "Gatos: pequenas porções ocasionais, como petisco." },
      { text: "Começar com pouco para ver se o pet tolera bem." },
    ],
  },
  {
    id: "carnes",
    emoji: "🍗",
    title: "Carnes e peixes",
    items: [
      { status: "ok", text: "Frango, peru, carne bovina e peixe: cozidos, sem tempero, sem pele, sem gordura e SEM OSSO/ESPINHA." },
      { status: "nao", text: "Presunto, bacon, linguiça e embutidos: evitar (muito sal e gordura)." },
      { status: "nao", text: "Peixe cru: evitar." },
    ],
  },
  {
    id: "frutas-cao",
    emoji: "🍉",
    title: "Frutas — cachorro",
    only: "cachorro",
    intro: "Regra: sempre lavada, sem casca dura, sem sementes e sem caroço, em pedaços pequenos, como petisco.",
    items: [
      { status: "ok", text: "Maçã: sem miolo e sem sementes." },
      { status: "ok", text: "Banana: sem casca, pouca quantidade (tem bastante açúcar)." },
      { status: "ok", text: "Manga: sem caroço e sem casca, pouca quantidade." },
      { status: "ok", text: "Melancia: sem casca e sem sementes (podem entupir o intestino). Hidrata bem." },
      { status: "ok", text: "Melão: sem casca e sem sementes. Evitar em cães com sobrepeso ou diabetes." },
      { status: "ok", text: "Morango, mirtilo, framboesa, amora: boas opções em pequenas quantidades." },
      { status: "ok", text: "Pera: sem sementes e sem miolo." },
      { status: "ok", text: "Abacaxi: fresco, sem casca e sem miolo, em pouca quantidade. Nunca em calda." },
      { status: "ok", text: "Laranja: só a polpa, pouca quantidade." },
      { status: "nao", text: "Não podem: uva e uva-passa, cereja (caule, folhas e caroço), abacate (evitar), tomate verde e as partes verdes do tomateiro." },
      { status: "nao", text: "Nunca oferecer: fruta em calda, suco industrializado ou fruta estragada." },
    ],
  },
  {
    id: "frutas-gato",
    emoji: "🍉",
    title: "Frutas — gato",
    only: "gato",
    items: [
      { text: "Gatos não sentem o gosto doce. Se gostarem, é pela textura ou pelo cheiro. É normal recusarem." },
      { text: "Frutas não fazem falta. Se oferecer, 1 ou 2 pedacinhos de vez em quando." },
      { status: "ok", text: "Podem (sem casca e sem semente, em pedacinhos): maçã, banana (bem pouco), mirtilo, morango, melão, melancia." },
      { status: "nao", text: "Não podem: uva e uva-passa, frutas cítricas (laranja, limão, tangerina), tomate verde." },
      { status: "cuidado", text: "Fruta passada ou estragada: fermenta e produz álcool, muito tóxico para gatos." },
    ],
  },
  {
    id: "gatos",
    emoji: "🐱",
    title: "Atenção especial para gatos",
    only: "gato",
    items: [
      { status: "nao", text: "Lírios: extremamente tóxicos. Folhas, flores, pólen e até a água do vaso podem causar insuficiência renal grave. Não ter lírios em casa." },
      { status: "nao", text: "Cebola e alho em pó (caldos, molhos, comida temperada) são especialmente perigosos." },
      { status: "cuidado", text: "Leite não é recomendado." },
      { status: "ok", text: "Água fresca sempre disponível. Fontes de água estimulam o gato a beber mais." },
    ],
  },
  {
    id: "comeu",
    emoji: "🚨",
    title: "Comeu algo proibido?",
    items: [],
    steps: [
      "Mantenha a calma e afaste o pet do alimento.",
      "Anote O QUE comeu, QUANTO e A QUE HORAS (guarde a embalagem, se tiver).",
      "Não induza vômito por conta própria.",
      "Ligue imediatamente para o veterinário ou a clínica de emergência.",
    ],
  },
];

// ---------------------------------------------------------------------------------------------
// "Pode comer?"
// ---------------------------------------------------------------------------------------------

export interface Food {
  name: string;
  aliases?: string[];
  dog: FoodStatus;
  cat: FoodStatus;
  /** Como servir / por quê (geral) */
  how: string;
  howDog?: string;
  howCat?: string;
}

const NOT_FOR_CATS = "Para gatos: frutas e verduras não fazem falta e esta não está entre as seguras. Melhor evitar.";

export const FOODS: Food[] = [
  { name: "Chocolate", aliases: ["cacau", "brigadeiro", "bombom"], dog: "nao", cat: "nao", how: "Tóxico (teobromina e cafeína). Quanto mais amargo, mais perigoso. Comeu? Emergência." },
  { name: "Café", aliases: ["cafeína", "cafe"], dog: "nao", cat: "nao", how: "Cafeína é tóxica para cães e gatos." },
  { name: "Chá", aliases: ["cha", "mate"], dog: "nao", cat: "nao", how: "Chás com cafeína são tóxicos." },
  { name: "Energético / refrigerante", aliases: ["coca", "refrigerante", "energetico", "guaraná"], dog: "nao", cat: "nao", how: "Têm cafeína e açúcar." },
  { name: "Álcool", aliases: ["cerveja", "vinho", "bebida alcoolica", "alcool"], dog: "nao", cat: "nao", how: "Absorvido muito rápido. Qualquer quantidade é emergência." },
  { name: "Massa crua com fermento", aliases: ["massa de pão", "fermento", "massa crua"], dog: "nao", cat: "nao", how: "Cresce no estômago, dá gases e dor, e produz álcool." },
  { name: "Xilitol", aliases: ["chiclete", "bala", "doce diet", "pasta de dente", "adoçante"], dog: "nao", cat: "nao", how: "Em cães causa queda grave de açúcar no sangue e lesão no fígado. Leia o rótulo." },
  { name: "Uva", aliases: ["uva-passa", "passas", "uva passa"], dog: "nao", cat: "nao", how: "Pode causar insuficiência renal, mesmo em pouca quantidade (inclusive em bolos e pães)." },
  { name: "Cebola", aliases: ["cebolinha", "alho-poró", "alho poro", "caldo", "tempero pronto"], dog: "nao", cat: "nao", how: "Crua, cozida ou em pó. Cuidado com caldos, molhos e restos temperados." },
  { name: "Alho", dog: "nao", cat: "nao", how: "Cru, cozido ou em pó. Muito comum em temperos prontos." },
  { name: "Macadâmia", aliases: ["macadamia", "nozes"], dog: "nao", cat: "nao", how: "Tóxica para cães. Evite oleaginosas para gatos também." },
  { name: "Ossos", aliases: ["osso", "osso cozido", "osso cru", "espinha"], dog: "nao", cat: "nao", how: "Podem engasgar, quebrar dentes e perfurar ou entupir o intestino." },
  { name: "Comida muito salgada", aliases: ["batata frita", "salgadinho", "pipoca", "sal"], dog: "nao", cat: "nao", how: "O excesso de sal pode intoxicar." },
  { name: "Carne crua", aliases: ["carne mal passada"], dog: "nao", cat: "nao", how: "Risco de Salmonella e outras bactérias (também para as pessoas da casa). Sirva cozida." },
  { name: "Peixe cru", aliases: ["sushi", "sashimi"], dog: "nao", cat: "nao", how: "Evitar. Peixe só cozido, sem tempero e sem espinha." },
  { name: "Ovo cru", aliases: ["clara crua", "gema crua"], dog: "nao", cat: "nao", how: "Risco de Salmonella, e a clara crua atrapalha a absorção da biotina." },
  { name: "Ovo cozido", aliases: ["ovo", "ovo mexido"], dog: "ok", cat: "ok", how: "Bem cozido ou mexido, sem sal, sem óleo e sem tempero. Comece com pouco.", howCat: "Pequenas porções de vez em quando, como petisco." },
  { name: "Ovo frito", dog: "cuidado", cat: "cuidado", how: "Evitar: gordura extra." },
  { name: "Frango cozido", aliases: ["frango", "peito de frango"], dog: "ok", cat: "ok", how: "Cozido, sem tempero, sem pele e sem osso.", howCat: "Em pedacinhos, sem tempero e sem osso." },
  { name: "Peru cozido", aliases: ["peru"], dog: "ok", cat: "ok", how: "Cozido, sem tempero, sem pele e sem osso." },
  { name: "Carne bovina cozida", aliases: ["carne", "carne moída", "patinho"], dog: "ok", cat: "ok", how: "Cozida, sem tempero e sem gordura." },
  { name: "Peixe cozido", aliases: ["peixe", "tilápia", "salmão"], dog: "ok", cat: "ok", how: "Cozido, sem tempero e SEM ESPINHA.", howCat: "Em pedacinhos, sem tempero e sem espinha." },
  { name: "Presunto e embutidos", aliases: ["presunto", "linguiça", "salsicha", "salame", "mortadela", "bacon"], dog: "nao", cat: "nao", how: "Evitar: muito sal e gordura." },
  { name: "Pele de frango e gorduras", aliases: ["pele de frango", "fritura", "churrasco", "picanha"], dog: "cuidado", cat: "cuidado", how: "Podem causar vômito, diarreia e pancreatite." },
  { name: "Leite", aliases: ["leite de vaca", "derivados"], dog: "cuidado", cat: "cuidado", how: "Muitos têm intolerância à lactose (diarreia).", howCat: "Não recomendado: a maioria dos gatos adultos tem intolerância. Dê água fresca." },
  { name: "Queijo", dog: "cuidado", cat: "cuidado", how: "Só um pouquinho, de vez em quando." },
  { name: "Iogurte natural", aliases: ["iogurte"], dog: "cuidado", cat: "cuidado", how: "Só natural, sem açúcar e sem adoçante, em pequena quantidade." },
  { name: "Coco", aliases: ["óleo de coco", "oleo de coco"], dog: "cuidado", cat: "cuidado", how: "Pode dar diarreia." },
  { name: "Água de coco", aliases: ["agua de coco"], dog: "nao", cat: "nao", how: "Tem muito potássio. Não ofereça." },
  { name: "Abacate", dog: "nao", cat: "nao", how: "As fontes divergem. Por segurança, evitar." },
  { name: "Amendoim", aliases: ["pasta de amendoim", "paçoca"], dog: "cuidado", cat: "cuidado", how: "Só sem sal, sem casca e com moderação. Pasta de amendoim só sem xilitol.", howCat: NOT_FOR_CATS },
  { name: "Arroz cozido", aliases: ["arroz"], dog: "ok", cat: "cuidado", how: "Cozido simples, sem tempero, pouca quantidade.", howCat: "Não faz falta para gatos. Se der, bem pouco e sem tempero." },
  { name: "Abóbora cozida", aliases: ["abóbora", "abobora", "moranga"], dog: "ok", cat: "cuidado", how: "Cozida, sem tempero e sem casca.", howCat: NOT_FOR_CATS },
  { name: "Cenoura", dog: "ok", cat: "cuidado", how: "Crua ou cozida, em pedaços pequenos.", howCat: NOT_FOR_CATS },
  { name: "Maçã", aliases: ["maca"], dog: "ok", cat: "ok", how: "Sem miolo e sem sementes, em pedaços pequenos.", howCat: "1 ou 2 pedacinhos, sem casca e sem semente." },
  { name: "Banana", dog: "ok", cat: "ok", how: "Sem casca, pouca quantidade (tem bastante açúcar).", howCat: "Bem pouco, de vez em quando." },
  { name: "Manga", dog: "ok", cat: "cuidado", how: "Sem caroço e sem casca, pouca quantidade.", howCat: NOT_FOR_CATS },
  { name: "Melancia", dog: "ok", cat: "ok", how: "Sem casca e sem sementes. Hidrata bem." },
  { name: "Melão", aliases: ["melao"], dog: "ok", cat: "ok", how: "Sem casca e sem sementes. Evitar em cães com sobrepeso ou diabetes." },
  { name: "Morango", dog: "ok", cat: "ok", how: "Lavado, em pedaços, pouca quantidade." },
  { name: "Mirtilo", aliases: ["blueberry"], dog: "ok", cat: "ok", how: "Boa opção em pequena quantidade." },
  { name: "Framboesa", dog: "ok", cat: "cuidado", how: "Pequena quantidade.", howCat: NOT_FOR_CATS },
  { name: "Amora", dog: "ok", cat: "cuidado", how: "Pequena quantidade.", howCat: NOT_FOR_CATS },
  { name: "Pera", dog: "ok", cat: "cuidado", how: "Sem sementes e sem miolo.", howCat: NOT_FOR_CATS },
  { name: "Abacaxi", dog: "ok", cat: "cuidado", how: "Fresco, sem casca e sem miolo, pouca quantidade. Nunca em calda.", howCat: NOT_FOR_CATS },
  { name: "Laranja", aliases: ["tangerina", "limão", "limao", "mexerica", "cítricas"], dog: "ok", cat: "nao", how: "Só a polpa, pouca quantidade.", howCat: "Frutas cítricas não podem para gatos." },
  { name: "Cereja", dog: "nao", cat: "nao", how: "Caule, folhas e caroço são tóxicos." },
  { name: "Caroços e sementes", aliases: ["caroço", "semente", "pêssego", "ameixa"], dog: "nao", cat: "nao", how: "Têm substâncias tóxicas e podem engasgar ou entupir o intestino." },
  { name: "Tomate verde", aliases: ["tomate", "tomateiro"], dog: "nao", cat: "nao", how: "Tomate verde e as partes verdes do tomateiro fazem mal." },
  { name: "Fruta em calda / suco industrializado", aliases: ["calda", "suco", "fruta estragada", "fruta passada"], dog: "nao", cat: "nao", how: "Muito açúcar. Fruta passada fermenta e produz álcool (muito tóxico para gatos)." },
  { name: "Lírio", aliases: ["lirio", "planta", "flor"], dog: "cuidado", cat: "nao", how: "Não é comida: mantenha plantas longe.", howCat: "Extremamente tóxico: folhas, flores, pólen e até a água do vaso. Não tenha lírios em casa." },
];

/** Busca sem acento: nome ou apelido que contém o texto. */
export function searchFoods(q: string): Food[] {
  const n = normalize(q.trim());
  if (!n) return [];
  return FOODS.filter((f) => [f.name, ...(f.aliases ?? [])].some((x) => normalize(x).includes(n))).slice(0, 8);
}
