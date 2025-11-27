/* /frontend/src/components/logistica/MezziTecniciTable.tsx */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Row = {
  id:number; nome:string; ruolo?:string;
  costo_km:string; n_km:string; costo_totale_eur:string;
};

export default function MezziTecniciTable({
  eventoId, kmOverride
}: { eventoId:number; kmOverride?:number }) {
  const [distanzaKm, setDistanzaKm] = useState<string>("0");
  const [mezzi, setMezzi] = useState<Row[]>([]);
  const [tecnici, setTecnici] = useState<Row[]>([]);
  const [totM, setTotM] = useState<string>("0,00 €");
  const [totT, setTotT] = useState<string>("0,00 €");
  const [totLog, setTotLog] = useState<string>("0,00 €");

  useEffect(()=>{
    const q = new URLSearchParams({ evento: String(eventoId) });
    if (kmOverride !== undefined) q.set("km_override", String(kmOverride));
    api.get(`/logistica/preview?${q.toString()}`).then(r=>{
      setDistanzaKm(r.data.distanza_km);
      setMezzi(r.data.mezzi);
      setTecnici(r.data.tecnici);
      setTotM(r.data.totale_mezzi);
      setTotT(r.data.totale_tecnici);
      setTotLog(r.data.totale_logistica);
    });
  }, [eventoId, kmOverride]);

  return (
    <div className="space-y-8">
      <div>
        <h4 className="font-semibold mb-2">Mezzi</h4>
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Mezzo</th>
                <th className="px-3 py-2 text-right">n.km</th>
                <th className="px-3 py-2 text-right">€/km</th>
                <th className="px-3 py-2 text-right">Totale</th>
              </tr>
            </thead>
            <tbody>
              {mezzi.map(m=>(
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2">{m.nome}</td>
                  <td className="px-3 py-2 text-right">{m.n_km}</td>
                  <td className="px-3 py-2 text-right">{m.costo_km}</td>
                  <td className="px-3 py-2 text-right font-medium">{m.costo_totale_eur}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-slate-50">
                <td className="px-3 py-2" colSpan={3}>Totale mezzi</td>
                <td className="px-3 py-2 text-right font-semibold">{totM}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Tecnici</h4>
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Tecnico</th>
                <th className="px-3 py-2 text-left">Ruolo</th>
                <th className="px-3 py-2 text-right">n.km</th>
                <th className="px-3 py-2 text-right">€/km</th>
                <th className="px-3 py-2 text-right">Totale</th>
              </tr>
            </thead>
            <tbody>
              {tecnici.map(t=>(
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-2">{t.nome}</td>
                  <td className="px-3 py-2">{t.ruolo || "—"}</td>
                  <td className="px-3 py-2 text-right">{t.n_km}</td>
                  <td className="px-3 py-2 text-right">{t.costo_km}</td>
                  <td className="px-3 py-2 text-right font-medium">{t.costo_totale_eur}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-slate-50">
                <td className="px-3 py-2" colSpan={4}>Totale tecnici</td>
                <td className="px-3 py-2 text-right font-semibold">{totT}</td>
              </tr>
              <tr className="border-t bg-slate-100">
                <td className="px-3 py-2" colSpan={4}>Totale logistica (mezzi + tecnici)</td>
                <td className="px-3 py-2 text-right font-bold">{totLog}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
