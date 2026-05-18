import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app-shell";
import { Download, Upload, Database, Cloud, AlertTriangle } from "lucide-react";
import { baixarBlob } from "@/lib/pdf";

export const Route = createFileRoute("/backup")({
  head: () => ({
    meta: [
      { title: "Backup — Pintor Plus" },
      { name: "description", content: "Exportar e restaurar dados do app." },
    ],
  }),
  component: BackupPage,
});

function BackupPage() {
  const [msg, setMsg] = useState("");
  const counts = {
    clientes: useLiveQuery(() => db.clientes.count(), [], 0),
    fornecedores: useLiveQuery(() => db.fornecedores.count(), [], 0),
    orcamentos: useLiveQuery(() => db.orcamentos.count(), [], 0),
    eventos: useLiveQuery(() => db.eventos.count(), [], 0),
    fotos: useLiveQuery(() => db.fotos.count(), [], 0),
  };

  async function exportar() {
    const blobToB64 = (b: Blob) =>
      new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(",")[1]);
        r.readAsDataURL(b);
      });
    const fotos = await db.fotos.toArray();
    const dump = {
      versao: 1,
      exportadoEm: new Date().toISOString(),
      clientes: await db.clientes.toArray(),
      fornecedores: await db.fornecedores.toArray(),
      orcamentos: await db.orcamentos.toArray(),
      eventos: await db.eventos.toArray(),
      recibos: await db.recibos.toArray(),
      config: await db.config.toArray(),
      fotos: await Promise.all(
        fotos.map(async (f) => ({
          id: f.id,
          criadoEm: f.criadoEm,
          dataB64: await blobToB64(f.blob),
        })),
      ),
    };
    const blob = new Blob([JSON.stringify(dump)], { type: "application/json" });
    baixarBlob(blob, `pintor-plus-backup-${new Date().toISOString().slice(0, 10)}.json`);
    setMsg("Backup exportado!");
  }

  async function importar(file: File) {
    if (!confirm("Isso vai substituir os dados atuais. Continuar?")) return;
    try {
      const text = await file.text();
      let dump: any;
      try {
        dump = JSON.parse(text);
      } catch {
        setMsg("Arquivo inválido: não é um JSON válido.");
        return;
      }
      if (!dump || typeof dump !== "object") {
        setMsg("Arquivo de backup inválido.");
        return;
      }
      if (dump.versao !== 1) {
        setMsg("Versão de backup não suportada.");
        return;
      }
      const isArr = (v: unknown): v is any[] => Array.isArray(v);
      await db.transaction(
        "rw",
        [db.clientes, db.fornecedores, db.orcamentos, db.eventos, db.recibos, db.config, db.fotos],
        async () => {
          await Promise.all([
            db.clientes.clear(),
            db.fornecedores.clear(),
            db.orcamentos.clear(),
            db.eventos.clear(),
            db.recibos.clear(),
            db.config.clear(),
            db.fotos.clear(),
          ]);
          if (isArr(dump.clientes)) await db.clientes.bulkAdd(dump.clientes);
          if (isArr(dump.fornecedores)) await db.fornecedores.bulkAdd(dump.fornecedores);
          if (isArr(dump.orcamentos)) await db.orcamentos.bulkAdd(dump.orcamentos);
          if (isArr(dump.eventos)) await db.eventos.bulkAdd(dump.eventos);
          if (isArr(dump.recibos)) await db.recibos.bulkAdd(dump.recibos);
          if (isArr(dump.config)) await db.config.bulkAdd(dump.config);
          if (isArr(dump.fotos)) {
            for (const f of dump.fotos) {
              if (!f || typeof f.id !== "string" || typeof f.dataB64 !== "string") continue;
              try {
                const bin = atob(f.dataB64);
                const arr = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
                await db.fotos.put({
                  id: f.id,
                  criadoEm: typeof f.criadoEm === "number" ? f.criadoEm : Date.now(),
                  blob: new Blob([arr], { type: "image/jpeg" }),
                });
              } catch {
                // skip invalid photo entry
              }
            }
          }
        },
      );
      setMsg("Backup restaurado!");
    } catch (err) {
      console.error(err);
      setMsg("Falha ao restaurar backup.");
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Sistema · Dados" title="Backup" />
      <div className="px-5 lg:px-10 py-6 max-w-3xl space-y-4">
        <div className="glass p-6">
          <div className="flex items-center gap-2 text-mono text-[10px] uppercase text-brand mb-3">
            <Database className="size-3" /> {"> Dados no dispositivo"}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {Object.entries(counts).map(([k, v]) => (
              <div key={k} className="glass border-white/10 bg-white/5 p-4 text-center">
                <div className="text-display text-3xl italic">{v}</div>
                <div className="text-[10px] font-black uppercase text-foreground/50">{k}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <button
            onClick={exportar}
            className="glass-brand glass-press p-6 text-left group overflow-hidden relative"
          >
            <Download className="size-7 mb-3" strokeWidth={2.5} />
            <div className="text-display text-xl">Exportar Backup</div>
            <div className="text-[10px] font-mono uppercase opacity-70 mt-1">
              Baixa arquivo .json com tudo
            </div>
          </button>

          <label className="glass glass-press p-6 cursor-pointer group">
            <Upload className="size-7 mb-3 text-brand" strokeWidth={2.5} />
            <div className="text-display text-xl">Importar Backup</div>
            <div className="text-[10px] font-mono uppercase opacity-50 mt-1">
              Substitui os dados atuais
            </div>
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])}
            />
          </label>
        </div>

        <div className="glass p-6 opacity-60">
          <div className="flex items-center gap-2 text-mono text-[10px] uppercase text-brand mb-2">
            <Cloud className="size-3" /> {"> Google Drive"}
          </div>
          <p className="text-sm text-foreground/70 mb-2">
            Backup automático no seu Google Drive (pasta privada do app).
          </p>
          <button
            disabled
            className="glass px-5 py-3 text-xs font-bold uppercase tracking-widest"
          >
            Conectar (em breve)
          </button>
        </div>

        <div className="glass border-warning/20 p-5 flex gap-4 items-start">
          <AlertTriangle className="size-5 text-warning shrink-0" />
          <p className="text-xs text-foreground/70">
            Faça backup com frequência. Se você desinstalar o app ou limpar os dados do
            navegador, tudo é perdido sem um backup.
          </p>
        </div>

        {msg && (
          <div className="bg-success text-ink brutal-border-thin px-4 py-3 text-xs font-black uppercase tracking-widest">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
