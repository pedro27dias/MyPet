import type { Size, Species } from "./types";

export const SRD = "SRD (vira-lata)";

/** Raças mais comuns no Brasil, com o porte típico (para já sugerir na pergunta do porte). */
export const BREEDS: { name: string; size: Size | null }[] = [
  { name: SRD, size: null },
  { name: "Shih Tzu", size: "pequeno" },
  { name: "Yorkshire", size: "pequeno" },
  { name: "Poodle", size: "pequeno" },
  { name: "Lhasa Apso", size: "pequeno" },
  { name: "Spitz Alemão (Lulu da Pomerânia)", size: "pequeno" },
  { name: "Bulldog Francês", size: "pequeno" },
  { name: "Pinscher", size: "pequeno" },
  { name: "Maltês", size: "pequeno" },
  { name: "Dachshund (Salsicha)", size: "pequeno" },
  { name: "Pug", size: "pequeno" },
  { name: "Chihuahua", size: "pequeno" },
  { name: "Golden Retriever", size: "grande" },
  { name: "Labrador", size: "grande" },
  { name: "Border Collie", size: "medio" },
  { name: "Pastor Alemão", size: "grande" },
  { name: "Rottweiler", size: "grande" },
  { name: "Beagle", size: "medio" },
  { name: "Pitbull", size: "medio" },
  { name: "American Bully", size: "medio" },
  { name: "Schnauzer", size: "pequeno" },
  { name: "Bulldog Inglês", size: "medio" },
  { name: "Husky Siberiano", size: "grande" },
  { name: "Boxer", size: "grande" },
  { name: "Cocker Spaniel", size: "medio" },
  { name: "Jack Russell Terrier", size: "pequeno" },
  { name: "Pastor Belga", size: "grande" },
  { name: "Pastor Australiano", size: "medio" },
  { name: "Dobermann", size: "grande" },
  { name: "Akita", size: "grande" },
  { name: "Chow Chow", size: "medio" },
  { name: "Shar-pei", size: "medio" },
  { name: "Basset Hound", size: "medio" },
  { name: "Dálmata", size: "grande" },
  { name: "Fila Brasileiro", size: "gigante" },
  { name: "Pequinês", size: "pequeno" },
  { name: "Welsh Corgi", size: "pequeno" },
  { name: "Cavalier King Charles", size: "pequeno" },
  { name: "Bichon Frisé", size: "pequeno" },
  { name: "Boston Terrier", size: "pequeno" },
  { name: "Staffordshire Bull Terrier", size: "medio" },
  { name: "Weimaraner", size: "grande" },
  { name: "Cane Corso", size: "gigante" },
  { name: "Dogo Argentino", size: "grande" },
  { name: "Bernese", size: "gigante" },
  { name: "São Bernardo", size: "gigante" },
  { name: "Dogue Alemão", size: "gigante" },
  { name: "Mastiff", size: "gigante" },
  { name: "Samoieda", size: "medio" },
  { name: "Shiba Inu", size: "pequeno" },
  { name: "Whippet", size: "medio" },
  { name: "Galgo", size: "grande" },
];

/** Raças de gato mais comuns (gato não tem pergunta de porte). */
export const CAT_BREEDS: { name: string; size: Size | null }[] = [
  { name: SRD, size: null },
  { name: "Siamês", size: null },
  { name: "Persa", size: null },
  { name: "Maine Coon", size: null },
  { name: "Angorá", size: null },
  { name: "Ragdoll", size: null },
  { name: "British Shorthair", size: null },
  { name: "Bengal", size: null },
  { name: "Sphynx", size: null },
  { name: "Exótico", size: null },
];

export function breedsFor(species: Species | null | undefined) {
  return species === "gato" ? CAT_BREEDS : BREEDS;
}

export function breedSize(name: string | null): Size | null {
  return BREEDS.find((b) => b.name === name)?.size ?? null;
}

/** Busca sem acento e sem maiúsculas. */
export function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
