/* (chemin : /frontend/src/app/eventi/page.tsx) */
"use client";

import Link from "next/link";

export default function EventiIndex() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Eventi</h1>
      <p>Scegli un’azione :</p>

      <div className="flex gap-2">

        {/* Bouton Offerta Rapida */}
        <Link
          href="/eventi/new"
          className="px-3 py-2 border rounded-none bg-blue-600 text-white"
        >
          Offerta rapida
        </Link>

        {/* Bouton Calendario */}
        <Link
          href="/calendario"
          className="px-3 py-2 border rounded-none"
        >
          Calendario
        </Link>

      </div>
      {events.map((ev) => (
        <tr key={ev.id}>
          <td className="px-2 py-1">
            <div className="flex items-center gap-1">
              <span className="font-medium">{ev.titolo}</span>
              <EventoMultiDayPill evento={ev} />
            </div>
            <div className="text-xs text-slate-500">
              {ev.data_evento_da ?? ev.data_evento}{" "}
              {ev.data_evento_a && ev.data_evento_a !== ev.data_evento_da
                ? ` → ${ev.data_evento_a}`
                : null}
            </div>
          </td>
          {/* ...autres colonnes... */}
        </tr>
      ))}
      </div>
    );
}
