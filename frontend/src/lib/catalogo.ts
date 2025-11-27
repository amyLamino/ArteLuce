// /frontend/src/lib/catalogo.ts
import { api } from "./api";

export type CatalogoItem = {
  id: number;
  categoria: string;
  sottocategoria: string;
  nome: string;
  prezzo: number;
  prezzo_s: string;
  scorta: number;
  prenotato: number;
  disponibilita: number;
};

export async function searchCatalogo(params: {
  term?: string;
  categoria?: number | string;
  sottocategoria?: number | string;
  luogo?: number | null;
  data?: string | null; // "YYYY-MM-DD"
}): Promise<CatalogoItem[]> {
  const r = await api.get("/catalogo/search", { params });
  const arr = Array.isArray(r.data?.results) ? r.data.results : [];
  return arr as CatalogoItem[];
}
