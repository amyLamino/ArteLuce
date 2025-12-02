"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import DiffPanel from "./DiffPanel";
import SnapCompare from "./SnapCompare";

export default function HistoryPage({
  params,
}: {
  params: { id: string };
}) {
  const [revisions, setRevisions] = useState<any[]>([]);
  const [selectedPrevRef, setSelectedPrevRef] = useState<string>("");
  const [selectedCurRef, setSelectedCurRef] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevisions = async () => {
      try {
        const response = await api.get(`/eventi/${params.id}/revisions`);
        const revs = response.data || [];
        setRevisions(revs);
        if (revs.length >= 2) {
          setSelectedPrevRef(revs[revs.length - 2].ref);
          setSelectedCurRef(revs[revs.length - 1].ref);
        }
      } catch (error) {
        console.error("Errore nel caricamento delle revisioni:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRevisions();
  }, [params.id]);

  if (loading) return <div>Caricamento...</div>;
  if (revisions.length === 0) return <div>Nessuna revisione disponibile.</div>;

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-bold">Storico evento #{params.id}</h1>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Versione precedente</label>
          <select
            value={selectedPrevRef}
            onChange={(e) => setSelectedPrevRef(e.target.value)}
            className="w-full border rounded p-2"
          >
            {revisions.map((rev) => (
              <option key={rev.ref} value={rev.ref}>
                {rev.ref} - {new Date(rev.created_at).toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Versione corrente</label>
          <select
            value={selectedCurRef}
            onChange={(e) => setSelectedCurRef(e.target.value)}
            className="w-full border rounded p-2"
          >
            {revisions.map((rev) => (
              <option key={rev.ref} value={rev.ref}>
                {rev.ref} - {new Date(rev.created_at).toLocaleString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedPrevRef && selectedCurRef && (
        <div className="grid grid-cols-2 gap-6">
          <div className="border rounded p-4">
            <h2 className="text-lg font-semibold mb-4">Differenze</h2>
            <DiffPanel id={params.id} prevRef={selectedPrevRef} curRef={selectedCurRef} />
          </div>

          <div className="border rounded p-4">
            <h2 className="text-lg font-semibold mb-4">Confronto visivo</h2>
            <SnapCompare id={params.id} prevRef={selectedPrevRef} curRef={selectedCurRef} />
          </div>
        </div>
      )}
    </div>
  );
}
