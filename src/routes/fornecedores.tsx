import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Fornecedor } from "@/lib/db";
import { PageHeader } from "@/components/app-shell";
import { whatsappLink } from "@/lib/utils";
import { Plus, Search, Edit3, Trash2, MessageCircle, X } from "lucide-react";
import { Field } from "./clientes";

export const Route = createFileRoute("/fornecedores")({
  head: () => ({
    meta: [
      { title: "Fornecedores — Pintor Plus" },
      { name: "description", content: "Parceiros e fornecedores do pintor." },
    ],
  }),
  component: FornecedoresPage,
});

function FornecedoresPage() {
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  const fornecedores = useLiveQuery(
    () => db.fornecedores.orderBy("nome").toArray(),
    [],
    [],
  );
  const filtrados = (fornecedores ?? []).filter(
    (f) =>
      !busca ||
      f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (f.categoria ?? "").toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        eyebrow={`Rede · ${fornecedores?.length ?? 0} parceiros`}
        title="Fornecedores"
        actions={
          <button
            onClick={() => setCriando(true)}
            className="glass-brand text-white glass-press px-5 py-2.5 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          >
            <Plus className="size-4" strokeWidth={3} /> Novo
          </button>
        }
      />
      <div className="px-5 lg:px-10 py-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/40" />
          <input
            type="search"
            placeholder="Buscar por nome ou categoria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm placeholder:text-foreground/30 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
          />
        </div>

        {filtrados.length === 0 ? (
          <div className="brutal-border-thin border-dashed border-foreground/20 p-12 text-center">
            <p className="text-foreground/50 text-sm font-bold uppercase tracking-widest">
              {busca ? "Nada encontrado" : "Nenhum fornecedor"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtrados.map((f) => (
              <div key={f.id} className="glass p-5 flex flex-col gap-3 group">
                <div>
                  <p className="font-black uppercase text-sm truncate">{f.nome}</p>
                  {f.categoria && (
                    <span className="inline-block text-[10px] font-black uppercase tracking-widest text-brand mt-1">
                      · {f.categoria}
                    </span>
                  )}
                </div>
                {f.telefone && <p className="text-xs text-foreground/70">{f.telefone}</p>}
                {f.observacao && (
                  <p className="text-xs text-foreground/50 line-clamp-2">{f.observacao}</p>
                )}
                <div className="flex gap-2 pt-3 mt-auto border-t border-white/5">
                  {f.telefone && (
                    <a
                      href={whatsappLink(
                        f.telefone,
                        `Olá ${f.nome}, gostaria de uma cotação.`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 glass-brand text-white glass-press px-3 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle className="size-3" /> Cotar
                    </a>
                  )}
                  <button
                    onClick={() => setEditando(f)}
                    className="glass glass-press px-3 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5"
                    aria-label="Editar"
                  >
                    <Edit3 className="size-3" />
                  </button>
                  <button
                    onClick={() => confirm(`Excluir ${f.nome}?`) && db.fornecedores.delete(f.id!)}
                    className="glass glass-press border-destructive/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-destructive"
                    aria-label="Excluir"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(criando || editando) && (
        <FornecedorForm
          fornecedor={editando ?? undefined}
          onClose={() => {
            setCriando(false);
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

function FornecedorForm({
  fornecedor,
  onClose,
}: {
  fornecedor?: Fornecedor;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Fornecedor>(
    fornecedor ?? { nome: "", criadoEm: Date.now() },
  );
  async function salvar() {
    if (!form.nome.trim()) return;
    if (form.id) await db.fornecedores.update(form.id, form);
    else await db.fornecedores.add({ ...form, criadoEm: Date.now() });
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/60  flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
      <div className="glass-strong w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="glass-strong rounded-none border-x-0 border-t-0 p-5 flex items-center justify-between sticky top-0 z-10">
          <h3 className="text-display text-lg">
            {fornecedor ? "Editar" : "Novo"} Fornecedor
          </h3>
          <button onClick={onClose} className="text-brand" aria-label="Fechar">
            <X className="size-6" strokeWidth={3} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Nome *">
            <input
              autoFocus
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone">
              <input
                value={form.telefone ?? ""}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                inputMode="tel"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
              />
            </Field>
            <Field label="Categoria">
              <input
                value={form.categoria ?? ""}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Ex: Tinta, Andaime"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
              />
            </Field>
          </div>
          <Field label="Observação">
            <textarea
              value={form.observacao ?? ""}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all resize-none"
            />
          </Field>
        </div>
        <div className="p-6 flex gap-3 border-t border-white/10 sticky bottom-0 glass-strong">
          <button
            onClick={onClose}
            className="flex-1 brutal-border-thin px-4 py-3 text-xs font-black uppercase tracking-widest brutal-press"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            className="flex-[2] bg-brand text-ink brutal-border-thin brutal-shadow-sm brutal-press px-4 py-3 text-xs font-black uppercase tracking-widest"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
