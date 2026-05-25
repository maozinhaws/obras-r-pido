import { useEffect, useState } from "react";
import { X, Camera, Trash2 } from "lucide-react";
import { type ItemAmbiente, MATERIAIS_PADRAO, SERVICOS_PADRAO } from "@/lib/db";
import { Field } from "@/routes/clientes";
import { salvarFoto, urlFoto, removerFoto } from "@/lib/fotos";
import { CameraModal } from "@/components/camera-modal";
import { PhotoEditor } from "@/components/photo-editor";

const NOMES_ITEM = ["Parede", "Teto", "Porta", "Janela", "Rodapé", "Sanca", "Pilar", "Muro"];

export type ItemEditorMode = "flash" | "detalhado";

/** Trava scroll do body e desabilita interações de fundo enquanto montado. */
function useBodyLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.classList.add("modal-open");
    return () => root.classList.remove("modal-open");
  }, [active]);
}

export function ItemEditorModal({
  open,
  item,
  mode = "detalhado",
  title,
  onSave,
  onCancel,
  onDelete,
}: {
  open: boolean;
  item: ItemAmbiente | null;
  mode?: ItemEditorMode;
  title?: string;
  onSave: (it: ItemAmbiente) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  useBodyLock(open && !!item);
  if (!open || !item) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(8,4,24,0.55)", backdropFilter: "blur(8px)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md max-h-[100dvh] sm:max-h-[92dvh] flex flex-col bg-card rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-display text-lg truncate pr-2">
            {title ?? (mode === "flash" ? "Novo item" : "Detalhes do item")}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar"
            className="size-9 rounded-full bg-muted grid place-items-center active:scale-95 border border-border shrink-0"
          >
            <X className="size-5" strokeWidth={2.5} />
          </button>
        </div>
        <ItemEditor
          item={item}
          mode={mode}
          onSave={onSave}
          onCancel={onCancel}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

function ItemEditor({
  item,
  mode,
  onSave,
  onCancel,
  onDelete,
}: {
  item: ItemAmbiente;
  mode: ItemEditorMode;
  onSave: (i: ItemAmbiente) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [it, setIt] = useState<ItemAmbiente>(item);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [showNomeSug, setShowNomeSug] = useState(false);
  const [showServSug, setShowServSug] = useState(false);
  const showDimensoes = mode === "detalhado";
  const showServicos = mode === "detalhado";

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
        <button
          type="button"
          onClick={() => setShowNomeSug(true)}
          className="field-tap"
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-brand-2">
              Nome do item
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-2/40 bg-brand-2/10 px-3 py-1 text-[11px] font-bold text-brand-2">
              ≡ Sugestões
            </span>
          </div>
          <div className="text-lg font-semibold text-slate-950">
            {it.nome || "Toque para escolher"}
          </div>
        </button>

        {showDimensoes && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Largura (m)">
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
                className="w-full"
              />
            </Field>
            <Field label="Altura (m)">
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={it.altura ?? ""}
                onChange={(e) =>
                  setIt({ ...it, altura: e.target.value ? parseFloat(e.target.value) : undefined })
                }
                className="w-full"
              />
            </Field>
          </div>
        )}

        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-brand-2 mb-2">
            Fotos do item ({it.fotos.length})
          </div>
          <div className="grid grid-cols-3 gap-2">
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
              type="button"
              onClick={() => setCameraOpen(true)}
              className="aspect-square rounded-2xl grid place-items-center text-white"
              style={{ background: "linear-gradient(135deg,#ff6b35,#7b5cff)" }}
            >
              <Camera className="size-8" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {showServicos && (
          <button
            type="button"
            onClick={() => setShowServSug(true)}
            className="field-tap"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="text-[10px] font-black uppercase tracking-widest text-brand-2">
                Observação
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-700">
                ≡ Serviços
              </span>
            </div>
            <div className="min-h-[44px] text-base text-slate-950">
              {it.observacao?.trim() || "Toque para adicionar observações, serviços e materiais"}
            </div>
            {it.servicos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {it.servicos.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full border border-brand-2/30 bg-brand-2/15 px-2.5 py-1 text-[10px] font-bold text-brand-2"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </button>
        )}

        <Field label={mode === "flash" ? "Preço (R$)" : "Preço adicional (somente para este item)"}>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={it.preco || ""}
            onChange={(e) => setIt({ ...it, preco: parseFloat(e.target.value) || 0 })}
            className="w-full text-display text-2xl"
          />
        </Field>

        {cameraOpen && (
          <CameraModal
            onClose={() => setCameraOpen(false)}
            onPhotosCaptured={(ids) => {
              setIt({ ...it, fotos: [...it.fotos, ...ids] });
            }}
          />
        )}
      </div>

      {/* Footer — mesma ordem em flash e detalhado: [Excluir] [Cancelar] [Salvar] */}
      <div className="px-3 py-3 border-t border-border flex gap-2 bg-card safe-area-bottom relative">
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Excluir item"
            className="size-12 rounded-2xl bg-muted grid place-items-center border border-border active:scale-95"
          >
            <Trash2 className="size-4 text-destructive" />
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-2xl bg-muted border border-border text-foreground py-3 text-xs font-extrabold uppercase tracking-widest active:scale-95"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSave(it)}
          className="flex-[1.6] rounded-2xl text-white py-3 text-xs font-extrabold uppercase tracking-widest active:scale-95"
          style={{ background: "linear-gradient(135deg,#ff6b35,#7b5cff)" }}
        >
          Salvar item
        </button>
      </div>

      {showNomeSug && (
        <SugestoesSheet title="Selecione o item" onClose={() => setShowNomeSug(false)}>
          <div className="space-y-4">
            <Field label="Nome do item">
              <input
                value={it.nome}
                onChange={(e) => setIt({ ...it, nome: e.target.value })}
                placeholder="Ex.: Janela da sala"
                className="w-full"
                autoFocus
              />
            </Field>
            <div className="text-[11px] font-black uppercase tracking-widest text-brand-2">
              Sugestões rápidas
            </div>
            <div className="grid grid-cols-3 gap-2">
              {NOMES_ITEM.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setIt({ ...it, nome: n });
                    setShowNomeSug(false);
                  }}
                  className="rounded-xl border-2 border-brand-2/40 bg-white px-3 py-3 text-sm font-bold text-slate-900 transition active:scale-95 hover:border-brand-2"
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowNomeSug(false)}
              className="w-full rounded-full px-4 py-3 text-sm font-bold uppercase tracking-wider text-white"
              style={{ background: "linear-gradient(135deg,#ff6b35,#7b5cff)" }}
            >
              Usar este nome
            </button>
          </div>
        </SugestoesSheet>
      )}

      {showServSug && (
        <SugestoesSheet title="Serviços e Materiais" onClose={() => setShowServSug(false)}>
          <div className="space-y-4">
            <Field label="Observação">
              <textarea
                rows={4}
                value={it.observacao ?? ""}
                onChange={(e) => setIt({ ...it, observacao: e.target.value })}
                placeholder="Ex.: precisa lixar, remover ferragem, corrigir trinca..."
                className="w-full resize-none"
              />
            </Field>
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-brand-2 mb-2">
                Serviços
              </div>
              <div className="flex flex-wrap gap-2">
                {SERVICOS_PADRAO.map((s) => {
                  const active = it.servicos.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleServico(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition active:scale-95 ${
                        active
                          ? "bg-brand text-white border-brand"
                          : "bg-white text-brand border-brand/40"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-emerald-700 mb-2">
                Materiais
              </div>
              <div className="flex flex-wrap gap-2">
                {MATERIAIS_PADRAO.map((m) => {
                  const active = it.servicos.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleServico(m)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition active:scale-95 ${
                        active
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-emerald-700 border-emerald-600/40"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowServSug(false)}
              className="w-full mt-2 py-3 rounded-full text-sm font-bold uppercase tracking-wider text-white"
              style={{ background: "linear-gradient(135deg,#ff6b35,#7b5cff)" }}
            >
              Confirmar
            </button>
          </div>
        </SugestoesSheet>
      )}
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
    <div className="relative aspect-square rounded-2xl bg-muted overflow-hidden border border-border">
      {url && <img src={url} alt="Foto" className="size-full object-cover" />}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-destructive text-white p-1 rounded-full"
        aria-label="Remover foto"
      >
        <X className="size-3" strokeWidth={3} />
      </button>
      {onReplace && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="absolute bottom-1 right-1 bg-brand-2 text-white px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase"
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

function SugestoesSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="size-9 rounded-full bg-slate-100 grid place-items-center active:scale-95"
          >
            <X className="size-5 text-slate-700" strokeWidth={2.5} />
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/** Helper para criar item novo com defaults consistentes. */
export function novoItemPadrao(nome = ""): ItemAmbiente {
  return {
    id: crypto.randomUUID(),
    nome,
    servicos: [],
    preco: 0,
    fotos: [],
  };
}

/** Salvar foto a partir de um File (reexport conveniente). */
export const salvarFotoFile = salvarFoto;
