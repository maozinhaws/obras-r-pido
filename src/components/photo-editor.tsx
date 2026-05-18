import { useEffect, useRef, useState } from "react";
import {
  X,
  Check,
  Pencil,
  Square,
  Circle as CircleIcon,
  ArrowUpRight,
  Type,
  Undo2,
  Trash2,
} from "lucide-react";
import { salvarFoto, urlFoto, removerFoto } from "@/lib/fotos";
import { uid } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Tool = "pencil" | "rect" | "circle" | "arrow" | "text";

interface ShapeBase {
  id: string;
  color: string;
  width: number;
}
interface PathShape extends ShapeBase {
  kind: "path";
  d: string;
}
interface RectShape extends ShapeBase {
  kind: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
}
interface CircleShape extends ShapeBase {
  kind: "circle";
  cx: number;
  cy: number;
  r: number;
}
interface ArrowShape extends ShapeBase {
  kind: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
interface TextShape extends ShapeBase {
  kind: "text";
  x: number;
  y: number;
  text: string;
  size: number;
}
type Shape = PathShape | RectShape | CircleShape | ArrowShape | TextShape;

const COLORS = ["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#ffffff", "#000000"];
const BLOCK = "border-4 border-black shadow-[4px_4px_0_0_#000]";
const BLOCK_SM = "border-[3px] border-black shadow-[3px_3px_0_0_#000]";

interface Props {
  photoId: string;
  onClose: () => void;
  onSave: (newId: string) => void;
}

export function PhotoEditor({ photoId, onClose, onSave }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState(COLORS[0]);
  const [stroke, setStroke] = useState(6);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [drawing, setDrawing] = useState<Shape | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [trashHot, setTrashHot] = useState(false);
  const [textPrompt, setTextPrompt] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  useEffect(() => {
    urlFoto(photoId).then(setUrl);
  }, [photoId]);

  function onImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    setImgSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
  }

  function svgPoint(e: React.PointerEvent): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg || !imgSize) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * imgSize.w;
    const y = ((e.clientY - rect.top) / rect.height) * imgSize.h;
    return { x, y };
  }

  function pointerDown(e: React.PointerEvent) {
    if (!imgSize) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = svgPoint(e);
    const id = uid();
    if (tool === "pencil") {
      setDrawing({ kind: "path", id, color, width: stroke, d: `M ${p.x} ${p.y}` });
    } else if (tool === "rect") {
      setDrawing({ kind: "rect", id, color, width: stroke, x: p.x, y: p.y, w: 0, h: 0 });
    } else if (tool === "circle") {
      setDrawing({ kind: "circle", id, color, width: stroke, cx: p.x, cy: p.y, r: 0 });
    } else if (tool === "arrow") {
      setDrawing({ kind: "arrow", id, color, width: stroke, x1: p.x, y1: p.y, x2: p.x, y2: p.y });
    } else if (tool === "text") {
      setTextPrompt({ x: p.x, y: p.y });
      setTextValue("");
    }
  }

  function pointerMove(e: React.PointerEvent) {
    if (!drawing) return;
    const p = svgPoint(e);
    setDrawing((d) => {
      if (!d) return d;
      if (d.kind === "path") return { ...d, d: d.d + ` L ${p.x} ${p.y}` };
      if (d.kind === "rect") return { ...d, w: p.x - d.x, h: p.y - d.y };
      if (d.kind === "circle")
        return { ...d, r: Math.hypot(p.x - d.cx, p.y - d.cy) };
      if (d.kind === "arrow") return { ...d, x2: p.x, y2: p.y };
      return d;
    });
  }

  function pointerUp() {
    if (drawing) {
      setShapes((s) => [...s, drawing]);
      setDrawing(null);
    }
  }

  function confirmText() {
    if (!textPrompt || !textValue.trim()) {
      setTextPrompt(null);
      return;
    }
    setShapes((s) => [
      ...s,
      {
        kind: "text",
        id: uid(),
        color,
        width: 2,
        x: textPrompt.x,
        y: textPrompt.y,
        text: textValue.trim(),
        size: Math.max(28, stroke * 6),
      },
    ]);
    setTextPrompt(null);
    setTextValue("");
  }

  function startShapeDrag(e: React.PointerEvent, sh: Shape) {
    // Permite arrastar qualquer figura existente (rect, circle, arrow, text)
    // somente se a ferramenta atual coincide ou é texto — evita conflito ao desenhar
    if (sh.kind === "path") return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = svgPoint(e);
    let sx = 0, sy = 0;
    if (sh.kind === "text" || sh.kind === "rect") { sx = sh.x; sy = sh.y; }
    else if (sh.kind === "circle") { sx = sh.cx; sy = sh.cy; }
    else if (sh.kind === "arrow") { sx = sh.x1; sy = sh.y1; }
    dragOffset.current = { dx: p.x - sx, dy: p.y - sy };
    setDragId(sh.id);
  }

  function shapeDragMove(e: React.PointerEvent) {
    if (!dragId) return;
    const p = svgPoint(e);
    setShapes((arr) =>
      arr.map((s) => {
        if (s.id !== dragId) return s;
        const nx = p.x - dragOffset.current.dx;
        const ny = p.y - dragOffset.current.dy;
        if (s.kind === "text") return { ...s, x: nx, y: ny };
        if (s.kind === "rect") return { ...s, x: nx, y: ny };
        if (s.kind === "circle") return { ...s, cx: nx, cy: ny };
        if (s.kind === "arrow") {
          const dx = nx - s.x1;
          const dy = ny - s.y1;
          return { ...s, x1: nx, y1: ny, x2: s.x2 + dx, y2: s.y2 + dy };
        }
        return s;
      }),
    );
    const trash = trashRef.current?.getBoundingClientRect();
    if (trash) {
      const inside =
        e.clientX >= trash.left &&
        e.clientX <= trash.right &&
        e.clientY >= trash.top &&
        e.clientY <= trash.bottom;
      setTrashHot(inside);
    }
  }

  function shapeDragEnd() {
    if (dragId && trashHot) {
      setShapes((arr) => arr.filter((s) => s.id !== dragId));
    }
    setDragId(null);
    setTrashHot(false);
  }

  function undo() {
    setShapes((s) => s.slice(0, -1));
  }

  async function save() {
    if (!url || !imgSize) return;
    const canvas = document.createElement("canvas");
    canvas.width = imgSize.w;
    canvas.height = imgSize.h;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.src = url;
    await new Promise<void>((res) => {
      if (img.complete) res();
      else img.onload = () => res();
    });
    ctx.drawImage(img, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of shapes) {
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.width;
      if (s.kind === "path") {
        const path = new Path2D(s.d);
        ctx.stroke(path);
      } else if (s.kind === "rect") {
        ctx.strokeRect(s.x, s.y, s.w, s.h);
      } else if (s.kind === "circle") {
        ctx.beginPath();
        ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (s.kind === "arrow") {
        drawArrow(ctx, s.x1, s.y1, s.x2, s.y2, s.width);
      } else if (s.kind === "text") {
        ctx.font = `900 ${s.size}px system-ui, sans-serif`;
        ctx.textBaseline = "top";
        // sombra leve pra legibilidade
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillText(s.text, s.x + 2, s.y + 2);
        ctx.restore();
        ctx.fillStyle = s.color;
        ctx.fillText(s.text, s.x, s.y);
      }
    }
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", 0.9),
    );
    const newId = await salvarFoto(blob);
    await removerFoto(photoId);
    onSave(newId);
  }

  const vb = imgSize ? `0 0 ${imgSize.w} ${imgSize.h}` : "0 0 100 100";

  return (
    <div className="fixed inset-0 z-[120] bg-black flex flex-col select-none touch-none">
      {/* Top bar */}
      <div className="flex items-center justify-between p-3 bg-black border-b-4 border-black">
        <button
          onClick={onClose}
          className={cn(
            "size-12 rounded-2xl bg-white grid place-items-center active:translate-x-1 active:translate-y-1 active:shadow-none transition-all",
            BLOCK_SM,
          )}
        >
          <X className="size-6 text-black" strokeWidth={3} />
        </button>
        <div className="flex gap-2">
          <button
            onClick={undo}
            disabled={shapes.length === 0}
            className={cn(
              "size-12 rounded-2xl bg-white grid place-items-center disabled:opacity-30 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all",
              BLOCK_SM,
            )}
          >
            <Undo2 className="size-6 text-black" strokeWidth={3} />
          </button>
          <button
            onClick={save}
            className={cn(
              "h-12 px-4 rounded-2xl bg-emerald-400 grid place-items-center active:translate-x-1 active:translate-y-1 active:shadow-none transition-all",
              BLOCK_SM,
            )}
          >
            <Check className="size-6 text-black" strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 grid place-items-center overflow-hidden bg-neutral-900">
        {url && imgSize ? (
          <div className="relative max-w-full max-h-full">
            <img
              src={url}
              onLoad={onImgLoad}
              alt=""
              className="block max-w-full max-h-[calc(100vh-220px)] w-auto h-auto"
            />
            <svg
              ref={svgRef}
              viewBox={vb}
              preserveAspectRatio="none"
              className="absolute inset-0 size-full touch-none"
              onPointerDown={pointerDown}
              onPointerMove={(e) => {
                pointerMove(e);
                shapeDragMove(e);
              }}
              onPointerUp={() => {
                pointerUp();
                shapeDragEnd();
              }}
            >
              {[...shapes, ...(drawing ? [drawing] : [])].map((s) => renderShape(s, startShapeDrag))}
            </svg>
          </div>
        ) : (
          <img src={url ?? ""} onLoad={onImgLoad} alt="" className="opacity-0 absolute" />
        )}

        {/* Trash zone (visible apenas quando arrastando) */}
        {dragId && (
          <div
            ref={trashRef}
            className={cn(
              "absolute bottom-4 left-1/2 -translate-x-1/2 size-20 rounded-full grid place-items-center transition-all",
              trashHot ? "bg-red-500 scale-125" : "bg-red-500/70",
              BLOCK,
            )}
          >
            <Trash2 className="size-9 text-white" strokeWidth={3} />
          </div>
        )}

        {/* Text input overlay */}
        {textPrompt && (
          <div className="absolute inset-0 bg-black/70 grid place-items-center p-6">
            <div className={cn("bg-white rounded-2xl p-4 w-full max-w-sm", BLOCK)}>
              <input
                autoFocus
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmText()}
                placeholder="Digite…"
                className={cn(
                  "w-full bg-yellow-100 rounded-xl px-3 py-3 text-black font-black text-lg outline-none",
                  BLOCK_SM,
                )}
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setTextPrompt(null)}
                  className={cn(
                    "flex-1 h-12 rounded-xl bg-white text-black font-black uppercase text-xs",
                    BLOCK_SM,
                  )}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmText}
                  className={cn(
                    "flex-1 h-12 rounded-xl bg-emerald-400 text-black font-black uppercase text-xs",
                    BLOCK_SM,
                  )}
                >
                  Ok
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="bg-black border-t-4 border-black p-3 space-y-3">
        {/* Cores */}
        <div className="flex justify-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                "size-9 rounded-full transition-transform",
                BLOCK_SM,
                color === c && "scale-125",
              )}
              style={{ background: c }}
            />
          ))}
        </div>
        {/* Espessura */}
        <div className="flex items-center justify-center gap-2 px-4">
          <span className="text-white/70 text-[10px] font-black uppercase">Px</span>
          <input
            type="range"
            min={2}
            max={24}
            value={stroke}
            onChange={(e) => setStroke(Number(e.target.value))}
            className="flex-1 max-w-xs accent-yellow-300"
          />
          <span className="text-yellow-300 font-black w-6 text-right">{stroke}</span>
        </div>
        {/* Ferramentas */}
        <div className="flex justify-center gap-2">
          {(
            [
              { t: "pencil", icon: Pencil },
              { t: "rect", icon: Square },
              { t: "circle", icon: CircleIcon },
              { t: "arrow", icon: ArrowUpRight },
              { t: "text", icon: Type },
            ] as { t: Tool; icon: typeof Pencil }[]
          ).map(({ t, icon: Icon }) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className={cn(
                "size-14 rounded-2xl grid place-items-center active:translate-x-1 active:translate-y-1 active:shadow-none transition-all",
                tool === t ? "bg-yellow-300" : "bg-white",
                BLOCK_SM,
              )}
            >
              <Icon className="size-6 text-black" strokeWidth={3} />
            </button>
          ))}
        </div>
        {tool === "text" && (
          <p className="text-center text-white/60 text-[10px] uppercase font-bold tracking-widest">
            Toque na foto pra inserir · arraste pra mover · solte na lixeira pra excluir
          </p>
        )}
      </div>
    </div>
  );
}

function renderShape(
  s: Shape,
  onDrag: (e: React.PointerEvent, s: Shape) => void,
) {
  const common = {
    key: s.id,
    onPointerDown: (e: React.PointerEvent) => onDrag(e, s),
    style: { cursor: "move" as const },
  };
  if (s.kind === "path") {
    return (
      <path
        key={s.id}
        d={s.d}
        stroke={s.color}
        strokeWidth={s.width}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (s.kind === "rect") {
    const x = s.w < 0 ? s.x + s.w : s.x;
    const y = s.h < 0 ? s.y + s.h : s.y;
    return (
      <rect
        {...common}
        x={x}
        y={y}
        width={Math.abs(s.w)}
        height={Math.abs(s.h)}
        stroke={s.color}
        strokeWidth={s.width}
        fill="none"
      />
    );
  }
  if (s.kind === "circle") {
    return (
      <circle
        {...common}
        cx={s.cx}
        cy={s.cy}
        r={Math.max(0, s.r)}
        stroke={s.color}
        strokeWidth={s.width}
        fill="none"
      />
    );
  }
  if (s.kind === "arrow") {
    const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
    const head = Math.max(12, s.width * 3);
    const hx = s.x2 - head * Math.cos(angle - Math.PI / 6);
    const hy = s.y2 - head * Math.sin(angle - Math.PI / 6);
    const hx2 = s.x2 - head * Math.cos(angle + Math.PI / 6);
    const hy2 = s.y2 - head * Math.sin(angle + Math.PI / 6);
    return (
      <g key={s.id}>
        <line
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke={s.color}
          strokeWidth={s.width}
          strokeLinecap="round"
        />
        <polyline
          points={`${hx},${hy} ${s.x2},${s.y2} ${hx2},${hy2}`}
          stroke={s.color}
          strokeWidth={s.width}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  }
  if (s.kind === "text") {
    return (
      <text
        {...common}
        x={s.x}
        y={s.y + s.size * 0.85}
        fill={s.color}
        fontSize={s.size}
        fontWeight={900}
        fontFamily="system-ui, sans-serif"
        stroke="rgba(0,0,0,0.5)"
        strokeWidth={s.size * 0.05}
        paintOrder="stroke"
      >
        {s.text}
      </text>
    );
  }
  return null;
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = Math.max(12, width * 3);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - head * Math.cos(angle - Math.PI / 6),
    y2 - head * Math.sin(angle - Math.PI / 6),
  );
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - head * Math.cos(angle + Math.PI / 6),
    y2 - head * Math.sin(angle + Math.PI / 6),
  );
  ctx.stroke();
}
