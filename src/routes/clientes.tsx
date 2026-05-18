import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Cliente } from "@/lib/db";
import { PageHeader } from "@/components/app-shell";
import { Plus, Search, Edit3, Trash2, Phone, MapPin, X } from "lucide-react";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — Pintor Plus" },
      { name: "description", content: "Cadastro e gerenciamento de clientes do pintor." },
    ],
  }),
  component: ClientesPage,
});

function ClientesPage() {
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [criando, setCriando] = useState(false);

  const clientes = useLiveQuery(
    () => db.clientes.orderBy("nome").toArray(),
    [],
    [],
  );

  const filtrados = (clientes ?? []).filter(
    (c) =>
      !busca ||
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.telefone ?? "").includes(busca),
  );

  return (
    <div>
      <PageHeader
        eyebrow={`Base · ${clientes?.length ?? 0} contatos`}
        title="Clientes"
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
            placeholder="Buscar por nome ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-sm placeholder:text-foreground/30 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
          />
        </div>

        {filtrados.length === 0 ? (
          <div className="brutal-border-thin border-dashed border-foreground/20 p-12 text-center">
            <p className="text-foreground/50 text-sm font-bold uppercase tracking-widest mb-4">
              {busca ? "Nada encontrado" : "Nenhum cliente cadastrado"}
            </p>
            {!busca && (
              <button
                onClick={() => setCriando(true)}
                className="bg-brand text-ink brutal-border-thin brutal-shadow-sm brutal-press px-4 py-2 text-xs font-black uppercase tracking-widest"
              >
                Cadastrar primeiro
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtrados.map((c) => (
              <div
                key={c.id}
                className="glass p-5 flex flex-col gap-3 group"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-black uppercase text-sm truncate">{c.nome}</p>
                    {c.apelido && (
                      <p className="text-mono text-[10px] text-foreground/40 uppercase">
                        {c.apelido}
                      </p>
                    )}
                  </div>
                </div>
                {c.telefone && (
                  <div className="flex items-center gap-2 text-xs text-foreground/70">
                    <Phone className="size-3" /> {c.telefone}
                  </div>
                )}
                {c.endereco && (
                  <div className="flex items-start gap-2 text-xs text-foreground/70">
                    <MapPin className="size-3 mt-0.5 shrink-0" /> {c.endereco}
                  </div>
                )}
                <div className="flex gap-2 pt-3 mt-auto border-t border-white/5">
                  <button
                    onClick={() => setEditando(c)}
                    className="flex-1 brutal-border-thin px-3 py-1.5 text-[10px] font-black uppercase tracking-widest brutal-press flex items-center justify-center gap-1"
                  >
                    <Edit3 className="size-3" /> Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir ${c.nome}?`)) db.clientes.delete(c.id!);
                    }}
                    className="brutal-border-thin px-3 py-1.5 text-[10px] font-black uppercase tracking-widest brutal-press text-destructive"
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
        <ClienteForm
          cliente={editando ?? undefined}
          onClose={() => {
            setCriando(false);
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

function ClienteForm({
  cliente,
  onClose,
}: {
  cliente?: Cliente;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Cliente>(
    cliente ?? {
      nome: "",
      criadoEm: Date.now(),
    },
  );

  async function salvar() {
    if (!form.nome.trim()) return;
    if (form.id) {
      await db.clientes.update(form.id, form);
    } else {
      await db.clientes.add({ ...form, criadoEm: Date.now() });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60  flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
      <div className="glass-strong w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="bg-ink p-4 flex items-center justify-between sticky top-0 z-10">
          <h3 className="text-display text-lg">
            {cliente ? "Editar Cliente" : "Novo Cliente"}
          </h3>
          <button onClick={onClose} aria-label="Fechar" className="text-brand">
            <X className="size-6" strokeWidth={3} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Nome *">
            <input
              autoFocus
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
            />
          </Field>
          <Field label="Apelido">
            <input
              value={form.apelido ?? ""}
              onChange={(e) => setForm({ ...form, apelido: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone">
              <input
                value={form.telefone ?? ""}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                inputMode="tel"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
              />
            </Field>
            <Field label="CPF/CNPJ">
              <input
                value={form.documento ?? ""}
                onChange={(e) => setForm({ ...form, documento: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
              />
            </Field>
          </div>
          <Field label="E-mail">
            <input
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              type="email"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
            />
          </Field>
          <Field label="Endereço">
            <textarea
              value={form.endereco ?? ""}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand focus:bg-white/10 transition-all resize-none"
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
            disabled={!form.nome.trim()}
            className="flex-[2] bg-brand text-ink brutal-border-thin brutal-shadow-sm brutal-press px-4 py-3 text-xs font-black uppercase tracking-widest disabled:opacity-40"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-black uppercase tracking-widest text-foreground/60 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
