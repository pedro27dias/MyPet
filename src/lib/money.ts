/** Dinheiro em reais: "R$ 1.234,50". */
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function fmtMoney(value: number): string {
  return BRL.format(value);
}

/** Centavos inteiros → reais (evita erro de arredondamento ao somar). */
export function sumMoney(values: number[]): number {
  return Math.round(values.reduce((t, v) => t + Math.round(v * 100), 0)) / 100;
}
