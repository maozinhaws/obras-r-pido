import { useState, useRef, useEffect, useCallback } from "react";
import { X, Zap, ZapOff, Trash2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { salvarFoto, urlFoto } from "@/lib/fotos";
import { cn } from "@/lib/utils";

interface CameraModalProps {
  onClose: () => void;
  onPhotosCaptured: (photoIds: string[]) => void;
}

// Bloco-style: borda preta grossa + sombra dura
const BLOCK = "border-4 border-black shadow-[4px_4px_0_0_#000]";
const BLOCK_SM = "border-[3px] border-black shadow-[3px_3px_0_0_#000]";

interface LensInfo {
  deviceId: string;
  label: string;
  tag: string; // "0.5x" | "1x" | "2x"
}

export function CameraModal({ onClose, onPhotosCaptured }: CameraModalProps) {
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [lenses, setLenses] = useState<LensInfo[]>([]);
  const [activeLensId, setActiveLensId] = useState<string | null>(null);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [flashing, setFlashing] = useState(false); // visual feedback on capture

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  // --- Camera lifecycle ---
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    trackRef.current = null;
  }, []);

  const startStream = useCallback(async (deviceId?: string) => {
    stopStream();
    const constraints: MediaStreamConstraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: { ideal: "environment" } },
      audio: false,
    };
    const s = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = s;
    if (videoRef.current) videoRef.current.srcObject = s;
    const track = s.getVideoTracks()[0];
    trackRef.current = track;
    setActiveLensId(track.getSettings().deviceId || deviceId || null);

    const caps = (track.getCapabilities?.() ?? {}) as any;
    if (caps.zoom) {
      setZoomSupported(true);
      setMinZoom(caps.zoom.min ?? 1);
      setMaxZoom(caps.zoom.max ?? 1);
      setZoom(caps.zoom.min ?? 1);
    } else {
      setZoomSupported(false);
    }
  }, [stopStream]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await startStream();
        // Enumerate after permission granted (labels populate)
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        const cams = devices.filter((d) => d.kind === "videoinput");
        // Heurística: pegar até 3 traseiras
        const back = cams.filter((d) => /back|rear|environment|traseira/i.test(d.label));
        const list = (back.length ? back : cams).slice(0, 3).map((d, i) => {
          const label = d.label.toLowerCase();
          let tag = `${i + 1}x`;
          if (/ultra|wide|0\.5/.test(label)) tag = "0.5x";
          else if (/tele|2x|3x/.test(label)) tag = "2x";
          else if (i === 0) tag = "1x";
          return { deviceId: d.deviceId, label: d.label, tag };
        });
        setLenses(list);
      } catch (err) {
        console.error("Camera error:", err);
        alert("Erro ao acessar câmera. Verifique as permissões.");
        onClose();
      }
    })();
    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aplica apenas zoom em tempo real. Torch é acionado APENAS no momento da captura.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const caps = (track.getCapabilities?.() ?? {}) as any;
    if (caps.zoom) {
      track.applyConstraints({ advanced: [{ zoom }] } as any).catch(() => {});
    }
  }, [zoom]);

  const switchLens = async (deviceId: string) => {
    try {
      await startStream(deviceId);
    } catch (e) {
      console.error("Lens switch failed", e);
    }
  };

  // --- Capture ---
  const capture = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const track = trackRef.current;
    const caps = (track?.getCapabilities?.() ?? {}) as any;
    const hasTorch = !!caps.torch;

    // Aciona torch real do aparelho se disponível e flash ON
    if (flash && hasTorch && track) {
      try {
        await track.applyConstraints({ advanced: [{ torch: true }] } as any);
        await new Promise((r) => setTimeout(r, 80)); // estabiliza exposição
      } catch {}
    } else if (flash && !hasTorch) {
      // Fallback visual quando o aparelho não expõe torch
      setFlashing(true);
      setTimeout(() => setFlashing(false), 150);
    }

    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(v, 0, 0);
    canvas.toBlob(
      async (blob) => {
        if (track && hasTorch && flash) {
          try { await track.applyConstraints({ advanced: [{ torch: false }] } as any); } catch {}
        }
        if (!blob) return;
        const id = await salvarFoto(blob);
        setCapturedPhotos((prev) => [...prev, id]);
      },
      "image/jpeg",
      0.9,
    );
  };

  const removeAt = (idx: number) => {
    setCapturedPhotos((prev) => prev.filter((_, i) => i !== idx));
    setReviewIndex((cur) => {
      if (cur === null) return null;
      const newLen = capturedPhotos.length - 1;
      if (newLen <= 0) return null;
      return Math.min(cur, newLen - 1);
    });
  };

  const finish = () => {
    onPhotosCaptured(capturedPhotos);
    onClose();
  };

  // --- Swipe on review ---
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || reviewIndex === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (deltaX > 75) {
      // previous
      setReviewIndex((i) => (i === null || i === 0 ? i : i - 1));
    } else if (deltaX < -75) {
      // next; se já estava na última → volta pra câmera
      if (reviewIndex >= capturedPhotos.length - 1) setReviewIndex(null);
      else setReviewIndex(reviewIndex + 1);
    }
  };

  const goPrev = () =>
    setReviewIndex((i) => (i === null || i === 0 ? i : i - 1));
  const goNext = () => {
    if (reviewIndex === null) return;
    if (reviewIndex >= capturedPhotos.length - 1) setReviewIndex(null);
    else setReviewIndex(reviewIndex + 1);
  };

  const viewing = reviewIndex !== null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden select-none touch-none">
      {/* Viewfinder */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full h-full object-cover transition-opacity",
            viewing && "opacity-0",
          )}
        />

        {/* Capture flash */}
        {flashing && <div className="absolute inset-0 bg-white animate-fade-in pointer-events-none" />}

        {/* TOP BAR */}
        {!viewing && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
            <button
              onClick={onClose}
              aria-label="Fechar"
              className={cn(
                "size-14 rounded-2xl bg-white grid place-items-center pointer-events-auto active:translate-x-1 active:translate-y-1 active:shadow-none transition-all",
                BLOCK,
              )}
            >
              <X className="size-7 text-black" strokeWidth={3} />
            </button>

            <button
              onClick={() => setFlash(!flash)}
              aria-label="Flash"
              className={cn(
                "size-14 rounded-2xl grid place-items-center pointer-events-auto active:translate-x-1 active:translate-y-1 active:shadow-none transition-all",
                flash ? "bg-yellow-300" : "bg-white",
                BLOCK,
              )}
            >
              {flash ? (
                <Zap className="size-7 text-black" strokeWidth={3} fill="currentColor" />
              ) : (
                <ZapOff className="size-7 text-black" strokeWidth={3} />
              )}
            </button>
          </div>
        )}

        {/* LEFT: thumbnails */}
        {!viewing && capturedPhotos.length > 0 && (
          <div className="absolute left-3 top-24 bottom-32 w-20 overflow-y-auto pointer-events-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col gap-3 py-2">
            {capturedPhotos.map((id, i) => (
              <Thumb key={id} id={id} index={i} onClick={() => setReviewIndex(i)} />
            ))}
          </div>
        )}

        {/* RIGHT: vertical zoom */}
        {!viewing && zoomSupported && maxZoom > minZoom && (
          <div
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 w-12 h-60 rounded-2xl bg-neutral-800 grid place-items-center pointer-events-auto",
              BLOCK,
            )}
          >
            <VerticalZoom min={minZoom} max={maxZoom} value={zoom} onChange={setZoom} />
          </div>
        )}

        {/* LENS SWITCHER (above capture) */}
        {!viewing && lenses.length > 1 && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
            {lenses.map((l) => (
              <button
                key={l.deviceId}
                onClick={() => switchLens(l.deviceId)}
                className={cn(
                  "min-w-12 h-12 px-3 rounded-full grid place-items-center text-sm font-black active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all",
                  activeLensId === l.deviceId
                    ? "bg-yellow-300 text-black"
                    : "bg-white/90 text-black",
                  BLOCK_SM,
                )}
              >
                {l.tag}
              </button>
            ))}
          </div>
        )}

        {/* COUNT BADGE */}
        {!viewing && capturedPhotos.length > 0 && (
          <div
            className={cn(
              "absolute top-4 left-1/2 -translate-x-1/2 px-4 h-12 rounded-2xl bg-emerald-400 grid place-items-center text-black font-black text-base",
              BLOCK,
            )}
          >
            {capturedPhotos.length} FOTO{capturedPhotos.length > 1 ? "S" : ""}
          </div>
        )}
      </div>

      {/* BOTTOM BAR — capture + finish */}
      {!viewing && (
        <div className="bg-black border-t-4 border-black px-4 py-5 flex items-center justify-between gap-3">
          <div className="w-20" />
          <button
            onClick={capture}
            aria-label="Capturar"
            className={cn(
              "size-20 rounded-full bg-emerald-400 grid place-items-center active:translate-x-1 active:translate-y-1 active:shadow-none transition-all",
              BLOCK,
            )}
          >
            <div className="size-14 rounded-full border-4 border-black" />
          </button>
          <button
            onClick={finish}
            disabled={capturedPhotos.length === 0}
            className={cn(
              "h-14 px-4 rounded-2xl bg-yellow-300 grid place-items-center font-black text-black uppercase text-xs disabled:opacity-30 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all",
              BLOCK,
            )}
          >
            <Check className="size-6" strokeWidth={3} />
          </button>
        </div>
      )}

      {/* REVIEW MODE */}
      {viewing && reviewIndex !== null && capturedPhotos[reviewIndex] && (
        <div
          className="absolute inset-0 z-[110] bg-black flex flex-col animate-fade-in"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="p-4 flex justify-between items-center bg-black">
            <button
              onClick={() => setReviewIndex(null)}
              className={cn(
                "size-12 rounded-2xl bg-white grid place-items-center active:translate-x-1 active:translate-y-1 active:shadow-none transition-all",
                BLOCK_SM,
              )}
            >
              <X className="size-6 text-black" strokeWidth={3} />
            </button>
            <span className="text-white font-black uppercase text-sm">
              {reviewIndex + 1} / {capturedPhotos.length}
            </span>
            <button
              onClick={() => removeAt(reviewIndex)}
              className={cn(
                "size-12 rounded-2xl bg-red-500 grid place-items-center active:translate-x-1 active:translate-y-1 active:shadow-none transition-all",
                BLOCK_SM,
              )}
            >
              <Trash2 className="size-6 text-white" strokeWidth={3} />
            </button>
          </div>
          <div className="relative flex-1 flex items-center justify-center p-2">
            <ReviewImage id={capturedPhotos[reviewIndex]} />
            {reviewIndex > 0 && (
              <button
                onClick={goPrev}
                className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 size-12 rounded-2xl bg-white grid place-items-center active:translate-x-1 active:translate-y-1 active:shadow-none transition-all",
                  BLOCK_SM,
                )}
              >
                <ChevronLeft className="size-6 text-black" strokeWidth={3} />
              </button>
            )}
            <button
              onClick={goNext}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 size-12 rounded-2xl bg-white grid place-items-center active:translate-x-1 active:translate-y-1 active:shadow-none transition-all",
                BLOCK_SM,
              )}
            >
              <ChevronRight className="size-6 text-black" strokeWidth={3} />
            </button>
          </div>
          <div className="p-3 text-center text-white/50 text-[10px] uppercase tracking-widest font-bold">
            Arraste para navegar
          </div>
        </div>
      )}
    </div>
  );
}

// Vertical zoom slider — trilha cinza + thumb amarelo
function VerticalZoom({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const setFromPoint = (clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = 1 - Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const v = min + (max - min) * ratio;
    onChange(Number(v.toFixed(2)));
  };

  const ratio = (value - min) / Math.max(0.0001, max - min);
  const thumbBottomPct = ratio * 100;

  return (
    <div
      ref={trackRef}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setFromPoint(e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.buttons) setFromPoint(e.clientY);
      }}
      className="relative w-full h-full grid place-items-center cursor-pointer"
    >
      <div className="relative w-2 h-48 rounded-full bg-neutral-600 border-2 border-black overflow-visible">
        <div
          className="absolute left-1/2 -translate-x-1/2 size-8 rounded-full bg-yellow-300 border-[3px] border-black shadow-[2px_2px_0_0_#000]"
          style={{ bottom: `calc(${thumbBottomPct}% - 16px)` }}
        />
      </div>
      <span className="absolute -bottom-1 text-[10px] font-black text-white">
        {value.toFixed(1)}x
      </span>
    </div>
  );
}

function Thumb({ id, index, onClick }: { id: string; index: number; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    urlFoto(id).then(setUrl);
  }, [id]);
  return (
    <button
      onClick={onClick}
      className={cn(
        "size-16 rounded-xl overflow-hidden bg-white/10 shrink-0 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all",
        BLOCK_SM,
      )}
    >
      {url ? (
        <img src={url} alt={`Foto ${index + 1}`} className="size-full object-cover" />
      ) : (
        <div className="size-full animate-pulse bg-white/10" />
      )}
    </button>
  );
}

function ReviewImage({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    urlFoto(id).then(setUrl);
  }, [id]);
  return url ? (
    <img src={url} className="max-w-full max-h-full object-contain rounded-xl" />
  ) : (
    <div className="size-32 animate-pulse bg-white/10 rounded-xl" />
  );
}
