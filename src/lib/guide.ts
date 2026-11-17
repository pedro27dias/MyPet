/**
 * Conteúdo do Guia (aba Guia): orientações GERAIS por fase da vida, em linguagem simples.
 * Não substitui o veterinário (o aviso fica fixo na tela).
 */
import type { Pet, Species } from "./types";
import { ageInDays } from "./dates";

/** Cachorro: filhote/adulto/idoso. Gato: filhote/jovem/maduro/senior. */
export type Phase = "filhote" | "adulto" | "idoso" | "jovem" | "maduro" | "senior";
export type TopicKey = "vacinas" | "vermifugo" | "pulgas" | "testes" | "alimentacao" | "cuidados";

export const DISCLAIMER = "Informações gerais. Siga sempre a orientação do seu veterinário.";
export const DISCLAIMER_CAT = "Informações gerais baseadas em diretrizes veterinárias (WSAVA, AAHA/AAFP, ESCCAP). Siga sempre a orientação do seu veterinário.";

export interface GuideTopic {
  key: TopicKey;
  title: string;
  items: string[];
}

export interface GuidePhase {
  key: Phase;
  label: string;
  /** Nome curto para o seletor (cabe em 4 colunas). */
  short?: string;
  range: string;
  intro: string;
  topics: GuideTopic[];
}

/** Idoso a partir de ~7 anos; cães gigantes envelhecem antes (~6 anos). */
export function seniorAge(pet: Pick<Pet, "size">): number {
  return pet.size === "gigante" ? 6 : 7;
}

/** Fase atual do pet (null se a idade não foi informada). */
export function petPhase(pet: Pick<Pet, "birth" | "size"> & { species?: Species }): Phase | null {
  const days = ageInDays(pet.birth);
  if (days === null) return null;
  if (days < 365) return "filhote";
  if (pet.species === "gato") return days < 7 * 365 ? "jovem" : days < 10 * 365 ? "maduro" : "senior";
  if (days >= seniorAge(pet) * 365) return "idoso";
  return "adulto";
}

export const GUIDE: GuidePhase[] = [
  {
    key: "filhote",
    label: "Filhote",
    range: "até 1 ano",
    intro: "Fase de vacinas, vermífugo frequente e muita descoberta.",
    topics: [
      {
        key: "vacinas",
        title: "Calendário de vacinas",
        items: [
          "V8 ou V10: 1ª dose entre 6 e 8 semanas (perto dos 45 dias).",
          "Reforços a cada 3 a 4 semanas, até umas 16 semanas (costumam ser 3 doses).",
          "Antirrábica a partir de 12 semanas (3 meses).",
          "Gripe e giárdia são opcionais: o veterinário diz se vale a pena.",
          "Passeio na rua e contato com outros cães só depois que o veterinário liberar.",
        ],
      },
      {
        key: "vermifugo",
        title: "Vermífugo",
        items: [
          "Começa por volta dos 15 dias de vida.",
          "Repete a cada 15 dias até 2 ou 3 meses, depois uma vez por mês até os 6 meses.",
          "A dose depende do peso: pese o filhote antes.",
        ],
      },
      {
        key: "pulgas",
        title: "Pulgas e carrapatos",
        items: [
          "Cada produto tem idade e peso mínimos: confira na embalagem.",
          "Mantenha a caminha e o lugar onde ele fica sempre limpos.",
        ],
      },
      {
        key: "alimentacao",
        title: "Alimentação",
        items: [
          "Ração própria para filhotes, do porte dele.",
          "3 a 4 refeições por dia até os 6 meses; depois 2 a 3.",
          "Água fresca sempre à vontade.",
          "Nunca dê chocolate, uva, cebola, alho, adoçante xilitol ou osso cozido.",
        ],
      },
      {
        key: "cuidados",
        title: "Cuidados gerais",
        items: [
          "Até uns 4 meses é a melhor fase para acostumar com pessoas, sons e lugares.",
          "Entre 4 e 6 meses os dentes trocam: ofereça mordedores.",
          "Castração: converse com o veterinário sobre a melhor idade.",
          "Banho só quando o veterinário liberar.",
        ],
      },
    ],
  },
  {
    key: "adulto",
    label: "Adulto",
    range: "de 1 a 7 anos",
    intro: "Fase de manter a rotina: reforços anuais, proteção e exercício.",
    topics: [
      {
        key: "vacinas",
        title: "Calendário de vacinas",
        items: [
          "Reforço uma vez por ano da V8/V10 e da antirrábica.",
          "Muitas cidades têm campanha gratuita da antirrábica.",
          "Gripe, giárdia e leishmaniose dependem da região e da rotina (leishmaniose em áreas de risco).",
        ],
      },
      {
        key: "vermifugo",
        title: "Vermífugo",
        items: [
          "Em geral a cada 3 ou 4 meses.",
          "Mais vezes se frequenta parques, creche ou tem contato com muitos cães.",
        ],
      },
      {
        key: "pulgas",
        title: "Pulgas e carrapatos",
        items: [
          "Proteção o ano todo: no Brasil o calor favorece pulgas e carrapatos.",
          "Respeite o intervalo do produto (coleira, comprimido ou pipeta).",
          "Carrapato transmite doenças sérias (como a erliquiose): confira o pelo depois de passeios.",
        ],
      },
      {
        key: "alimentacao",
        title: "Alimentação",
        items: [
          "Ração de adulto do porte dele, dividida em 2 refeições.",
          "A quantidade da embalagem é um ponto de partida: ajuste pelo corpo (dá para sentir as costelas sem apertar).",
          "Petiscos: no máximo 1/10 do que ele come no dia.",
        ],
      },
      {
        key: "cuidados",
        title: "Cuidados gerais",
        items: [
          "Check-up no veterinário uma vez por ano.",
          "Escovar os dentes, de preferência todo dia.",
          "Exercício e passeio diários.",
          "Cortar as unhas e banho a cada 15 a 30 dias, conforme o pelo.",
        ],
      },
    ],
  },
  {
    key: "idoso",
    label: "Idoso",
    range: "a partir de ~7 anos",
    intro: "Fase de mais atenção: check-ups mais frequentes e conforto.",
    topics: [
      {
        key: "vacinas",
        title: "Calendário de vacinas",
        items: [
          "Mantenha as vacinas em dia.",
          "O veterinário pode ajustar o esquema conforme a saúde dele.",
        ],
      },
      {
        key: "vermifugo",
        title: "Vermífugo",
        items: ["Continue a rotina, em geral a cada 3 ou 4 meses."],
      },
      {
        key: "pulgas",
        title: "Pulgas e carrapatos",
        items: [
          "Mantenha a proteção o ano todo.",
          "A pele pode ficar mais sensível: se coçar ou irritar, avise o veterinário.",
        ],
      },
      {
        key: "alimentacao",
        title: "Alimentação",
        items: [
          "Ração sênior ou ajustada pelo veterinário, com menos calorias.",
          "Fique de olho no peso: engordar ou emagrecer sem motivo merece consulta.",
          "Beber muito mais água que o normal é sinal para levar ao veterinário.",
        ],
      },
      {
        key: "cuidados",
        title: "Cuidados gerais",
        items: [
          "Check-up a cada 6 meses, com exame de sangue.",
          "Repare em: dificuldade para levantar, tosse, caroços, xixi demais, mudança no apetite ou confusão.",
          "Passeios mais leves e mais vezes por dia.",
          "Cama macia e tapetes que não escorregam ajudam muito.",
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------------------------
// Gatos
// ---------------------------------------------------------------------------------------------

export const GUIDE_CAT: GuidePhase[] = [
  {
    key: "filhote",
    label: "Filhote",
    range: "até 1 ano",
    intro: "Fase de vacinas, vermífugo, socialização, castração e do teste FeLV/FIV.",
    topics: [
      {
        key: "vacinas",
        title: "Calendário de vacinas",
        items: [
          "Polivalente (V3, V4 ou V5): 1ª dose entre 6 e 8 semanas.",
          "Reforços a cada 3 a 4 semanas, até 16 semanas de vida ou mais.",
          "Mais um reforço por volta dos 6 meses.",
          "Antirrábica a partir de 12 semanas.",
          "FeLV: indicada principalmente para quem vai sair de casa ou conviver com outros gatos, depois do teste.",
        ],
      },
      {
        key: "testes",
        title: "Teste FeLV/FIV",
        items: [
          "Faça o teste ao chegar em casa, principalmente se veio da rua ou vai conviver com outros gatos.",
          "Até sair o resultado, evite contato com outros gatos.",
          "Em filhotes, o veterinário pode pedir para repetir o teste mais tarde.",
        ],
      },
      {
        key: "vermifugo",
        title: "Vermífugo",
        items: [
          "Começa por volta de 3 semanas de vida.",
          "A cada 2 semanas até o desmame (umas 8 semanas).",
          "Depois, todo mês até os 6 meses.",
          "A dose depende do peso: pese o filhote antes.",
        ],
      },
      {
        key: "pulgas",
        title: "Pulgas",
        items: [
          "Só produtos próprios para gatos, respeitando a idade e o peso mínimos da embalagem.",
          "Mantenha a caminha e os cobertores limpos.",
        ],
      },
      {
        key: "alimentacao",
        title: "Alimentação",
        items: [
          "Ração própria para filhotes de gato (seca, úmida ou as duas).",
          "Várias pequenas refeições por dia.",
          "Água fresca sempre. Leite de vaca não é necessário e pode dar diarreia.",
          "Nunca dê cebola, alho, chocolate, uva ou uva-passa.",
        ],
      },
      {
        key: "cuidados",
        title: "Socialização e castração",
        items: [
          "Até umas 7 semanas é a fase mais importante para se acostumar com pessoas, colo e sons da casa.",
          "Brinque com varinhas e bolinhas, nunca com as mãos.",
          "Castração: costuma ser feita por volta dos 5 a 6 meses. Converse com o veterinário.",
          "Telas em janelas e sacadas evitam quedas.",
        ],
      },
    ],
  },
  {
    key: "jovem",
    label: "Adulto jovem",
    short: "Jovem",
    range: "de 1 a 6 anos",
    intro: "Fase de prevenir: peso certo, casa interessante e check-up anual.",
    topics: [
      {
        key: "vacinas",
        title: "Calendário de vacinas",
        items: [
          "Antirrábica: em geral uma vez por ano.",
          "Polivalente: reforço a cada 1 a 3 anos, conforme o risco. O veterinário decide.",
          "FeLV: reforço para quem sai de casa ou convive com outros gatos.",
        ],
      },
      {
        key: "vermifugo",
        title: "Vermífugo",
        items: ["Só dentro de casa: em geral 1 a 2 vezes por ano.", "Sai para a rua ou caça: a cada 1 a 3 meses."],
      },
      {
        key: "pulgas",
        title: "Pulgas",
        items: ["Mesmo dentro de casa, pulgas entram pela roupa e por outros animais.", "Use só produto para gatos."],
      },
      {
        key: "alimentacao",
        title: "Alimentação e peso",
        items: [
          "Gato castrado tende a engordar: controle a quantidade.",
          "Peso bom: dá para sentir as costelas sem apertar.",
          "Ração úmida ajuda na hidratação.",
          "Petiscos: no máximo 1/10 do que ele come no dia.",
        ],
      },
      {
        key: "cuidados",
        title: "Enriquecimento e check-up",
        items: [
          "Arranhador, lugares altos, esconderijos e brincadeira todo dia evitam tédio e estresse.",
          "Check-up no veterinário uma vez por ano.",
          "Escove o pelo para evitar bolas de pelo (principalmente pelo longo).",
        ],
      },
    ],
  },
  {
    key: "maduro",
    label: "Adulto maduro",
    short: "Maduro",
    range: "de 7 a 10 anos",
    intro: "Fase de prestar mais atenção ao peso, à sede e ao xixi.",
    topics: [
      { key: "vacinas", title: "Calendário de vacinas", items: ["Mantenha as vacinas em dia, conforme o veterinário."] },
      {
        key: "vermifugo",
        title: "Vermífugo",
        items: ["Continue conforme o estilo de vida: 1 a 2 vezes por ano se fica só em casa; mais vezes se sai."],
      },
      { key: "pulgas", title: "Pulgas", items: ["Mantenha a proteção, sempre com produto para gatos."] },
      {
        key: "alimentacao",
        title: "Peso, sede e xixi",
        items: [
          "Pese o gato de vez em quando: emagrecer ou engordar sem motivo merece consulta.",
          "Bebendo mais água ou fazendo mais xixi (torrões maiores na areia)? Avise o veterinário.",
        ],
      },
      {
        key: "cuidados",
        title: "Cuidados gerais",
        items: [
          "Check-up anual; o veterinário pode pedir exames de sangue e urina.",
          "Mudanças no apetite, no comportamento ou no uso da caixa de areia merecem atenção.",
          "Facilite o acesso aos lugares altos e à caixa de areia.",
        ],
      },
    ],
  },
  {
    key: "senior",
    label: "Sênior",
    range: "a partir de 10 anos",
    intro: "Fase de check-ups mais frequentes e muito conforto.",
    topics: [
      { key: "vacinas", title: "Calendário de vacinas", items: ["O veterinário ajusta o esquema conforme a saúde dele."] },
      { key: "vermifugo", title: "Vermífugo", items: ["Continue a rotina conforme o estilo de vida."] },
      { key: "pulgas", title: "Pulgas", items: ["Mantenha a proteção; a pele pode ficar mais sensível."] },
      {
        key: "alimentacao",
        title: "Alimentação",
        items: [
          "Ração sênior ou a indicada pelo veterinário.",
          "Mais sede, mais xixi ou emagrecer são sinais para consulta.",
          "Ofereça água em vários pontos da casa.",
        ],
      },
      {
        key: "cuidados",
        title: "Check-up e conforto",
        items: [
          "Check-up a cada 6 meses, com exames de rotina.",
          "Caminha macia e quente, e caixa de areia com borda baixa.",
          "Escove o pelo: gatos idosos se limpam menos.",
          "As unhas engrossam: confira com frequência.",
        ],
      },
    ],
  },
];

/** Cartões fixos de segurança dos gatos (aparecem em todas as fases). */
export const CAT_SAFETY = {
  danger: "NUNCA use antipulgas de cachorro em gato (risco de intoxicação grave por permetrina).",
  basics: [
    "Caixa de areia limpa todo dia (o ideal é uma por gato, mais uma).",
    "Água fresca sempre. Fonte de água estimula o gato a beber mais.",
    "Arranhador: é necessidade, não mania.",
    "Plantas tóxicas: lírios são muito perigosos (até o pólen). Confira antes de levar plantas para casa.",
  ],
};

export const WARNING_SIGNS_CAT = [
  "Fazer força na caixa de areia e sair pouco ou nenhum xixi (urgente, principalmente em machos)",
  "Não come há mais de 24 horas",
  "Respirar de boca aberta",
  "Vômitos que se repetem",
  "Muito escondido, quieto, sem vontade de nada",
  "Gengiva muito branca ou amarelada",
];

export function guideFor(species: Species | undefined) {
  return species === "gato"
    ? { phases: GUIDE_CAT, warnings: WARNING_SIGNS_CAT, fallback: "jovem" as Phase, disclaimer: DISCLAIMER_CAT }
    : { phases: GUIDE, warnings: WARNING_SIGNS, fallback: "adulto" as Phase, disclaimer: DISCLAIMER };
}

/** Sinais de alerta (qualquer idade): procurar o veterinário. */
export const WARNING_SIGNS = [
  "Vômito ou diarreia que se repetem",
  "Não come há mais de 24 horas",
  "Muito quieto, sem vontade de nada",
  "Dificuldade para respirar",
  "Gengiva muito branca ou arroxeada",
  "Sangue no xixi, cocô ou vômito",
];
