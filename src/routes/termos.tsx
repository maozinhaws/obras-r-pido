import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos — Pintor Plus" },
      { name: "description", content: "Termos de uso e privacidade do app Pintor Plus." },
    ],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-hero)" }}>
      <PageHeader eyebrow="Legal · Privacidade" title="Termos de Uso" />
      <div className="px-5 lg:px-10 pb-10 max-w-3xl mx-auto space-y-4">
        <Block titulo="1. Sobre o app">
          Pintor Plus é um aplicativo offline para organização do trabalho do pintor:
          orçamentos, clientes, fornecedores, agenda e recibos. Os dados ficam
          armazenados no próprio dispositivo.
        </Block>
        <Block titulo="2. Dados e privacidade">
          Não enviamos seus dados para servidores. O backup em Google Drive,
          quando ativado por você, salva um arquivo na sua própria conta — em uma
          pasta privada do app (não aparece no seu Drive principal).
        </Block>
        <Block titulo="3. Recibo">
          O recibo gerado pelo app <strong>não é nota fiscal</strong>. É um
          comprovante de recebimento entre você e o cliente.
        </Block>
        <Block titulo="4. Instalar como app">
          No Android, abra o site no Chrome e toque em "Instalar app". No iPhone,
          use o Safari → Compartilhar → "Adicionar à Tela de Início". Versão
          empacotada para Play Store estará disponível em breve.
        </Block>
        <Block titulo="5. Suporte">
          Faça backup manual com frequência. O app é gratuito e fornecido "como
          está", sem garantia de funcionamento contínuo.
        </Block>
      </div>
    </div>
  );
}

function Block({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--card-solid)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid var(--card-border-strong)",
        borderRadius: 24,
        padding: 20,
        boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        color: "var(--on-hero)",
      }}
    >
      <h2
        className="text-display text-lg mb-2"
        style={{ color: "var(--on-hero)" }}
      >
        {titulo}
      </h2>
      <div
        className="text-sm leading-relaxed"
        style={{ color: "var(--on-hero-muted)" }}
      >
        {children}
      </div>
    </div>
  );
}
