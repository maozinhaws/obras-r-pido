import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { db, type ConfigEmpresa, SERVICOS_PADRAO, FORMAS_PAGAMENTO, AMBIENTES_PADRAO } from "@/lib/db";
import { PageHeader } from "@/components/app-shell";
import { Field } from "./clientes";
import {
  Save,
  Building2,
  Accessibility,
  MessageCircle,
  PenLine,
  Phone,
  ChevronDown,
  X,
} from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Pintor Plus" },
      { name: "description", content: "Dados da empresa, mensagens padrão e preferências do app." },
    ],
  }),
  component: ConfigPage,
});

type SectionId = "acessibilidade" | "empresa" | "contato" | "whats" | "assinatura";

const DEFAULTS: ConfigEmpresa = {
  id: 1,
  servicosPadrao: SERVICOS_PADRAO,
  formasPagamento: FORMAS_PAGAMENTO,
  ambientesPadrao: AMBIENTES_PADRAO,
  mensagemPadraoWhats:
    "Olá! Segue o orçamento solicitado. Qualquer dúvida estou à disposição.",
};

function applyAcessibilidade(cfg: Partial<ConfigEmpresa>) {
  const root = document.documentElement;
  if (cfg.fonteTamanho) root.setAttribute("data-fonte", cfg.fonteTamanho);
  else root.removeAttribute("data-fonte");
  if (cfg.altoContraste) root.setAttribute("data-contraste", "alto");
  else root.removeAttribute("data-contraste");
}

function ConfigPage() {
  const [saved, setSaved] = useState<ConfigEmpresa>(DEFAULTS);
  const [form, setForm] = useState<ConfigEmpresa>(DEFAULTS);
  const [flashSalvo, setFlashSalvo] = useState(false);
  const [open, setOpen] = useState<SectionId | null>("acessibilidade");

  useEffect(() => {
    db.config.get(1).then((c) => {
      const merged = { ...DEFAULTS, ...(c ?? {}) };
      setSaved(merged);
      setForm(merged);
    });
  }, []);

  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(form), [saved, form]);

  // Avisar antes de fechar/recarregar a aba
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Avisar antes de navegar para outra rota
  useBlocker({
    shouldBlockFn: () => {
      if (!dirty) return false;
      const ok = window.confirm(
        "Você tem alterações não salvas. Deseja sair sem salvar?",
      );
      if (ok) {
        // restaura aparência salva ao sair sem salvar
        applyAcessibilidade(saved);
        return false;
      }
      return true;
    },
    enableBeforeUnload: false,
  });

  function updateForm(patch: Partial<ConfigEmpresa>) {
    const next = { ...form, ...patch };
    setForm(next);
    if ("fonteTamanho" in patch || "altoContraste" in patch) {
      applyAcessibilidade(next);
    }
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateForm({ logo: reader.result as string });
    reader.readAsDataURL(file);
  }

  async function salvar() {
    await db.config.put(form);
    setSaved(form);
    setFlashSalvo(true);
    setTimeout(() => setFlashSalvo(false), 1500);
  }

  function cancelar() {
    setForm(saved);
    applyAcessibilidade(saved);
  }

  function toggle(id: SectionId) {
    setOpen((cur) => (cur === id ? null : id));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Sistema · Empresa"
        title="Configurações"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={cancelar}
              disabled={!dirty}
              className="bg-card text-foreground border border-border glass-press px-4 py-2.5 text-xs font-bold uppercase tracking-widest flex items-center gap-2 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <X className="size-4" strokeWidth={3} /> Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={!dirty && !flashSalvo}
              className="glass-brand text-white glass-press px-5 py-2.5 text-xs font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="size-4" strokeWidth={3} /> {flashSalvo ? "Salvo!" : "Salvar"}
            </button>
          </div>
        }
      />

      {dirty && (
        <div className="px-4 lg:px-10 pt-3">
          <div className="text-xs font-bold uppercase tracking-widest text-warning bg-warning/10 border border-warning/30 rounded-xl px-3 py-2 inline-block">
            Alterações não salvas
          </div>
        </div>
      )}

      <div className="px-4 lg:px-10 py-5 max-w-3xl space-y-3">
        <Section
          id="acessibilidade"
          icon={Accessibility}
          title="Acessibilidade"
          open={open === "acessibilidade"}
          onToggle={() => toggle("acessibilidade")}
        >
          <Field label="Tamanho da fonte">
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "pequeno", label: "Pequeno", size: "text-xs" },
                { id: "normal", label: "Normal", size: "text-sm" },
                { id: "grande", label: "Grande", size: "text-base" },
              ].map((t) => {
                const ativo = (form.fonteTamanho ?? "normal") === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => updateForm({ fonteTamanho: t.id as any })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      ativo ? "border-brand bg-brand/10" : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <div className={`font-bold uppercase tracking-widest ${t.size}`}>
                      {t.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </Field>
          <button
            type="button"
            onClick={() => updateForm({ altoContraste: !(form.altoContraste ?? false) })}
            className="w-full flex items-center justify-between pt-3 text-left"
          >
            <div>
              <div className="text-sm font-bold uppercase tracking-widest">Alto contraste</div>
              <p className="text-xs text-muted-foreground mt-1">
                Aumenta legibilidade reduzindo opacidades
              </p>
            </div>
            <span
              aria-hidden
              className={`relative inline-block h-6 w-11 rounded-full transition-colors ${
                form.altoContraste ? "bg-brand" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                  form.altoContraste ? "translate-x-5" : ""
                }`}
              />
            </span>
          </button>
        </Section>

        <Section
          id="empresa"
          icon={Building2}
          title="Dados da Empresa"
          open={open === "empresa"}
          onToggle={() => toggle("empresa")}
        >
          <div className="flex items-start gap-4">
            <label className="size-24 border border-border bg-muted/40 grid place-items-center cursor-pointer overflow-hidden shrink-0 rounded-xl hover:border-brand/40 transition-all">
              {form.logo ? (
                <img src={form.logo} alt="Logo" className="size-full object-contain" />
              ) : (
                <Building2 className="size-8 text-muted-foreground" />
              )}
              <input type="file" accept="image/*" onChange={handleLogo} className="hidden" />
            </label>
            <div className="flex-1 space-y-3">
              <Field label="Nome da empresa">
                <input
                  value={form.nome ?? ""}
                  onChange={(e) => updateForm({ nome: e.target.value })}
                  className="w-full"
                />
              </Field>
              <Field label="CNPJ / CPF">
                <input
                  value={form.documento ?? ""}
                  onChange={(e) => updateForm({ documento: e.target.value })}
                  className="w-full"
                />
              </Field>
            </div>
          </div>
        </Section>

        <Section
          id="contato"
          icon={Phone}
          title="Contato"
          open={open === "contato"}
          onToggle={() => toggle("contato")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Telefone">
              <input
                value={form.telefone ?? ""}
                onChange={(e) => updateForm({ telefone: e.target.value })}
                inputMode="tel"
                className="w-full"
              />
            </Field>
            <Field label="E-mail">
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => updateForm({ email: e.target.value })}
                className="w-full"
              />
            </Field>
          </div>
          <Field label="Endereço">
            <textarea
              rows={2}
              value={form.endereco ?? ""}
              onChange={(e) => updateForm({ endereco: e.target.value })}
              className="w-full resize-none"
            />
          </Field>
        </Section>

        <Section
          id="whats"
          icon={MessageCircle}
          title="Mensagem WhatsApp"
          open={open === "whats"}
          onToggle={() => toggle("whats")}
        >
          <Field label="Texto enviado junto com o orçamento">
            <textarea
              rows={3}
              value={form.mensagemPadraoWhats ?? ""}
              onChange={(e) => updateForm({ mensagemPadraoWhats: e.target.value })}
              className="w-full resize-none"
            />
          </Field>
        </Section>

        <Section
          id="assinatura"
          icon={PenLine}
          title="Assinatura"
          open={open === "assinatura"}
          onToggle={() => toggle("assinatura")}
        >
          <Field label="Texto de assinatura no PDF">
            <textarea
              rows={2}
              value={form.assinatura ?? ""}
              onChange={(e) => updateForm({ assinatura: e.target.value })}
              className="w-full resize-none"
            />
          </Field>
        </Section>
      </div>
    </div>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  icon: typeof Building2;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="glass overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`sec-${id}`}
        className="w-full flex items-center gap-3 px-5 py-4 active:scale-[0.99] transition text-left"
      >
        <span className="size-9 rounded-xl bg-muted grid place-items-center shrink-0">
          <Icon className="size-5 text-foreground" strokeWidth={2} />
        </span>
        <span className="flex-1 text-display text-base text-foreground">{title}</span>
        <ChevronDown
          className={`size-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2.5}
        />
      </button>
      {open && (
        <div id={`sec-${id}`} className="px-5 pb-5 pt-1 space-y-4 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}
