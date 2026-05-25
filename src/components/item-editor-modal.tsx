import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ItemAmbiente } from "@/lib/db";

export function novoItemPadrao(nome = ""): ItemAmbiente {
  return {
    id: crypto.randomUUID(),
    nome,
    servicos: [],
    preco: 0,
    fotos: [],
  };
}

interface Props {
  open: boolean;
  item: ItemAmbiente | null;
  mode: "flash" | "detalhado";
  title?: string;
  onCancel: () => void;
  onSave: (it: ItemAmbiente) => void;
  onDelete?: () => void;
}

/**
 * Stub mínimo do editor de item.
 * As rotas React (/flash e /orcamentos/novo) atualmente não são acessadas
 * porque a home redireciona para o app legado /pintor/index.html.
 * Este componente existe apenas para permitir o build TypeScript.
 */
export function ItemEditorModal({ open, item, title, onCancel, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<ItemAmbiente | null>(item);

  useEffect(() => {
    setDraft(item);
  }, [item]);

  if (!open || !draft) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="glass w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-display text-lg">{title ?? "Editar item"}</h3>
          <button onClick={onCancel} aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <label className="block text-xs uppercase tracking-wider mb-1">Nome</label>
        <input
          className="w-full mb-3"
          value={draft.nome}
          onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
        />

        <label className="block text-xs uppercase tracking-wider mb-1">Preço</label>
        <input
          type="number"
          className="w-full mb-4"
          value={draft.preco}
          onChange={(e) => setDraft({ ...draft, preco: Number(e.target.value) || 0 })}
        />

        <div className="flex gap-2 justify-end">
          {onDelete && (
            <button onClick={onDelete} className="px-3 py-2 text-sm text-destructive">
              Excluir
            </button>
          )}
          <button onClick={onCancel} className="px-3 py-2 text-sm">
            Cancelar
          </button>
          <button
            onClick={() => onSave(draft)}
            className="px-4 py-2 text-sm bg-brand text-ink rounded-lg"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
