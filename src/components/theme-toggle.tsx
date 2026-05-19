import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Mode = "claro" | "escuro";
const KEY = "pp.theme";

function applyTheme(mode: Mode) {
  const root = document.documentElement;
  if (mode === "escuro") root.setAttribute("data-theme", "escuro");
  else root.removeAttribute("data-theme");
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
      className="fixed top-3 right-3 z-50 size-11 bg-card text-foreground rounded-2xl grid place-items-center shadow-[0_4px_14px_rgba(0,0,0,0.08)] border border-border glass-press"
    >
      {mode === "claro" ? (
        <Moon className="size-5" strokeWidth={2.25} />
      ) : (
        <Sun className="size-5" strokeWidth={2.25} />
      )}
    </button>
  );
}
