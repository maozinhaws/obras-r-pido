import { useEffect } from "react";
import { X, Share2, MessageCircle, Copy, Download } from "lucide-react";
import { compartilharNativo, copiarTexto, abrirWhatsApp, podeNativoCompartilhar, blobParaFile } from "@/lib/share";

export interface ShareMenuProps {
  onClose: () => void;
  titulo: string;
  texto: string;
  telefone?: string;
  arquivo?: { blob: Blob; nome: string };
  onSalvarPDF?: () => void;
}

export function ShareMenu({ onClose, titulo, texto, telefone, arquivo, onSalvarPDF }: ShareMenuProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function nativo() {
    const files = arquivo ? [blobParaFile(arquivo.blob, arquivo.nome)] : undefined;
    const ok = await compartilharNativo({ title: titulo, text: texto, files });
    if (ok) onClose();
  }

  return (
    <div className="modal-backdrop" style={{ zIndex: 70 }} onClick={onClose}>
      <div className="modal-glass w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color-mix(in_oklab,var(--brand-2)_20%,transparent)]">
          <h3 className="text-display text-lg text-foreground">Compartilhar</h3>
          <button onClick={onClose} aria-label="Fechar" className="size-9 rounded-full bg-[color-mix(in_oklab,var(--card)_70%,transparent)] backdrop-blur grid place-items-center border border-border/60">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-4 space-y-2">
          {podeNativoCompartilhar() && (
            <Row icon={<Share2 className="size-5" />} label="Compartilhar (sistema)" onClick={nativo} />
          )}
          {telefone && (
            <Row
              icon={<MessageCircle className="size-5 text-success" />}
              label="Enviar pelo WhatsApp"
              onClick={() => {
                abrirWhatsApp(telefone, texto);
                onClose();
              }}
            />
          )}
          <Row
            icon={<Copy className="size-5" />}
            label="Copiar texto"
            onClick={async () => {
              const ok = await copiarTexto(texto);
              if (ok) onClose();
            }}
          />
          {onSalvarPDF && (
            <Row
              icon={<Download className="size-5 text-brand" />}
              label="Baixar PDF"
              onClick={() => {
                onSalvarPDF();
                onClose();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-muted/40 hover:bg-muted active:scale-[0.99] text-left"
    >
      <span className="size-10 rounded-xl bg-card grid place-items-center border border-border shrink-0">{icon}</span>
      <span className="font-bold text-sm text-foreground">{label}</span>
    </button>
  );
}
