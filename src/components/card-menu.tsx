import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

export interface CardMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

export function CardMenu({ items, label = "Mais ações" }: { items: CardMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="size-9 rounded-full bg-muted grid place-items-center active:scale-95 border border-border"
      >
        <MoreVertical className="size-4 text-foreground" strokeWidth={2.5} />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 w-56 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm font-semibold hover:bg-muted ${it.danger ? "text-destructive" : "text-foreground"}`}
            >
              {it.icon && <span className="size-5 shrink-0 grid place-items-center">{it.icon}</span>}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
