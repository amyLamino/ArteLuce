// (chemin : /frontend/src/lib/api.ts)
import axios, { AxiosError, AxiosResponse } from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api",
});

// On bloque toute requête qui contiendrait un id invalide dans l'URL.
const BAD_ID_RE = /\/eventi\/(undefined|null|NaN)(\/|$)/;

api.interceptors.request.use((config) => {
  const full =
    (config.baseURL ?? "").replace(/\/$/, "") +
    (config.url ?? "").replace(/^\//, "");

  if (BAD_ID_RE.test(full)) {
    const err = new AxiosError(
      "blocked-invalid-id",
      "ERR_BLOCKED_INVALID_ID",
      config
    );
    return Promise.reject(err);
  }

  // ← AJOUT : injecter le token si présent
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("authToken");
    if (token) {
      config.headers = {
        ...(config.headers ?? {}),
        Authorization: `Token ${token}`,
      };
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
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

    // (optionnel) si 401 → on peut vider le token
    if (err.response?.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem("authToken");
    }

    return Promise.reject(err);
  }
);
