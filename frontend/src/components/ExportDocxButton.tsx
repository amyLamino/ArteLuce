/* /frontend/src/components/ExportDocxButton.tsx */
"use client";

import { useState } from "react";

type Props = {
  eventoId: number | string;
  mode?: "open" | "download";
  filename?: string;
  className?: string;
  children?: React.ReactNode;
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function ExportDocxButton({
  eventoId,
  mode = "open",
  filename,
  className = "px-3 py-2 border rounded-none",
  children,
}: Props) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    const url = `${API}/eventi/${eventoId}/docx/`;

    if (mode === "open") {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      setBusy(true);
      // ❗ Si pas de session/cookie requis côté backend, enlève { credentials: "include" }
      const res = await fetch(url /* , { credentials: "include" } */);
      if (!res.ok) {
        const txt = await res.text();
        alert(`Export DOCX non riuscito (${res.status}).\n${txt}`);
        return;
      }
      const blob = await res.blob();
      const tmpUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = tmpUrl;
      a.download = filename || `Preventivo_${String(eventoId)}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(tmpUrl);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={className} onClick={handleClick} disabled={busy}>
      {children ?? (busy ? "Esportazione…" : "Esporta DOCX")}
    </button>
  );
}
