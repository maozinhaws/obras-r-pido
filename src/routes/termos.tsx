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
    <div>
      <PageHeader eyebrow="Legal · Privacidade" title="Termos de Uso" />
      <div className="px-5 lg:px-10 py-6 max-w-3xl space-y-6 text-sm leading-relaxed text-foreground/80">
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
    <div className="bg-surface brutal-border p-5">
      <h2 className="text-display text-lg italic mb-2">{titulo}</h2>
      <div>{children}</div>
    </div>
  );
}
