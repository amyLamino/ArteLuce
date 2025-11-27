/* (chemin : /frontend/src/app/page.tsx) */
import Link from "next/link";
export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Sinottino (mini dashboard)</h1>
      <p>Pastilles carrées présentes dans Calendario et Eventi. Onglets et positions mémorisés.</p>
      <div className="flex gap-2">
        <Link className="px-3 py-2 bg-slate-900 text-white rounded-none" href="/calendario">Calendario</Link>
        <Link className="px-3 py-2 bg-slate-900 text-white rounded-none" href="/eventi/offerta-rapida">Offerta rapida</Link>

      </div>

    </div>
  )
}
