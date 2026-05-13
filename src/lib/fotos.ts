import { db, type Foto } from "./db";
import { uid } from "./utils";

export async function salvarFoto(file: File | Blob): Promise<string> {
  // comprimir para ~1600px max via canvas
  const bitmap = await createImageBitmap(file);
  const max = 1600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob: Blob = await new Promise((res) =>
    canvas.toBlob((b) => res(b!), "image/jpeg", 0.85),
  );
  const id = uid();
  const foto: Foto = { id, blob, criadoEm: Date.now() };
  await db.fotos.put(foto);
  return id;
}

const cache = new Map<string, string>();

export async function urlFoto(id: string): Promise<string | null> {
  if (cache.has(id)) return cache.get(id)!;
  const f = await db.fotos.get(id);
  if (!f) return null;
  const url = URL.createObjectURL(f.blob);
  cache.set(id, url);
  return url;
}

export async function removerFoto(id: string) {
  cache.delete(id);
  await db.fotos.delete(id);
}

export async function fotoDataURL(id: string): Promise<string | null> {
  const f = await db.fotos.get(id);
  if (!f) return null;
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(f.blob);
  });
}
