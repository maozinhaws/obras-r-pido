// Valor por extenso em português (BRL)
const UNI = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_A_DEZENOVE = [
  "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos",
];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c) partes.push(CENTENAS[c]);
  if (r) {
    if (r < 10) partes.push(UNI[r]);
    else if (r < 20) partes.push(DEZ_A_DEZENOVE[r - 10]);
    else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      partes.push(u ? `${DEZENAS[d]} e ${UNI[u]}` : DEZENAS[d]);
    }
  }
  return partes.join(" e ");
}

function inteiroExtenso(n: number): string {
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (milhoes) partes.push(milhoes === 1 ? "um milhão" : `${ate999(milhoes)} milhões`);
  if (milhares) partes.push(milhares === 1 ? "mil" : `${ate999(milhares)} mil`);
  if (resto) partes.push(ate999(resto));
  return partes.join(" e ");
}

export function valorPorExtenso(valor: number): string {
  const v = Math.max(0, Math.round(valor * 100) / 100);
  const reais = Math.floor(v);
  const centavos = Math.round((v - reais) * 100);
  const partes: string[] = [];
  if (reais > 0) partes.push(`${inteiroExtenso(reais)} ${reais === 1 ? "real" : "reais"}`);
  if (centavos > 0) partes.push(`${inteiroExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  if (partes.length === 0) return "zero reais";
  return partes.join(" e ");
}
