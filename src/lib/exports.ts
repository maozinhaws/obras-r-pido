// Exports: VCF (vCard 3.0), ICS (iCalendar), Google Calendar link
import type { Cliente, EventoAgenda } from "@/lib/db";

function escVCF(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
}

function dl(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

function safeName(s: string, fallback = "arquivo") {
  return (s.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || fallback).slice(0, 80);
}

export function exportarVCF(c: Cliente) {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escVCF(c.nome)}`,
    `N:${escVCF(c.nome)};;;;`,
    c.telefone ? `TEL;TYPE=CELL:${escVCF(c.telefone)}` : "",
    c.email ? `EMAIL:${escVCF(c.email)}` : "",
    c.endereco ? `ADR:;;${escVCF(c.endereco)};;;;` : "",
    c.documento ? `NOTE:Doc: ${escVCF(c.documento)}` : "",
    "END:VCARD",
  ].filter(Boolean);
  dl(new Blob([lines.join("\r\n")], { type: "text/vcard" }), `${safeName(c.nome, "contato")}.vcf`);
}

function fmtICSDate(date: string, time: string): string {
  return `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
}

export function buildICS(e: EventoAgenda): string {
  const start = fmtICSDate(e.data, e.hora ?? "08:00");
  const endHora = e.hora ? addOneHour(e.hora) : "09:00";
  const end = fmtICSDate(e.data, endHora);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pintor Plus//PT-BR",
    "BEGIN:VEVENT",
    `UID:pintor-${e.id ?? Date.now()}@pintorplus`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15)}Z`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escVCF(e.titulo)}`,
    `DESCRIPTION:${escVCF(e.observacao ?? "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function addOneHour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h * 60 + m + 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function exportarICS(e: EventoAgenda) {
  dl(new Blob([buildICS(e)], { type: "text/calendar" }), `${safeName(e.titulo, "evento")}.ics`);
}

export function googleCalendarLink(e: EventoAgenda): string {
  const start = fmtICSDate(e.data, e.hora ?? "08:00");
  const end = fmtICSDate(e.data, e.hora ? addOneHour(e.hora) : "09:00");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.titulo,
    dates: `${start}/${end}`,
    details: e.observacao ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
