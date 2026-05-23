// ViaCEP autofill
export interface EnderecoCEP {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  cep: string;
}

export async function buscarCEP(cep: string): Promise<EnderecoCEP | null> {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!r.ok) return null;
    const data = await r.json();
    if (data.erro) return null;
    return {
      logradouro: data.logradouro ?? "",
      bairro: data.bairro ?? "",
      localidade: data.localidade ?? "",
      uf: data.uf ?? "",
      cep: data.cep ?? clean,
    };
  } catch {
    return null;
  }
}

export function formatarEnderecoCEP(e: EnderecoCEP, numero?: string): string {
  const partes = [
    [e.logradouro, numero].filter(Boolean).join(", "),
    e.bairro,
    [e.localidade, e.uf].filter(Boolean).join(" - "),
    `CEP ${e.cep}`,
  ].filter(Boolean);
  return partes.join(" · ");
}
