// Form validation + Enter-nav helpers
import { z } from "zod";

export const clienteSchema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(120),
  apelido: z.string().trim().max(80).optional().or(z.literal("")),
  telefone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[\d()+\-\s]*$/, "Telefone inválido")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").max(160).optional().or(z.literal("")),
  documento: z.string().trim().max(40).optional().or(z.literal("")),
  endereco: z.string().trim().max(400).optional().or(z.literal("")),
});

export const eventoSchema = z.object({
  titulo: z.string().trim().min(1, "Título obrigatório").max(120),
  data: z.string().min(1, "Data obrigatória"),
  hora: z.string().optional().or(z.literal("")),
  observacao: z.string().max(800).optional().or(z.literal("")),
});

export type ZodIssueMap = Record<string, string>;

export function issuesToMap(err: z.ZodError): ZodIssueMap {
  const m: ZodIssueMap = {};
  for (const i of err.issues) {
    const k = i.path.join(".");
    if (!m[k]) m[k] = i.message;
  }
  return m;
}

// Enter-nav: pular para o próximo input/textarea/button[type=submit] dentro de um container
export function handleEnterNav(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== "Enter") return;
  const target = e.target as HTMLElement;
  if (target.tagName === "TEXTAREA") return; // textarea = quebra de linha
  const form = target.closest("form, [data-enter-nav]");
  if (!form) return;
  e.preventDefault();
  const focusables = Array.from(
    form.querySelectorAll<HTMLElement>(
      'input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button[type=submit]'
    )
  );
  const i = focusables.indexOf(target);
  const next = focusables[i + 1];
  if (next) next.focus();
}
