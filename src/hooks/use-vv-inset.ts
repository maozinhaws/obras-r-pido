import { useEffect } from "react";

/**
 * Acompanha o VisualViewport para escrever `--kb-inset` no <html>
 * com a altura do teclado virtual (Android/iOS). Permite que footers
 * fixos subam acima do teclado e desçam novamente quando ele fecha,
 * mesmo quando o teclado é recolhido por gesto (sem blur).
 */
export function useVisualViewportInset() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--kb-inset", `${Math.round(inset)}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      document.documentElement.style.setProperty("--kb-inset", "0px");
    };
  }, []);
}
