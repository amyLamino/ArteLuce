// frontend/src/lib/api.ts
import axios, { AxiosError, AxiosResponse } from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";


export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api",
});

// On bloque toute requête qui contiendrait un id invalide dans l'URL.
const BAD_ID_RE = /\/eventi\/(undefined|null|NaN)(\/|$)/;

api.interceptors.request.use((config) => {
  const full =
    (config.baseURL ?? "").replace(/\/$/, "") +
    "/" +
    String(config.url ?? "").replace(/^\//, "");
  if (BAD_ID_RE.test(full)) {
    // Annulation propre, à ignorer côté composants.
    return Promise.reject(new axios.Cancel("blocked-invalid-id"));
  }
  return config;
});

export function isCanceled(err: any) {
  return (
    axios.isCancel?.(err) ||
    err?.code === "ERR_CANCELED" ||
    err?.message === "blocked-invalid-id"
  );
}

// Bloque les URL invalides (undefined/null) → renvoie 204 au lieu d'une erreur
api.interceptors.request.use((cfg) => {
  const url = `${cfg.baseURL || ""}${cfg.url || ""}`;
  if (/\/eventi\/(undefined|null)(\/|$)/.test(url)) {
    // eslint-disable-next-line no-console
    console.warn("[api] requête bloquée car id invalide:", url);
    // On annule la requête ici
    // @ts-expect-error adapter Cancel token
    throw new axios.Cancel("blocked-invalid-id");
  }
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (axios.isCancel(err) && err.message === "blocked-invalid-id") {
      const fake: AxiosResponse = {
        data: null,
        status: 204,
        statusText: "No Content",
        headers: {},
        // @ts-expect-error config sera défini par axios
        config: err.config,
      };
      return Promise.resolve(fake);
    }
    return Promise.reject(err);
  }
);
