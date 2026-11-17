/**
 * Conteúdo do Guia (aba Guia): orientações GERAIS por fase da vida, em linguagem simples.
 * Não substitui o veterinário (o aviso fica fixo na tela).
 */
import type { Pet } from "./types";
import { ageInDays } from "./dates";

export type Phase = "filhote" | "adulto" | "idoso";
export type TopicKey = "vacinas" | "vermifugo" | "pulgas" | "alimentacao" | "cuidados";

export interface GuideTopic {
  key: TopicKey;
  title: string;
  items: string[];
}

export interface GuidePhase {
  key: Phase;
  label: string;
  range: string;
  intro: string;
  topics: GuideTopic[];
}

/** Idoso a partir de ~7 anos; cães gigantes envelhecem antes (~6 anos). */
export function seniorAge(pet: Pick<Pet, "size">): number {
  return pet.size === "gigante" ? 6 : 7;
}

/** Fase atual do pet (null se a idade não foi informada). */
export function petPhase(pet: Pick<Pet, "birth" | "size">): Phase | null {
  const days = ageInDays(pet.birth);
  if (days === null) return null;
  if (days < 365) return "filhote";
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

/** Sinais de alerta (qualquer idade): procurar o veterinário. */
export const WARNING_SIGNS = [
  "Vômito ou diarreia que se repetem",
  "Não come há mais de 24 horas",
  "Muito quieto, sem vontade de nada",
  "Dificuldade para respirar",
  "Gengiva muito branca ou arroxeada",
  "Sangue no xixi, cocô ou vômito",
];
