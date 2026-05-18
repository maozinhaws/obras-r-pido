import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  type Orcamento,
  type Ambiente,
  type ItemAmbiente,
  type Cliente,
  AMBIENTES_PADRAO,
  SERVICOS_PADRAO,
  FORMAS_PAGAMENTO,
  formatBRL,
  calcularTotal,
} from "@/lib/db";
import { PageHeader } from "@/components/app-shell";
import { Field } from "./clientes";
import { uid } from "@/lib/utils";
import { salvarFoto, urlFoto, removerFoto } from "@/lib/fotos";
import {
  Plus,
  X,
  Camera,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  FileText,
  MessageCircle,
} from "lucide-react";
import { gerarPdfOrcamento, gerarMensagemWhatsapp, baixarBlob } from "@/lib/pdf";
import { whatsappLink } from "@/lib/utils";
import { CameraModal } from "@/components/camera-modal";
import { PhotoEditor } from "@/components/photo-editor";

type SearchParams = { modo?: "flash" | "foto" | "detalhado"; editId?: number };

export const Route = createFileRoute("/orcamentos/novo")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    modo: (s.modo as SearchParams["modo"]) ?? "detalhado",
    editId: s.editId ? Number(s.editId) : undefined,
  }),
  head: () => ({
    meta: [{ title: "Novo orçamento — Pintor Plus" }],
  }),
  component: NovoOrcamento,
});

const PASSOS = ["Cliente", "Ambientes", "Pagamento", "Revisão"] as const;

function NovoOrcamento() {
  const nav = useNavigate();
  const { editId, modo } = Route.useSearch();
  const [passo, setPasso] = useState(0);
  const [carregado, setCarregado] = useState(!editId);
  const [orc, setOrc] = useState<Orcamento>({
    ambientes: [],
    status: "rascunho",
    criadoEm: Date.now(),
    atualizadoEm: Date.now(),
  });

  // Carrega orçamento existente para edição
  useEffect(() => {
    if (!editId) return;
    db.orcamentos.get(editId).then((o) => {
      if (o) setOrc(o);
      setCarregado(true);
    });
  }, [editId]);

  // autosave
  useEffect(() => {
    if (!carregado) return;
    const t = setTimeout(async () => {
      const id = await db.orcamentos.put({ ...orc, atualizadoEm: Date.now() });
      if (!orc.id) setOrc((p) => ({ ...p, id: id as number }));
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(orc), carregado]);

  return (
    <div>
      <PageHeader
        eyebrow={`Passo ${passo + 1} de ${PASSOS.length}`}
        title={PASSOS[passo]}
        actions={
          <button
            onClick={() => {
              if (confirm("Sair? O rascunho fica salvo.")) nav({ to: "/orcamentos" });
            }}
            className="brutal-border-thin px-3 py-2 text-[10px] font-black uppercase tracking-widest brutal-press"
          >
            <X className="size-4" />
          </button>
        }
      />

      {/* Stepper */}
      <div className="px-5 lg:px-10 py-4 grid grid-cols-4 gap-2">
        {PASSOS.map((p, i) => (
          <div
            key={p}
            className={`h-2.5 rounded-full transition-all duration-500 ${i <= passo ? "glass-brand" : "bg-white/5 border border-white/10"}`}
          />
        ))}
      </div>

      <div className="px-5 lg:px-10 pb-32">
        {passo === 0 && <PassoCliente orc={orc} setOrc={setOrc} />}
        {passo === 1 &&
          (modo === "foto" ? (
            <PassoAmbientesFoto orc={orc} setOrc={setOrc} />
          ) : (
            <PassoAmbientes orc={orc} setOrc={setOrc} />
          ))}
        {passo === 2 && <PassoPagamento orc={orc} setOrc={setOrc} />}
        {passo === 3 && <PassoRevisao orc={orc} setOrc={setOrc} />}
      </div>

      {/* Footer nav */}
      <div className="fixed bottom-0 left-0 right-0 md:left-20 lg:left-64 glass-strong rounded-none border-t border-white/10 p-4 flex gap-3 z-30 safe-area-bottom">
        <button
          onClick={() => (passo === 0 ? nav({ to: "/orcamentos" }) : setPasso(passo - 1))}
          className="glass-press glass px-5 py-3.5 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
        >
          <ChevronLeft className="size-4" /> Voltar
        </button>
        <div className="flex-1" />
        {passo < PASSOS.length - 1 ? (
          <button
            onClick={() => setPasso(passo + 1)}
            className="glass-brand glass-press px-6 py-3.5 text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-white"
          >
            Próximo <ChevronRight className="size-4" />
          </button>
        ) : (
          <button
            onClick={async () => {
              await db.orcamentos.update(orc.id!, {
                ...orc,
                status: orc.status === "rascunho" ? "enviado" : orc.status,
                atualizadoEm: Date.now(),
              });
              nav({ to: "/orcamentos/$id", params: { id: String(orc.id) } });
            }}
            className="bg-success text-ink brutal-border-thin brutal-shadow-sm brutal-press px-5 py-3 text-xs font-black uppercase tracking-widest flex items-center gap-1"
          >
            <Check className="size-4" /> Finalizar
          </button>
        )}
      </div>
    </div>
  );
}

function PassoCliente({
  orc,
  setOrc,
}: {
  orc: Orcamento;
  setOrc: React.Dispatch<React.SetStateAction<Orcamento>>;
}) {
  const clientes = useLiveQuery(() => db.clientes.orderBy("nome").toArray(), [], []);
  const [novo, setNovo] = useState<Cliente>({ nome: "", criadoEm: Date.now() });

  async function salvarENovo() {
    if (!novo.nome.trim()) return;
    const id = (await db.clientes.add({ ...novo, criadoEm: Date.now() })) as number;
    const c = await db.clientes.get(id);
    if (c) {
      setOrc({ ...orc, clienteId: id, clienteSnapshot: c });
      setNovo({ nome: "", criadoEm: Date.now() });
    }
  }

  return (
    <div className="space-y-6 py-6">
      {orc.clienteSnapshot && (
        <div className="glass-brand text-white p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase opacity-60">Cliente selecionado</p>
            <p className="text-display text-xl">{orc.clienteSnapshot.nome}</p>
          </div>
          <button
            onClick={() =>
              setOrc({ ...orc, clienteId: undefined, clienteSnapshot: undefined })
            }
            className="brutal-border-thin px-3 py-2 brutal-press"
          >
            Trocar
          </button>
        </div>
      )}

      {!orc.clienteSnapshot && (
        <>
          <div className="glass p-6 space-y-4">
            <div className="text-mono text-[10px] uppercase tracking-widest text-brand">
              {"> Cadastrar novo"}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Nome *">
                <input
                  value={novo.nome}
                  onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
                  className="w-full bg-midnight brutal-border-thin px-3 py-3 focus:outline-none focus:border-brand"
                />
              </Field>
              <Field label="Telefone">
                <input
                  value={novo.telefone ?? ""}
                  onChange={(e) => setNovo({ ...novo, telefone: e.target.value })}
                  inputMode="tel"
                  className="w-full bg-midnight brutal-border-thin px-3 py-3 focus:outline-none focus:border-brand"
                />
              </Field>
            </div>
            <Field label="Endereço">
              <input
                value={novo.endereco ?? ""}
                onChange={(e) => setNovo({ ...novo, endereco: e.target.value })}
                className="w-full bg-midnight brutal-border-thin px-3 py-3 focus:outline-none focus:border-brand"
              />
            </Field>
            <button
              onClick={salvarENovo}
              disabled={!novo.nome.trim()}
              className="bg-brand text-ink brutal-border-thin brutal-shadow-sm brutal-press px-4 py-3 text-xs font-black uppercase tracking-widest disabled:opacity-40"
            >
              Salvar e usar
            </button>
          </div>

          {(clientes ?? []).length > 0 && (
            <div>
              <div className="text-mono text-[10px] uppercase tracking-widest text-foreground/40 mb-3">
                {"> Ou escolha um existente"}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(clientes ?? []).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setOrc({ ...orc, clienteId: c.id, clienteSnapshot: c })}
                    className="bg-surface brutal-border-thin p-3 text-left brutal-press"
                  >
                    <p className="font-black uppercase text-sm">{c.nome}</p>
                    {c.telefone && (
                      <p className="text-xs text-foreground/50">{c.telefone}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Pagador diferente */}
      {orc.clienteSnapshot && (
        <div className="glass p-6 space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-mono text-[10px] uppercase tracking-widest text-brand">
                {"> Pagador diferente?"}
              </div>
              <p className="text-xs text-foreground/60 mt-1">
                Quem vai pagar não é o cliente
              </p>
            </div>
            <input
              type="checkbox"
              checked={orc.pagadorDiferente ?? false}
              onChange={(e) => setOrc({ ...orc, pagadorDiferente: e.target.checked })}
              className="size-5 accent-brand"
            />
          </label>
          {orc.pagadorDiferente && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <Field label="Nome do pagador">
                <input
                  value={orc.pagadorNome ?? ""}
                  onChange={(e) => setOrc({ ...orc, pagadorNome: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
                />
              </Field>
              <Field label="Telefone">
                <input
                  value={orc.pagadorTelefone ?? ""}
                  onChange={(e) => setOrc({ ...orc, pagadorTelefone: e.target.value })}
                  inputMode="tel"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Endereço do pagador">
                  <input
                    value={orc.pagadorEndereco ?? ""}
                    onChange={(e) => setOrc({ ...orc, pagadorEndereco: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
                  />
                </Field>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PassoAmbientes({
  orc,
  setOrc,
}: {
  orc: Orcamento;
  setOrc: React.Dispatch<React.SetStateAction<Orcamento>>;
}) {
  const [editandoAmb, setEditandoAmb] = useState<string | null>(null);

  function addAmbiente(nome: string) {
    const a: Ambiente = { id: uid(), nome, itens: [] };
    setOrc({ ...orc, ambientes: [...orc.ambientes, a] });
    setEditandoAmb(a.id);
  }

  function updateAmb(id: string, fn: (a: Ambiente) => Ambiente) {
    setOrc({
      ...orc,
      ambientes: orc.ambientes.map((a) => (a.id === id ? fn(a) : a)),
    });
  }

  function removeAmb(id: string) {
    setOrc({ ...orc, ambientes: orc.ambientes.filter((a) => a.id !== id) });
  }

  const ambEdit = orc.ambientes.find((a) => a.id === editandoAmb);

  return (
    <div className="space-y-4 py-6">
      <div className="text-mono text-[10px] uppercase tracking-widest text-foreground/40">
        {"> Adicionar ambiente"}
      </div>
      <div className="flex flex-wrap gap-2">
        {AMBIENTES_PADRAO.map((n) => (
          <button
            key={n}
            onClick={() => addAmbiente(n)}
            className="brutal-border-thin px-3 py-2 text-xs font-black uppercase tracking-widest brutal-press hover:bg-brand hover:text-ink"
          >
            + {n}
          </button>
        ))}
      </div>

      <div className="space-y-3 pt-4">
        {orc.ambientes.map((a) => (
          <div key={a.id} className="bg-surface brutal-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-display text-xl italic">{a.nome}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditandoAmb(a.id)}
                  className="brutal-border-thin px-3 py-1.5 text-[10px] font-black uppercase tracking-widest brutal-press"
                >
                  Itens ({a.itens.length})
                </button>
                <button
                  onClick={() => confirm("Remover ambiente?") && removeAmb(a.id)}
                  className="brutal-border-thin px-2 py-1.5 brutal-press text-destructive"
                  aria-label="Remover"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>
            {a.itens.length > 0 && (
              <div className="space-y-1 text-xs text-foreground/70">
                {a.itens.map((i) => (
                  <div key={i.id} className="flex justify-between">
                    <span>• {i.nome}</span>
                    <span>{formatBRL(i.preco || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {ambEdit && (
        <ItensModal
          ambiente={ambEdit}
          onSave={(items) => {
            updateAmb(ambEdit.id, (a) => ({ ...a, itens: items }));
            setEditandoAmb(null);
          }}
          onClose={() => setEditandoAmb(null)}
        />
      )}
    </div>
  );
}

function PassoAmbientesFoto({
  orc,
  setOrc,
}: {
  orc: Orcamento;
  setOrc: React.Dispatch<React.SetStateAction<Orcamento>>;
}) {
  const [ambienteAtivoId, setAmbienteAtivoId] = useState<string | null>(
    orc.ambientes[0]?.id ?? null,
  );
  const [cameraOpen, setCameraOpen] = useState(false);
  const [editandoItem, setEditandoItem] = useState<{ ambId: string; item: ItemAmbiente } | null>(
    null,
  );

  function criarAmbiente(nome: string) {
    const a: Ambiente = { id: uid(), nome, itens: [] };
    setOrc({ ...orc, ambientes: [...orc.ambientes, a] });
    setAmbienteAtivoId(a.id);
  }

  function removerAmbiente(id: string) {
    const novos = orc.ambientes.filter((a) => a.id !== id);
    setOrc({ ...orc, ambientes: novos });
    if (ambienteAtivoId === id) setAmbienteAtivoId(novos[0]?.id ?? null);
  }

  function adicionarFotosComoItens(fotoIds: string[]) {
    if (!ambienteAtivoId) return;
    setOrc({
      ...orc,
      ambientes: orc.ambientes.map((a) =>
        a.id === ambienteAtivoId
          ? {
              ...a,
              itens: [
                ...a.itens,
                ...fotoIds.map<ItemAmbiente>((fid) => ({
                  id: uid(),
                  nome: "Parede",
                  servicos: [],
                  preco: 0,
                  fotos: [fid],
                })),
              ],
            }
          : a,
      ),
    });
  }

  function atualizarItem(ambId: string, item: ItemAmbiente) {
    setOrc({
      ...orc,
      ambientes: orc.ambientes.map((a) =>
        a.id === ambId
          ? { ...a, itens: a.itens.map((i) => (i.id === item.id ? item : i)) }
          : a,
      ),
    });
  }

  function removerItem(ambId: string, itemId: string) {
    setOrc({
      ...orc,
      ambientes: orc.ambientes.map((a) =>
        a.id === ambId ? { ...a, itens: a.itens.filter((i) => i.id !== itemId) } : a,
      ),
    });
  }

  const ambienteAtivo = orc.ambientes.find((a) => a.id === ambienteAtivoId) ?? null;
  const itensPendentes = ambienteAtivo
    ? ambienteAtivo.itens.filter((i) => !i.preco).length
    : 0;

  return (
    <div className="space-y-5 py-6">
      {/* Ambientes existentes (tabs) */}
      {orc.ambientes.length > 0 && (
        <div>
          <div className="text-mono text-[10px] uppercase tracking-widest text-foreground/40 mb-2">
            {"> Ambiente ativo"}
          </div>
          <div className="flex flex-wrap gap-2">
            {orc.ambientes.map((a) => (
              <button
                key={a.id}
                onClick={() => setAmbienteAtivoId(a.id)}
                className={`brutal-border-thin px-3 py-2 text-xs font-black uppercase tracking-widest brutal-press ${
                  a.id === ambienteAtivoId ? "bg-brand text-ink" : "bg-surface"
                }`}
              >
                {a.nome} · {a.itens.length}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Adicionar ambiente */}
      <div>
        <div className="text-mono text-[10px] uppercase tracking-widest text-foreground/40 mb-2">
          {"> Adicionar ambiente"}
        </div>
        <div className="flex flex-wrap gap-2">
          {AMBIENTES_PADRAO.map((n) => (
            <button
              key={n}
              onClick={() => criarAmbiente(n)}
              className="brutal-border-thin px-3 py-1.5 text-[10px] font-black uppercase tracking-widest brutal-press hover:bg-brand hover:text-ink"
            >
              + {n}
            </button>
          ))}
        </div>
      </div>

      {/* CTA câmera */}
      {ambienteAtivo ? (
        <>
          <button
            onClick={() => setCameraOpen(true)}
            className="w-full glass-brand text-white p-6 flex flex-col items-center gap-2 glass-press"
          >
            <Camera className="size-10" strokeWidth={2.5} />
            <span className="text-display text-2xl">Tirar fotos</span>
            <span className="text-[10px] font-mono uppercase opacity-70">
              Cada foto vira um item em {ambienteAtivo.nome}
            </span>
          </button>

          {itensPendentes > 0 && (
            <div className="brutal-border-thin border-warning bg-warning/10 p-3 text-[11px] font-bold uppercase tracking-widest text-warning">
              {itensPendentes} item(ns) sem preço — toque pra preencher
            </div>
          )}

          {/* Lista de itens do ambiente ativo */}
          <div className="grid grid-cols-2 gap-3">
            {ambienteAtivo.itens.map((it) => (
              <button
                key={it.id}
                onClick={() => setEditandoItem({ ambId: ambienteAtivo.id, item: it })}
                className="relative bg-surface brutal-border-thin overflow-hidden text-left glass-press"
              >
                <div className="aspect-square bg-midnight">
                  {it.fotos[0] && <FotoCover id={it.fotos[0]} />}
                </div>
                <div className="p-2 space-y-0.5">
                  <p className="text-[10px] font-black uppercase truncate">{it.nome}</p>
                  <p
                    className={`text-display text-base ${it.preco ? "text-brand" : "text-foreground/40"}`}
                  >
                    {it.preco ? formatBRL(it.preco).replace(",00", "") : "—"}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => confirm("Remover ambiente?") && removerAmbiente(ambienteAtivo.id)}
              className="brutal-border-thin px-3 py-2 text-[10px] font-black uppercase tracking-widest text-destructive brutal-press"
            >
              <Trash2 className="size-3 inline mr-1" /> Remover {ambienteAtivo.nome}
            </button>
          </div>
        </>
      ) : (
        <div className="brutal-border-thin border-dashed p-10 text-center text-foreground/50 text-sm font-bold uppercase">
          Adicione um ambiente acima pra começar
        </div>
      )}

      {cameraOpen && (
        <CameraModal
          onClose={() => setCameraOpen(false)}
          onPhotosCaptured={adicionarFotosComoItens}
        />
      )}

      {editandoItem && (
        <div className="fixed inset-0 z-50 bg-black/70  flex flex-col animate-fade-in">
          <div className="glass-strong rounded-none border-x-0 border-t-0 p-5 flex items-center justify-between">
            <h3 className="text-display text-lg">
              Item · {orc.ambientes.find((a) => a.id === editandoItem.ambId)?.nome}
            </h3>
            <button
              onClick={() => setEditandoItem(null)}
              className="text-brand"
              aria-label="Fechar"
            >
              <X className="size-6" strokeWidth={3} />
            </button>
          </div>
          <ItemEditor
            item={editandoItem.item}
            onSave={(it) => {
              atualizarItem(editandoItem.ambId, it);
              setEditandoItem(null);
            }}
            onCancel={() => setEditandoItem(null)}
            onDelete={() => {
              removerItem(editandoItem.ambId, editandoItem.item.id);
              setEditandoItem(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

function FotoCover({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    urlFoto(id).then(setUrl);
  }, [id]);
  return url ? <img src={url} alt="" className="size-full object-cover" /> : null;
}

function ItensModal({
  ambiente,
  onSave,
  onClose,
}: {
  ambiente: Ambiente;
  onSave: (itens: ItemAmbiente[]) => void;
  onClose: () => void;
}) {
  const [itens, setItens] = useState<ItemAmbiente[]>(ambiente.itens);
  const [editing, setEditing] = useState<ItemAmbiente | null>(null);

  function novoItem() {
    setEditing({
      id: uid(),
      nome: "Parede",
      servicos: [],
      preco: 0,
      fotos: [],
    });
  }

  function salvar(it: ItemAmbiente) {
    setItens((prev) => {
      const i = prev.findIndex((x) => x.id === it.id);
      if (i === -1) return [...prev, it];
      const c = [...prev];
      c[i] = it;
      return c;
    });
    setEditing(null);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70  flex flex-col animate-fade-in">
      <div className="glass-strong rounded-none border-x-0 border-t-0 p-5 flex items-center justify-between">
        <h3 className="text-display text-lg">Itens · {ambiente.nome}</h3>
        <button onClick={onClose} className="text-brand" aria-label="Fechar">
          <X className="size-6" strokeWidth={3} />
        </button>
      </div>

      {!editing ? (
        <>
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {itens.length === 0 && (
              <div className="brutal-border-thin border-dashed p-8 text-center text-foreground/50 text-sm font-bold uppercase">
                Nenhum item ainda
              </div>
            )}
            {itens.map((it) => (
              <button
                key={it.id}
                onClick={() => setEditing(it)}
                className="w-full glass p-5 text-left glass-press group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-black uppercase">{it.nome}</p>
                    {it.altura && it.comprimento && (
                      <p className="text-mono text-[10px] text-foreground/40">
                        {it.altura}m × {it.comprimento}m ={" "}
                        {(it.altura * it.comprimento).toFixed(2)}m²
                      </p>
                    )}
                  </div>
                  <p className="text-display text-lg italic text-brand">
                    {formatBRL(it.preco || 0).replace(",00", "")}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="p-4 glass-strong rounded-none border-x-0 border-b-0 flex gap-3">
            <button
              onClick={novoItem}
              className="flex-1 glass-brand text-white glass-press px-4 py-3.5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Plus className="size-4" strokeWidth={3} /> Novo Item
            </button>
            <button
              onClick={() => onSave(itens)}
              className="flex-1 glass glass-brand border-white/40 text-white glass-press px-4 py-3.5 text-xs font-bold uppercase tracking-widest"
            >
              Concluir
            </button>
          </div>
        </>
      ) : (
        <ItemEditor
          item={editing}
          onSave={salvar}
          onCancel={() => setEditing(null)}
          onDelete={() => {
            setItens((p) => p.filter((x) => x.id !== editing.id));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

const NOMES_ITEM = ["Parede", "Teto", "Porta", "Janela", "Rodapé", "Sanca", "Pilar", "Muro"];

function ItemEditor({
  item,
  onSave,
  onCancel,
  onDelete,
}: {
  item: ItemAmbiente;
  onSave: (i: ItemAmbiente) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [it, setIt] = useState<ItemAmbiente>(item);
  const [cameraOpen, setCameraOpen] = useState(false);

  async function addFoto(file: File) {
    const id = await salvarFoto(file);
    setIt({ ...it, fotos: [...it.fotos, id] });
  }

  function toggleServico(s: string) {
    setIt({
      ...it,
      servicos: it.servicos.includes(s)
        ? it.servicos.filter((x) => x !== s)
        : [...it.servicos, s],
    });
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-foreground/60 mb-2">
            Nome do item
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {NOMES_ITEM.map((n) => (
              <button
                key={n}
                onClick={() => setIt({ ...it, nome: n })}
                className={`brutal-border-thin px-3 py-1.5 text-[10px] font-black uppercase brutal-press ${
                  it.nome === n ? "bg-brand text-ink" : "bg-surface"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <input
            value={it.nome}
            onChange={(e) => setIt({ ...it, nome: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Altura (m)">
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={it.altura ?? ""}
              onChange={(e) =>
                setIt({ ...it, altura: e.target.value ? parseFloat(e.target.value) : undefined })
              }
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
            />
          </Field>
          <Field label="Comprimento (m)">
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={it.comprimento ?? ""}
              onChange={(e) =>
                setIt({
                  ...it,
                  comprimento: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
            />
          </Field>
        </div>

        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-foreground/60 mb-2">
            Serviços
          </div>
          <div className="flex flex-wrap gap-2">
            {SERVICOS_PADRAO.map((s) => (
              <button
                key={s}
                onClick={() => toggleServico(s)}
                className={`brutal-border-thin px-3 py-1.5 text-[10px] font-black uppercase brutal-press ${
                  it.servicos.includes(s) ? "bg-brand text-ink" : "bg-surface"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <Field label="Preço (R$)">
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={it.preco || ""}
            onChange={(e) => setIt({ ...it, preco: parseFloat(e.target.value) || 0 })}
            className="w-full bg-midnight brutal-border-thin px-3 py-3 text-display text-2xl focus:outline-none focus:border-brand"
          />
        </Field>

        <Field label="Observação">
          <textarea
            rows={2}
            value={it.observacao ?? ""}
            onChange={(e) => setIt({ ...it, observacao: e.target.value })}
            className="w-full bg-midnight brutal-border-thin px-3 py-3 focus:outline-none focus:border-brand resize-none"
          />
        </Field>

        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-foreground/60 mb-2">
            Fotos ({it.fotos.length})
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {it.fotos.map((fid) => (
              <FotoThumb
                key={fid}
                id={fid}
                onRemove={() => {
                  removerFoto(fid);
                  setIt({ ...it, fotos: it.fotos.filter((x) => x !== fid) });
                }}
                onReplace={(newId) => {
                  setIt({ ...it, fotos: it.fotos.map((x) => (x === fid ? newId : x)) });
                }}
              />
            ))}
            <button 
              onClick={() => setCameraOpen(true)}
              className="aspect-square glass-brand text-white grid place-items-center glass-press"
            >
              <Camera className="size-8" strokeWidth={2.5} />
              <span className="text-[9px] font-black uppercase">Câmera</span>
            </button>
          </div>
        </div>

        {cameraOpen && (
          <CameraModal
            onClose={() => setCameraOpen(false)}
            onPhotosCaptured={(ids) => {
              setIt({ ...it, fotos: [...it.fotos, ...ids] });
            }}
          />
        )}
      </div>

      <div className="p-3 border-t-4 border-ink flex gap-2">
        <button
          onClick={onDelete}
          className="brutal-border-thin px-3 py-3 brutal-press text-destructive"
          aria-label="Excluir item"
        >
          <Trash2 className="size-4" />
        </button>
        <button
          onClick={onCancel}
          className="flex-1 brutal-border-thin px-4 py-3 text-xs font-black uppercase tracking-widest brutal-press"
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave(it)}
          className="flex-[2] bg-brand text-ink brutal-border-thin brutal-shadow-sm brutal-press px-4 py-3 text-xs font-black uppercase tracking-widest"
        >
          Salvar Item
        </button>
      </div>
    </>
  );
}

function FotoThumb({
  id,
  onRemove,
  onReplace,
}: {
  id: string;
  onRemove: () => void;
  onReplace?: (newId: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    urlFoto(id).then(setUrl);
  }, [id]);
  return (
    <div className="relative aspect-square bg-midnight brutal-border-thin overflow-hidden">
      {url && <img src={url} alt="Foto" className="size-full object-cover" />}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 bg-destructive text-white p-1 brutal-border-thin"
        aria-label="Remover foto"
      >
        <X className="size-3" strokeWidth={3} />
      </button>
      {onReplace && (
        <button
          onClick={() => setEditing(true)}
          className="absolute bottom-1 right-1 bg-brand text-ink px-1.5 py-0.5 brutal-border-thin text-[9px] font-black uppercase"
          aria-label="Editar foto"
        >
          Editar
        </button>
      )}
      {editing && onReplace && (
        <PhotoEditor
          photoId={id}
          onClose={() => setEditing(false)}
          onSave={(newId) => {
            onReplace(newId);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function PassoPagamento({
  orc,
  setOrc,
}: {
  orc: Orcamento;
  setOrc: React.Dispatch<React.SetStateAction<Orcamento>>;
}) {
  return (
    <div className="space-y-4 py-6 max-w-2xl">
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-foreground/60 mb-2">
          Forma de pagamento
        </div>
        <div className="flex flex-wrap gap-2">
          {FORMAS_PAGAMENTO.map((f) => (
            <button
              key={f}
              onClick={() => setOrc({ ...orc, formaPagamento: f })}
              className={`brutal-border-thin px-3 py-2 text-xs font-black uppercase tracking-widest brutal-press ${
                orc.formaPagamento === f ? "bg-brand text-ink" : "bg-surface"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Validade">
          <input
            type="date"
            value={orc.validade ?? ""}
            onChange={(e) => setOrc({ ...orc, validade: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
          />
        </Field>
        <Field label="Início">
          <input
            type="date"
            value={orc.inicio ?? ""}
            onChange={(e) => setOrc({ ...orc, inicio: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
          />
        </Field>
      </div>

      <Field label="Tipo de serviço">
        <input
          value={orc.tipoServico ?? ""}
          onChange={(e) => setOrc({ ...orc, tipoServico: e.target.value })}
          placeholder="Ex: Pintura interna"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
        />
      </Field>

      <Field label="Preço adicional por m² (R$)">
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={orc.precoAdicionalM2 ?? ""}
          onChange={(e) =>
            setOrc({
              ...orc,
              precoAdicionalM2: e.target.value ? parseFloat(e.target.value) : undefined,
            })
          }
          placeholder="Aplicado sobre o total de m² de todos os itens"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
        />
      </Field>

      <Field label="Observações">
        <textarea
          rows={4}
          value={orc.observacoes ?? ""}
          onChange={(e) => setOrc({ ...orc, observacoes: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all resize-none"
        />
      </Field>
    </div>
  );
}

function PassoRevisao({
  orc,
  setOrc,
}: {
  orc: Orcamento;
  setOrc: React.Dispatch<React.SetStateAction<Orcamento>>;
}) {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    gerarMensagemWhatsapp(orc).then(setMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const total = calcularTotal(orc);
  return (
    <div className="space-y-4 py-6 max-w-3xl">
      <div className="glass-brand text-white p-8 text-center group overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        <div className="text-mono text-[10px] uppercase opacity-60 mb-1 relative z-10">Total Estimado</div>
        <div className="text-display text-5xl lg:text-7xl italic leading-none relative z-10">
          {formatBRL(total)}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="glass p-5">
          <div className="text-mono text-[10px] uppercase text-brand mb-2">{"> Cliente"}</div>
          <p className="font-black uppercase">{orc.clienteSnapshot?.nome ?? "—"}</p>
          <p className="text-xs text-foreground/60">{orc.clienteSnapshot?.telefone}</p>
        </div>
        <div className="glass p-5">
          <div className="text-mono text-[10px] uppercase text-brand mb-2">{"> Pagamento"}</div>
          <p className="font-black uppercase text-sm">{orc.formaPagamento ?? "—"}</p>
          <p className="text-xs text-foreground/60">
            {orc.ambientes.length} ambiente(s),{" "}
            {orc.ambientes.reduce((a, x) => a + x.itens.length, 0)} item(s)
          </p>
        </div>
      </div>

      <div className="glass p-5">
        <div className="text-mono text-[10px] uppercase text-brand mb-2">{"> Mensagem WhatsApp"}</div>
        <pre className="whitespace-pre-wrap text-xs text-foreground/80 font-sans">{msg}</pre>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={async () => {
            const blob = await gerarPdfOrcamento(orc);
            baixarBlob(blob, `orcamento-${orc.id ?? "novo"}.pdf`);
          }}
          className="glass glass-press px-6 py-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
        >
          <FileText className="size-4" /> Gerar PDF
        </button>
        {orc.clienteSnapshot?.telefone && (
          <a
            href={whatsappLink(orc.clienteSnapshot.telefone, msg)}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOrc({ ...orc, status: "enviado" })}
            className="glass-brand glass-press px-6 py-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-white"
          >
            <MessageCircle className="size-4" /> Enviar WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
