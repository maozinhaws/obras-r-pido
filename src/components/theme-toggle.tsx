import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Mode = "claro" | "escuro";
const KEY = "pp.theme";

function applyTheme(mode: Mode) {
  const root = document.documentElement;
  if (mode === "escuro") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("claro");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = (window.localStorage.getItem(KEY) as Mode | null) ?? "claro";
    setMode(saved);
    applyTheme(saved);
  }, []);

  const toggle = () => {
    const next: Mode = mode === "claro" ? "escuro" : "claro";
    setMode(next);
    applyTheme(next);
    window.localStorage.setItem(KEY, next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={mode === "claro" ? "Ativar modo escuro" : "Ativar modo claro"}
      className="fixed top-5 right-5 z-50 size-11 rounded-[18px] grid place-items-center glass-press"
      style={{
        background: "var(--card-solid)",
        backdropFilter: "blur(28px) saturate(170%)",
        WebkitBackdropFilter: "blur(28px) saturate(170%)",
        border: "1px solid var(--card-border-strong)",
        boxShadow: "0 6px 18px -6px rgba(15,5,40,0.18)",
        color: "var(--on-hero)",
      }}
    >
      {mode === "claro" ? (
        <Moon className="size-5" strokeWidth={2.25} />
      ) : (
        <Sun className="size-5" strokeWidth={2.25} />
      )}
    </button>
  );
}
