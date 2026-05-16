import { useState, useRef, useEffect } from "react";
import { X, Camera, Zap, ZapOff, Maximize, Minimize, Trash2, Check } from "lucide-react";
import { salvarFoto, urlFoto } from "@/lib/fotos";
import { cn } from "@/lib/utils";

interface CameraModalProps {
  onClose: () => void;
  onPhotosCaptured: (photoIds: string[]) => void;
}

export function CameraModal({ onClose, onPhotosCaptured }: CameraModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(10);
  const [reviewPhoto, setReviewPhoto] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
        const track = s.getVideoTracks()[0];
        trackRef.current = track;
        
        // Check capabilities for zoom and torch
        const capabilities = track.getCapabilities() as any;
        if (capabilities.zoom) {
          setMinZoom(capabilities.zoom.min);
          setMaxZoom(capabilities.zoom.max);
          setZoom(capabilities.zoom.min);
        }
      } catch (err) {
        console.error("Camera error:", err);
        alert("Erro ao acessar câmera. Verifique as permissões.");
        onClose();
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (trackRef.current) {
      const track = trackRef.current;
      const capabilities = track.getCapabilities() as any;
      
      const constraints: any = {};
      if (capabilities.torch) {
        constraints.torch = flash;
      }
      if (capabilities.zoom) {
        constraints.zoom = zoom;
      }
      
      if (Object.keys(constraints).length > 0) {
        track.applyConstraints({ advanced: [constraints] } as any).catch(console.error);
      }
    }
  }, [flash, zoom]);

  const capture = async () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (blob) {
        const id = await salvarFoto(blob);
        setCapturedPhotos((prev) => [...prev, id]);
      }
    }, "image/jpeg", 0.9);
  };

  const removeCapturedPhoto = (id: string) => {
    setCapturedPhotos((prev) => prev.filter((p) => p !== id));
    if (reviewPhoto === id) setReviewPhoto(null);
  };

  const finish = () => {
    onPhotosCaptured(capturedPhotos);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col md:flex-row overflow-hidden animate-fade-in">
      {/* Viewfinder */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Overlays */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
          <button
            onClick={onClose}
            className="size-12 rounded-full glass-strong grid place-items-center pointer-events-auto"
          >
            <X className="size-6 text-white" />
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={() => setFlash(!flash)}
              className={cn(
                "size-12 rounded-full glass-strong grid place-items-center pointer-events-auto transition-colors",
                flash ? "bg-brand/40 text-brand" : "text-white"
              )}
            >
              {flash ? <Zap className="size-6" /> : <ZapOff className="size-6" />}
            </button>
          </div>
        </div>

        {/* Zoom Control (Vertical Slider on side) */}
        {maxZoom > minZoom && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/10 pointer-events-auto">
            <Maximize className="size-4 text-white/60" />
            <input
              type="range"
              min={minZoom}
              max={maxZoom}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="appearance-none w-1 h-32 bg-white/20 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
              style={{ writingMode: "vertical-lr" } as any}
            />
            <Minimize className="size-4 text-white/60" />
          </div>
        )}

        {/* Captured Count Badge */}
        {capturedPhotos.length > 0 && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full glass-brand text-white text-[10px] font-black uppercase tracking-widest animate-scale-in">
            {capturedPhotos.length} Foto{capturedPhotos.length > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Side/Bottom Bar */}
      <div className="h-40 md:h-full md:w-48 glass-strong rounded-none border-t md:border-t-0 md:border-l border-white/10 flex flex-col">
        {/* Capture Button Container */}
        <div className="p-4 md:p-8 flex justify-center items-center">
          <button
            onClick={capture}
            className="size-20 md:size-24 rounded-full border-4 border-white p-1 hover:scale-105 active:scale-95 transition-transform"
          >
            <div className="size-full rounded-full bg-white flex items-center justify-center">
              <Camera className="size-8 text-black" />
            </div>
          </button>
        </div>

        {/* Thumbnails Container */}
        <div className="flex-1 overflow-x-auto md:overflow-y-auto px-4 pb-4 flex md:flex-col gap-3">
          {capturedPhotos.map((id, index) => (
            <Thumbnail 
              key={id} 
              id={id} 
              index={index} 
              onClick={() => setReviewPhoto(id)} 
            />
          ))}
          {capturedPhotos.length === 0 && (
            <div className="hidden md:flex flex-1 items-center justify-center text-center p-4 border-2 border-dashed border-white/10 rounded-2xl text-[10px] font-mono opacity-30 uppercase">
              Capture para ver aqui
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-white/10 flex gap-2">
          <button
            onClick={finish}
            disabled={capturedPhotos.length === 0}
            className="flex-1 glass-brand text-white font-black uppercase text-xs py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Check className="size-4" /> Pronto
          </button>
        </div>
      </div>

      {/* Review Photo Overlay */}
      {reviewPhoto && (
        <div className="absolute inset-0 z-[110] bg-black flex flex-col animate-fade-in">
          <div className="p-4 flex justify-between items-center bg-black/60 backdrop-blur-md">
            <button
              onClick={() => setReviewPhoto(null)}
              className="size-10 rounded-full glass grid place-items-center"
            >
              <X className="size-5 text-white" />
            </button>
            <span className="text-white text-[10px] font-black uppercase tracking-widest">Revisão</span>
            <button
              onClick={() => removeCapturedPhoto(reviewPhoto)}
              className="size-10 rounded-full glass border-destructive/40 text-destructive grid place-items-center"
            >
              <Trash2 className="size-5" />
            </button>
          </div>
          <div className="flex-1 bg-black flex items-center justify-center p-4">
             <img src={URL.createObjectURL(new Blob()) /* handled in Thumbnail component logic but we need a better way for direct access here if possible, but actually we use a specialized component below */} 
             className="max-w-full max-h-full object-contain rounded-xl" /> 
             {/* Fixing the review image display below */}
             <ReviewImage id={reviewPhoto} />
          </div>
        </div>
      )}
    </div>
  );
}

function Thumbnail({ id, index, onClick }: { id: string, index: number, onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    urlFoto(id).then(setUrl);
  }, [id]);

  return (
    <button 
      onClick={onClick}
      className="size-16 md:w-full md:h-auto md:aspect-square bg-white/5 rounded-xl overflow-hidden border-2 border-white/10 shrink-0 hover:border-brand transition-all animate-scale-in"
    >
      {url ? (
        <img src={url} alt={`Foto ${index + 1}`} className="size-full object-cover" />
      ) : (
        <div className="size-full flex items-center justify-center animate-pulse bg-white/10" />
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
    <img src={url} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-scale-in" />
  ) : null;
}
