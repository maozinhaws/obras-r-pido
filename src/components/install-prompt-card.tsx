import { useEffect, useState } from "react";
import { Zap, Download, Check } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pp.install.dismissed";
const SESSION_KEY = "pp.install.snooze";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as any).standalone === true
  );
}

export function InstallPromptCard() {
  const [visible, setVisible] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    if (window.sessionStorage.getItem(SESSION_KEY) === "1") return;
    setVisible(true);

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const persistDismiss = () => {
    if (dontShow) window.localStorage.setItem(DISMISS_KEY, "1");
    else window.sessionStorage.setItem(SESSION_KEY, "1");
  };

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => {});
      setDeferred(null);
      setVisible(false);
      return;
    }
    // Fallback (iOS / browsers sem prompt): apenas instrui e dispensa sessão
    window.sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
    alert("Para instalar, abra o menu do navegador e escolha 'Adicionar à tela inicial'.");
  };

  const handleLater = () => {
    persistDismiss();
    setVisible(false);
  };

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #ff6b35 0%, #ff5a8a 55%, #7b5cff 100%)",
        borderRadius: "24px",
        padding: 18,
        color: "#fff",
        boxShadow: "0 12px 32px -8px rgba(123,92,255,0.35)",
        isolation: "isolate",
      }}
    >
      {/* Decor blobs */}
      <span
        aria-hidden
        className="absolute -top-10 -right-8 size-40 rounded-full pointer-events-none"
        style={{ background: "rgba(255,255,255,0.10)", filter: "blur(2px)" }}
      />

      <span
        className="relative z-10 inline-flex items-center gap-1.5 font-extrabold uppercase"
        style={{
          background: "rgba(0,0,0,0.18)",
          border: "1px solid rgba(255,255,255,0.25)",
          color: "#fff",
          padding: "5px 11px",
          borderRadius: 999,
          fontFamily: "'Sora', sans-serif",
          fontSize: 10,
          letterSpacing: "0.14em",
        }}
      >
        <Zap className="size-3" strokeWidth={3} fill="currentColor" />
        Atalho rápido
      </span>

      <h3
        className="relative z-10 mt-3 text-display"
        style={{ fontSize: 22, lineHeight: 1.05, letterSpacing: "-0.02em" }}
      >
        Instale o Pintor Plus
      </h3>
      <p
        className="relative z-10 mt-1.5 text-[13px] leading-snug"
        style={{ color: "rgba(255,255,255,0.92)" }}
      >
        Acesso instantâneo, notificações de agenda e funciona mesmo sem internet.
      </p>

      <div className="relative z-10 mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] font-semibold">
        <Feature label="Offline" />
        <Feature label="Notificações" />
        <Feature label="Atalhos rápidos" />
      </div>

      <div className="relative z-10 mt-4 flex gap-2">
        <button
          onClick={handleInstall}
          className="flex-1 inline-flex items-center justify-center gap-2 font-extrabold uppercase tracking-wide active:scale-[0.98] transition"
          style={{
            background: "#fff",
            color: "#ff6b35",
            borderRadius: 14,
            padding: "12px 14px",
            fontSize: 13,
            boxShadow: "0 6px 16px -4px rgba(0,0,0,0.25)",
          }}
        >
          <Download className="size-4" strokeWidth={2.5} />
          Instalar Agora
        </button>
        <button
          onClick={handleLater}
          className="font-extrabold uppercase tracking-wide active:scale-[0.98] transition"
          style={{
            background: "rgba(0,0,0,0.18)",
            border: "1px solid rgba(255,255,255,0.25)",
            color: "#fff",
            borderRadius: 14,
            padding: "12px 14px",
            fontSize: 13,
          }}
        >
          Agora não
        </button>
      </div>

      {/* Checkbox "não mostrar novamente" */}
      <label
        className="relative z-10 mt-3 flex items-center gap-2.5 cursor-pointer select-none"
        style={{ color: "rgba(255,255,255,0.92)" }}
      >
        <span
          className="grid place-items-center shrink-0 transition"
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            background: dontShow ? "#fff" : "rgba(0,0,0,0.18)",
            border: "1.5px solid rgba(255,255,255,0.55)",
          }}
        >
          {dontShow && (
            <Check className="size-3.5" style={{ color: "#ff6b35" }} strokeWidth={3.5} />
          )}
        </span>
        <input
          type="checkbox"
          checked={dontShow}
          onChange={(e) => setDontShow(e.target.checked)}
          className="sr-only"
        />
        <span className="text-[12px] font-semibold">Não mostrar novamente</span>
      </label>
    </div>
  );
}

function Feature({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Check className="size-3.5" strokeWidth={3} />
      {label}
    </span>
  );
}
