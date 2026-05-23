import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Pintor Plus" }],
  }),
  component: RedirectToApp,
});

function RedirectToApp() {
  useEffect(() => {
    window.location.replace("/pintor/index.html");
  }, []);
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#f4f4f6",
        fontFamily: "Manrope, system-ui, sans-serif",
        color: "#111",
      }}
    >
      <p>Abrindo Pintor Plus…</p>
    </div>
  );
}
