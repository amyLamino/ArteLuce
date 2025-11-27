/* /frontend/src/components/NewOffertaFromCalendar.tsx */
"use client";
import { useState } from "react";
import { api } from "@/lib/api";

export default function NewOffertaFromCalendar({ dateISO }:{dateISO:string}) {
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    setBusy(true);
    try {
      const slotRes = await api.get(`/eventi/next-slot?date=${dateISO}`);
      const slot = slotRes.data?.slot ?? 1;
      const res = await api.post("/eventi", { data_evento: dateISO, location_index: slot });
      // redirection vers la fiche offerta
      window.location.href = `/eventi/${res.data.id}`;
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={handleCreate} disabled={busy} className="px-3 py-2 border rounded">
      {busy ? "Creazione…" : "Nuova Offerta"}
    </button>
  );
}
