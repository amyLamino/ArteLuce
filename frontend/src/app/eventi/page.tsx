/* (chemin : /frontend/src/app/eventi/page.tsx) */
"use client";

import Link from "next/link";

export default function EventiIndex() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Eventi</h1>
      <p>Scegli un’azione :</p>

      <div className="flex gap-2">
        <Link
          href="/eventi/new"
          className="px-3 py-2 border rounded-none bg-blue-600 text-white"
        >
          Offerta rapida
        </Link>

        <Link href="/calendario" className="px-3 py-2 border rounded-none">
          Calendario
        </Link>
      </div>

      <div className="mt-4 text-sm text-slate-600">
        La lista degli eventi viene visualizzata nella pagina Calendario o nella
        vista specifica dell'evento. Questa pagina funge da indice minimale.
      </div>
    </div>
  );
}
