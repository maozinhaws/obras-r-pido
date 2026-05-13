import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function whatsappLink(telefone: string, mensagem: string): string {
  const num = telefone.replace(/\D/g, "");
  const numFinal = num.startsWith("55") ? num : `55${num}`;
  return `https://wa.me/${numFinal}?text=${encodeURIComponent(mensagem)}`;
}
