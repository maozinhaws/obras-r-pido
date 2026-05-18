import {
  db,
  type HistoricoOrcamentoEntry,
  type Orcamento,
  type StatusOrcamento,
} from "@/lib/db";
import { uid } from "@/lib/utils";

function diffField(label: string, before?: string | number, after?: string | number) {
  const prev = before == null || before === "" ? "—" : String(before);
  const next = after == null || after === "" ? "—" : String(after);
  if (prev === next) return null;
  return `Alterado ${label} de "${prev}" para "${next}"`;
}

function itemsById(orc: Orcamento) {
  return new Map(
    orc.ambientes.flatMap((amb) => amb.itens.map((item) => [item.id, { amb, item }] as const)),
  );
}

export function buildHistoricoEntries(prev: Orcamento | undefined, next: Orcamento): HistoricoOrcamentoEntry[] {
  if (!prev) {
    return [
      {
        id: uid(),
        timestamp: Date.now(),
        descricao: "Orçamento criado",
      },
    ];
  }

  const changes: HistoricoOrcamentoEntry[] = [];
  const push = (descricao: string | null) => {
    if (!descricao) return;
    changes.push({ id: uid(), timestamp: Date.now(), descricao });
  };

  push(diffField("cliente", prev.clienteSnapshot?.nome, next.clienteSnapshot?.nome));
  push(diffField("forma de pagamento", prev.formaPagamento, next.formaPagamento));
  push(diffField("data prevista de início", prev.inicio, next.inicio));
  push(diffField("validade", prev.validade, next.validade));
  push(diffField("tipo de serviço", prev.tipoServico, next.tipoServico));
  push(diffField("formato da mensagem", prev.formatoMensagem, next.formatoMensagem));
  push(diffField("observações", prev.observacoes, next.observacoes));
  push(diffField("status", prev.status, next.status));

  const prevAmbientes = new Map(prev.ambientes.map((amb) => [amb.id, amb] as const));
  const nextAmbientes = new Map(next.ambientes.map((amb) => [amb.id, amb] as const));

  for (const amb of next.ambientes) {
    const old = prevAmbientes.get(amb.id);
    if (!old) push(`Adicionado ambiente "${amb.nome}"`);
    else push(diffField("nome do ambiente", old.nome, amb.nome));
  }

  for (const amb of prev.ambientes) {
    if (!nextAmbientes.has(amb.id)) push(`Removido ambiente "${amb.nome}"`);
  }

  const prevItems = itemsById(prev);
  const nextItems = itemsById(next);

  for (const [id, nextRef] of nextItems) {
    const prevRef = prevItems.get(id);
    if (!prevRef) {
      push(`Adicionado item "${nextRef.item.nome}" em "${nextRef.amb.nome}"`);
      continue;
    }
    push(diffField("Nome do item", prevRef.item.nome, nextRef.item.nome));
    push(diffField("Observações", prevRef.item.observacao, nextRef.item.observacao));
    push(diffField("preço do item", prevRef.item.preco, nextRef.item.preco));
    push(diffField("altura do item", prevRef.item.altura, nextRef.item.altura));
    push(diffField("comprimento do item", prevRef.item.comprimento, nextRef.item.comprimento));
    const prevServ = prevRef.item.servicos.join(", ");
    const nextServ = nextRef.item.servicos.join(", ");
    push(diffField("serviços do item", prevServ, nextServ));
  }

  for (const [, prevRef] of prevItems) {
    if (!nextItems.has(prevRef.item.id)) {
      push(`Removido item "${prevRef.item.nome}" de "${prevRef.amb.nome}"`);
    }
  }

  return changes;
}

export async function persistOrcamento(next: Orcamento, options?: { forceLog?: string }) {
  const previous = next.id ? await db.orcamentos.get(next.id) : undefined;
  const historico = [...(previous?.historico ?? next.historico ?? [])];
  const changes = buildHistoricoEntries(previous, next);

  if (options?.forceLog) {
    changes.push({ id: uid(), timestamp: Date.now(), descricao: options.forceLog });
  }

  const merged = {
    ...next,
    atualizadoEm: Date.now(),
    historico: [...historico, ...changes],
  } satisfies Orcamento;

  const id = await db.orcamentos.put(merged);
  return { ...merged, id: id as number };
}

export async function updateStatusWithLog(id: number, status: StatusOrcamento) {
  const existing = await db.orcamentos.get(id);
  if (!existing) return null;
  return persistOrcamento({ ...existing, status }, { forceLog: `Status alterado para "${status}"` });
}