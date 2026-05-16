import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db, type ConfigEmpresa, SERVICOS_PADRAO, FORMAS_PAGAMENTO, AMBIENTES_PADRAO } from "@/lib/db";
import { PageHeader } from "@/components/app-shell";
import { Field } from "./clientes";
import { Save, Building2 } from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Pintor Plus" },
      { name: "description", content: "Dados da empresa, mensagens padrão e preferências do app." },
    ],
  }),
  component: ConfigPage,
});

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

      <div className="px-5 lg:px-10 py-6 max-w-3xl space-y-6">
        <Card titulo="Aparência">
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "moderno", label: "Moderno", desc: "Glass & Cores" },
              { id: "brutalista", label: "Brutalista", desc: "Sólido & Direto" },
              { id: "minimalista", label: "Minimalista", desc: "Contraste Alto" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setForm({ ...form, tema: t.id as any })}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  form.tema === t.id || (!form.tema && t.id === "moderno")
                    ? "border-brand bg-brand/10"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="font-bold text-xs uppercase tracking-widest mb-1">{t.label}</div>
                <div className="text-[10px] opacity-50">{t.desc}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card titulo="Empresa">
          <div className="flex items-start gap-4">
            <label className="size-24 glass border-white/20 bg-white/5 grid place-items-center cursor-pointer overflow-hidden shrink-0 rounded-xl hover:border-brand/40 transition-all">
              {form.logo ? (
                <img src={form.logo} alt="Logo" className="size-full object-contain" />
              ) : (
                <Building2 className="size-8 text-foreground/30" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogo}
                className="hidden"
              />
            </label>
            <div className="flex-1 space-y-3">
              <Field label="Nome da empresa">
                <input
                  value={form.nome ?? ""}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
                />
              </Field>
              <Field label="CNPJ / CPF">
                <input
                  value={form.documento ?? ""}
                  onChange={(e) => setForm({ ...form, documento: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
                />
              </Field>
            </div>
          </div>
        </Card>

        <Card titulo="Contato">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Telefone">
              <input
                value={form.telefone ?? ""}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                inputMode="tel"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
              />
            </Field>
            <Field label="E-mail">
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all"
              />
            </Field>
          </div>
          <Field label="Endereço">
            <textarea
              rows={2}
              value={form.endereco ?? ""}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all resize-none"
            />
          </Field>
        </Card>

        <Card titulo="Mensagem padrão WhatsApp">
          <Field label="Texto enviado junto com o orçamento">
            <textarea
              rows={3}
              value={form.mensagemPadraoWhats ?? ""}
              onChange={(e) =>
                setForm({ ...form, mensagemPadraoWhats: e.target.value })
              }
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all resize-none"
            />
          </Field>
        </Card>

        <Card titulo="Assinatura">
          <Field label="Texto de assinatura no PDF">
            <textarea
              rows={2}
              value={form.assinatura ?? ""}
              onChange={(e) => setForm({ ...form, assinatura: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand focus:bg-white/10 transition-all resize-none"
            />
          </Field>
        </Card>
      </div>
    </div>
  );
}

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="glass p-6 space-y-4">
      <div className="text-mono text-[10px] uppercase tracking-widest text-brand">
        {`> ${titulo}`}
      </div>
      {children}
    </div>
  );
}
