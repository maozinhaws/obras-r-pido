import { useEffect, useRef, useState } from "react";
import { X, Eraser, Check } from "lucide-react";

export function SignaturePad({
  value,
  onChange,
  label = "Assinatura",
}: {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-black uppercase tracking-widest text-foreground/60">{label}</div>
      {value ? (
        <div className="border-2 border-slate-300 rounded-2xl bg-white p-2 flex items-center gap-3">
          <img src={value} alt="Assinatura" className="h-16 object-contain flex-1" />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="px-3 py-2 text-[10px] font-black uppercase text-destructive border-2 border-destructive/40 rounded-lg"
          >
            Apagar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full border-2 border-dashed border-slate-300 rounded-2xl bg-white p-6 text-sm font-bold text-slate-700 active:scale-[0.99]"
        >
          Toque para assinar
        </button>
      )}
      {open && (
        <SignatureModal
          onClose={() => setOpen(false)}
          onSave={(d) => {
            onChange(d);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function SignatureModal({ onClose, onSave }: { onClose: () => void; onSave: (d: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#0a0a0a";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  function pos(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function down(e: React.PointerEvent) {
    drawing.current = true;
    last.current = pos(e);
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    hasInk.current = true;
  }
  function up() {
    drawing.current = false;
    last.current = null;
  }
  function clear() {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    hasInk.current = false;
  }
  function save() {
    if (!hasInk.current) return;
    onSave(canvasRef.current!.toDataURL("image/png"));
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">Assine abaixo</h3>
          <button onClick={onClose} aria-label="Fechar" className="size-9 rounded-full bg-slate-100 grid place-items-center">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-4">
          <canvas
            ref={canvasRef}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerLeave={up}
            style={{ width: "100%", height: 220, touchAction: "none" }}
            className="border-2 border-slate-300 rounded-2xl bg-white"
          />
        </div>
        <div className="p-4 flex gap-2 border-t border-slate-200">
          <button onClick={clear} className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full bg-slate-100 text-sm font-bold text-slate-800">
            <Eraser className="size-4" /> Limpar
          </button>
          <button onClick={save} className="flex-[2] inline-flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#ff6b35,#7b5cff)" }}>
            <Check className="size-4" /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
