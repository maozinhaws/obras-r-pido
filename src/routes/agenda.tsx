import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type EventoAgenda } from "@/lib/db";
import { PageHeader } from "@/components/app-shell";
import { Field } from "./clientes";
import { Plus, X, Trash2, Calendar as CalIcon, Download } from "lucide-react";
import { format, isToday, isFuture, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Pintor Plus" },
      { name: "description", content: "Calendário de obras, visitas e compromissos." },
    ],
  }),
  component: AgendaPage,
});

function AgendaPage() {
  const [criando, setCriando] = useState(false);
  const eventos = useLiveQuery(() => db.eventos.orderBy("data").toArray(), [], []);
  const hoje = (eventos ?? []).filter((e) => isToday(parseISO(e.data)));
  const proximos = (eventos ?? []).filter(
    (e) => isFuture(parseISO(e.data)) && !isToday(parseISO(e.data)),
  );
  const passados = (eventos ?? []).filter(
    (e) => !isToday(parseISO(e.data)) && !isFuture(parseISO(e.data)),
  );

  return (
    <div>
      <PageHeader
        eyebrow={`Calendário · ${eventos?.length ?? 0} eventos`}
        title="Agenda"
        actions={
          <button
            onClick={() => setCriando(true)}
            className="bg-brand text-ink brutal-border-thin brutal-shadow-sm brutal-press px-4 py-2.5 text-xs font-black uppercase tracking-widest flex items-center gap-2"
          >
            <Plus className="size-4" strokeWidth={3} /> Novo
          </button>
        }
      />
      <div className="px-5 lg:px-10 py-6 space-y-8">
        <Section titulo="Hoje" eventos={hoje} destaque />
        <Section titulo="Próximos" eventos={proximos} />
        <Section titulo="Passados" eventos={passados} dim />
      </div>
      {criando && <EventoForm onClose={() => setCriando(false)} />}
    </div>
  );
}

function Section({
  titulo,
  eventos,
  destaque,
  dim,
}: {
  titulo: string;
  eventos: EventoAgenda[];
  destaque?: boolean;
  dim?: boolean;
}) {
  if (eventos.length === 0) return null;
  return (
    <section>
      <h2
        className={`text-mono text-[10px] font-bold uppercase tracking-widest mb-3 ${destaque ? "text-brand" : "text-foreground/40"}`}
      >
        {`> ${titulo} (${eventos.length})`}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {eventos.map((e) => (
          <EventoCard key={e.id} evento={e} destaque={destaque} dim={dim} />
        ))}
      </div>
    </section>
  );
}

function EventoCard({
  evento,
  destaque,
  dim,
}: {
  evento: EventoAgenda;
  destaque?: boolean;
  dim?: boolean;
}) {
  const dt = parseISO(evento.data);
  return (
    <div
      className={`brutal-border p-5 flex gap-4 ${destaque ? "bg-brand text-ink" : "bg-surface"} ${dim ? "opacity-50" : ""}`}
    >
      <div className="text-center shrink-0 brutal-border-thin px-3 py-2 self-start">
        <div className="text-[10px] font-black uppercase">
          {format(dt, "MMM", { locale: ptBR })}
        </div>
        <div className="text-display text-3xl leading-none">{format(dt, "dd")}</div>
        {evento.hora && (
          <div className="text-mono text-[10px] mt-1">{evento.hora}</div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <h3 className="text-display text-lg italic leading-tight">{evento.titulo}</h3>
        {evento.observacao && (
          <p className={`text-xs ${destaque ? "text-ink/70" : "text-foreground/60"}`}>
            {evento.observacao}
          </p>
        )}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => baixarICS(evento)}
            className="brutal-border-thin px-2 py-1 text-[10px] font-black uppercase brutal-press flex items-center gap-1"
          >
            <Download className="size-3" /> .ics
          </button>
          <button
            onClick={() => confirm("Excluir evento?") && db.eventos.delete(evento.id!)}
            className="brutal-border-thin px-2 py-1 text-[10px] font-black uppercase brutal-press text-destructive"
            aria-label="Excluir"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function baixarICS(e: EventoAgenda) {
  const dt = e.data.replace(/-/g, "") + "T" + (e.hora ?? "08:00").replace(":", "") + "00";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pintor Plus//PT-BR",
    "BEGIN:VEVENT",
    `UID:pintor-${e.id}@pintorplus`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15)}Z`,
    `DTSTART:${dt}`,
    `DTEND:${dt}`,
    `SUMMARY:${e.titulo}`,
    `DESCRIPTION:${e.observacao ?? ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${e.titulo.replace(/\s+/g, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function EventoForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<EventoAgenda>({
    titulo: "",
    data: new Date().toISOString().slice(0, 10),
    hora: "08:00",
    criadoEm: Date.now(),
  });
  async function salvar() {
    if (!form.titulo.trim()) return;
    await db.eventos.add(form);
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 bg-midnight/90 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-surface w-full max-w-lg brutal-border md:brutal-shadow">
        <div className="bg-ink p-4 flex items-center justify-between">
          <h3 className="text-display text-lg flex items-center gap-2">
            <CalIcon className="size-5" /> Novo Evento
          </h3>
          <button onClick={onClose} className="text-brand" aria-label="Fechar">
            <X className="size-6" strokeWidth={3} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Título *">
            <input
              autoFocus
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full bg-midnight brutal-border-thin px-3 py-3 focus:outline-none focus:border-brand"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="w-full bg-midnight brutal-border-thin px-3 py-3 focus:outline-none focus:border-brand"
              />
            </Field>
            <Field label="Hora">
              <input
                type="time"
                value={form.hora ?? ""}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
                className="w-full bg-midnight brutal-border-thin px-3 py-3 focus:outline-none focus:border-brand"
              />
            </Field>
          </div>
          <Field label="Observação">
            <textarea
              value={form.observacao ?? ""}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              rows={3}
              className="w-full bg-midnight brutal-border-thin px-3 py-3 focus:outline-none focus:border-brand resize-none"
            />
          </Field>
        </div>
        <div className="p-5 flex gap-3 border-t-4 border-ink">
          <button
            onClick={onClose}
            className="flex-1 brutal-border-thin px-4 py-3 text-xs font-black uppercase tracking-widest brutal-press"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            className="flex-[2] bg-brand text-ink brutal-border-thin brutal-shadow-sm brutal-press px-4 py-3 text-xs font-black uppercase tracking-widest"
          >
            Salvar Evento
          </button>
        </div>
      </div>
    </div>
  );
}
