import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

function ConfigPage() {
  const [form, setForm] = useState<ConfigEmpresa>({
    id: 1,
    servicosPadrao: SERVICOS_PADRAO,
    formasPagamento: FORMAS_PAGAMENTO,
    ambientesPadrao: AMBIENTES_PADRAO,
    mensagemPadraoWhats:
      "Olá! Segue o orçamento solicitado. Qualquer dúvida estou à disposição.",
  });
  const [salvo, setSalvo] = useState(false);
  const [open, setOpen] = useState<SectionId | null>("acessibilidade");

  useEffect(() => {
    db.config.get(1).then((c) => c && setForm({ ...form, ...c }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, logo: reader.result as string });
    reader.readAsDataURL(file);
  }

  async function salvar() {
    await db.config.put(form);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
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
          <button
            onClick={salvar}
            className="glass-brand text-white glass-press px-5 py-2.5 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          >
            <Save className="size-4" strokeWidth={3} /> {salvo ? "Salvo!" : "Salvar"}
          </button>
        }
      />

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
                    onClick={() => setForm({ ...form, fonteTamanho: t.id as any })}
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
          <label className="flex items-center justify-between cursor-pointer pt-3">
            <div>
              <div className="text-sm font-bold uppercase tracking-widest">Alto contraste</div>
              <p className="text-xs text-muted-foreground mt-1">
                Aumenta legibilidade reduzindo opacidades
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.altoContraste ?? false}
              onChange={(e) => setForm({ ...form, altoContraste: e.target.checked })}
              className="size-5 accent-brand"
            />
          </label>
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
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full"
                />
              </Field>
              <Field label="CNPJ / CPF">
                <input
                  value={form.documento ?? ""}
                  onChange={(e) => setForm({ ...form, documento: e.target.value })}
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
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                inputMode="tel"
                className="w-full"
              />
            </Field>
            <Field label="E-mail">
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full"
              />
            </Field>
          </div>
          <Field label="Endereço">
            <textarea
              rows={2}
              value={form.endereco ?? ""}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
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
              onChange={(e) => setForm({ ...form, mensagemPadraoWhats: e.target.value })}
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
              onChange={(e) => setForm({ ...form, assinatura: e.target.value })}
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
