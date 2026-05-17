import Dexie, { type Table } from "dexie";

export type StatusOrcamento =
  | "rascunho"
  | "enviado"
  | "aprovado"
  | "em_andamento"
  | "finalizado"
  | "cancelado";

export interface Cliente {
  id?: number;
  nome: string;
  apelido?: string;
  telefone?: string;
  email?: string;
  documento?: string;
  endereco?: string;
  criadoEm: number;
}

export interface Fornecedor {
  id?: number;
  nome: string;
  telefone?: string;
  categoria?: string;
  observacao?: string;
  criadoEm: number;
}

export interface ItemAmbiente {
  id: string;
  nome: string;
  altura?: number;
  comprimento?: number;
  servicos: string[];
  preco: number;
  observacao?: string;
  fotos: string[]; // ids de fotos
}

export interface Ambiente {
  id: string;
  nome: string;
  itens: ItemAmbiente[];
}

export interface Orcamento {
  id?: number;
  clienteId?: number;
  clienteSnapshot?: Cliente;
  ambientes: Ambiente[];
  formaPagamento?: string;
  validade?: string;
  inicio?: string;
  tipoServico?: string;
  observacoes?: string;
  totalManual?: number;
  precoAdicionalM2?: number;
  pagadorDiferente?: boolean;
  pagadorNome?: string;
  pagadorTelefone?: string;
  pagadorEndereco?: string;
  status: StatusOrcamento;
  criadoEm: number;
  atualizadoEm: number;
}

export interface Foto {
  id: string;
  blob: Blob;
  criadoEm: number;
}

export interface EventoAgenda {
  id?: number;
  titulo: string;
  data: string; // ISO
  hora?: string;
  observacao?: string;
  orcamentoId?: number;
  criadoEm: number;
}

export interface Recibo {
  id?: number;
  orcamentoId: number;
  valor: number;
  data: string;
  formaPagamento: string;
  observacao?: string;
  criadoEm: number;
}

export interface ConfigEmpresa {
  id: number; // sempre 1
  nome?: string;
  telefone?: string;
  email?: string;
  documento?: string;
  endereco?: string;
  logo?: string; // dataURL
  assinatura?: string;
  mensagemPadraoWhats?: string;
  servicosPadrao?: string[];
  formasPagamento?: string[];
  ambientesPadrao?: string[];
  tema?: "moderno" | "brutalista" | "minimalista";
  fonteTamanho?: "pequeno" | "normal" | "grande";
  altoContraste?: boolean;
}

class PintorDB extends Dexie {
  clientes!: Table<Cliente, number>;
  fornecedores!: Table<Fornecedor, number>;
  orcamentos!: Table<Orcamento, number>;
  fotos!: Table<Foto, string>;
  eventos!: Table<EventoAgenda, number>;
  recibos!: Table<Recibo, number>;
  config!: Table<ConfigEmpresa, number>;

  constructor() {
    super("pintor_plus");
    this.version(2).stores({
      clientes: "++id, nome, telefone, criadoEm",
      fornecedores: "++id, nome, categoria, criadoEm",
      orcamentos: "++id, clienteId, status, criadoEm, atualizadoEm, [status+atualizadoEm]",
      fotos: "id, criadoEm",
      eventos: "++id, data, orcamentoId, criadoEm",
      recibos: "++id, orcamentoId, criadoEm",
      config: "id",
    });
  }
}

export const db = new PintorDB();

export const SERVICOS_PADRAO = [
  "Lixar",
  "Massa corrida",
  "Massa acrílica",
  "Selador",
  "Primer",
  "1ª demão",
  "2ª demão",
  "3ª demão",
  "Textura",
  "Verniz",
  "Esmalte",
  "Grafiato",
];

export const AMBIENTES_PADRAO = [
  "Sala",
  "Quarto",
  "Cozinha",
  "Banheiro",
  "Fachada",
  "Muro",
  "Teto",
  "Área externa",
  "Garagem",
  "Escada",
];

export const FORMAS_PAGAMENTO = [
  "À vista",
  "PIX",
  "Dinheiro",
  "Cartão",
  "50% início + 50% final",
  "Parcelado",
];

export const STATUS_LABELS: Record<StatusOrcamento, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export const STATUS_COLORS: Record<StatusOrcamento, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviado: "bg-info text-ink",
  aprovado: "bg-success text-ink",
  em_andamento: "bg-warning text-ink",
  finalizado: "bg-brand text-ink",
  cancelado: "bg-destructive text-white",
};

export function calcularTotal(o: Orcamento): number {
  if (typeof o.totalManual === "number") return o.totalManual;
  const base = o.ambientes.reduce(
    (acc, amb) => acc + amb.itens.reduce((a, i) => a + (i.preco || 0), 0),
    0,
  );
  const adicional = o.precoAdicionalM2
    ? o.ambientes.reduce(
        (acc, amb) =>
          acc +
          amb.itens.reduce(
            (a, i) => a + (i.altura && i.comprimento ? i.altura * i.comprimento : 0),
            0,
          ),
        0,
      ) * o.precoAdicionalM2
    : 0;
  return base + adicional;
}

export function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
