import { useEffect } from "react";
import { X } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, type StatusOrcamento } from "@/lib/db";

const ORDER: StatusOrcamento[] = [
  "rascunho",
  "enviado",
  "aprovado",
  "em_andamento",
  "finalizado",
  "cancelado",
];

export function StatusPicker({
  value,
  onPick,
  onClose,
}: {
  value: StatusOrcamento;
  onPick: (s: StatusOrcamento) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" style={{ zIndex: 70 }} onClick={onClose}>
      <div className="modal-glass w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color-mix(in_oklab,var(--brand-2)_20%,transparent)]">
          <h3 className="text-display text-lg text-foreground">Status do orçamento</h3>
          <button onClick={onClose} aria-label="Fechar" className="size-9 rounded-full bg-[color-mix(in_oklab,var(--card)_70%,transparent)] backdrop-blur grid place-items-center border border-border/60">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-2">
          {ORDER.map((s) => {
            const active = s === value;
            return (
              <button
                key={s}
                onClick={() => {
                  onPick(s);
                  onClose();
                }}
                className={`px-4 py-4 rounded-2xl text-[12px] font-extrabold uppercase tracking-widest text-left transition ${STATUS_COLORS[s]} ${active ? "ring-4 ring-brand/40 scale-[1.02]" : "opacity-90"}`}
              >
                {STATUS_LABELS[s]}
                {active && <span className="block text-[9px] font-bold mt-1 opacity-70">Atual</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
