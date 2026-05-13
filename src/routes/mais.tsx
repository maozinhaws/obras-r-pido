import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Truck, Database, Settings, FileSignature } from "lucide-react";

export const Route = createFileRoute("/mais")({
  head: () => ({
    meta: [{ title: "Mais — Pintor Plus" }],
  }),
  component: MaisPage,
});

const ITENS = [
  { to: "/fornecedores", label: "Fornecedores", icon: Truck },
  { to: "/backup", label: "Backup", icon: Database },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/termos", label: "Termos de Uso", icon: FileSignature },
] as const;

function MaisPage() {
  return (
    <div>
      <PageHeader eyebrow="Sistema" title="Mais" />
      <div className="px-5 lg:px-10 py-6 grid grid-cols-2 gap-3">
        {ITENS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="bg-surface brutal-border p-5 brutal-press flex flex-col gap-3"
          >
            <Icon className="size-7 text-brand" strokeWidth={2.5} />
            <span className="text-display text-sm leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
