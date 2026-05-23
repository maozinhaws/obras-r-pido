import { useEffect, useState } from "react";
import { ShieldCheck, Check } from "lucide-react";

const KEY = "pp.terms.accepted.v1";

export function TermsGate() {
  const [needsAccept, setNeedsAccept] = useState(false);
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(KEY) !== "1") setNeedsAccept(true);
  }, []);

  if (!needsAccept) return null;

  const accept = () => {
    window.localStorage.setItem(KEY, "1");
    setNeedsAccept(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4"
      style={{
        background: "color-mix(in oklab, var(--bg-hero) 88%, black)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
    >
      <div
        className="w-full max-w-md max-h-[88dvh] overflow-hidden flex flex-col"
        style={{
          background: "var(--card-solid)",
          backdropFilter: "blur(28px) saturate(170%)",
          WebkitBackdropFilter: "blur(28px) saturate(170%)",
          border: "1px solid var(--card-border-strong)",
          borderRadius: 28,
          boxShadow: "0 24px 64px -16px rgba(15,5,40,0.45)",
          color: "var(--on-hero)",
        }}
      >
        <div className="p-5 flex items-center gap-3 border-b" style={{ borderColor: "var(--card-border-strong)" }}>
          <div
            className="size-11 rounded-2xl grid place-items-center text-white shrink-0"
            style={{ background: "linear-gradient(135deg,#ff6b35,#7b5cff)" }}
          >
            <ShieldCheck className="size-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--brand-2)" }}>
              Bem-vindo
            </p>
            <h2 id="terms-title" className="text-display text-lg leading-tight" style={{ color: "var(--on-hero)" }}>
              Termos de Uso
            </h2>
          </div>
        </div>

        <div
          className="px-5 py-4 overflow-y-auto space-y-3 text-sm leading-relaxed"
          style={{ color: "var(--on-hero-muted)" }}
        >
          <Item title="1. Sobre o app">
            Pintor Plus é um app offline para orçamentos, clientes, fornecedores,
            agenda e recibos. Os dados ficam no próprio dispositivo.
          </Item>
          <Item title="2. Dados e privacidade">
            Não enviamos seus dados para servidores. Backup opcional no seu Google
            Drive, em pasta privada do app.
          </Item>
          <Item title="3. Recibo">
            O recibo gerado <strong>não é nota fiscal</strong>: é comprovante de
            recebimento entre você e o cliente.
          </Item>
          <Item title="4. Suporte">
            Faça backup manual com frequência. O app é gratuito e fornecido "como
            está", sem garantia de funcionamento contínuo.
          </Item>
        </div>

        <div className="p-5 border-t space-y-3" style={{ borderColor: "var(--card-border-strong)" }}>
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <span
              className="grid place-items-center shrink-0 mt-0.5 transition"
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: agree ? "#ff6b35" : "transparent",
                border: `2px solid ${agree ? "#ff6b35" : "var(--card-border-strong)"}`,
              }}
            >
              {agree && <Check className="size-3.5 text-white" strokeWidth={3.5} />}
            </span>
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="sr-only"
            />
            <span className="text-[13px] font-semibold" style={{ color: "var(--on-hero)" }}>
              Li e aceito os Termos de Uso e a Política de Privacidade.
            </span>
          </label>
          <button
            onClick={accept}
            disabled={!agree}
            className="w-full font-extrabold uppercase tracking-wide transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg,#ff6b35,#7b5cff)",
              color: "#fff",
              borderRadius: 16,
              padding: "14px 16px",
              fontSize: 14,
              boxShadow: "0 10px 24px -8px rgba(255,107,53,0.45)",
            }}
          >
            Aceitar e continuar
          </button>
        </div>
      </div>
    </div>
  );
}

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-bold text-[12px] uppercase tracking-wider mb-0.5" style={{ color: "var(--on-hero)" }}>
        {title}
      </p>
      <p>{children}</p>
    </div>
  );
}
