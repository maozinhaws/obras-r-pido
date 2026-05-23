// Share menu helpers (Web Share API + fallbacks)
import { whatsappLink } from "@/lib/utils";

export function podeNativoCompartilhar(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function compartilharNativo(opts: {
  title?: string;
  text?: string;
  files?: File[];
}): Promise<boolean> {
  if (!podeNativoCompartilhar()) return false;
  try {
    const payload: ShareData = { title: opts.title, text: opts.text };
    if (opts.files && opts.files.length && (navigator as any).canShare?.({ files: opts.files })) {
      (payload as any).files = opts.files;
    }
    await navigator.share(payload);
    return true;
  } catch {
    return false;
  }
}

export async function copiarTexto(t: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    return false;
  }
}

export function abrirWhatsApp(telefone: string, mensagem: string) {
  window.open(whatsappLink(telefone, mensagem), "_blank");
}

export function blobParaFile(blob: Blob, nome: string, type = blob.type): File {
  return new File([blob], nome, { type });
}
