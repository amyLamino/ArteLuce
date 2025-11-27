/* chemin : /frontend/src/app/eventi/[id]/ClientEventoPage.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import { LocationSelector } from "@/components/LocationSelector";
import CatalogoSelector from "@/components/CatalogoSelector";
import { Toast, useToast } from "@/components/Toast";
import OffertaStepper from "@/components/OffertaStepper";

// 👉 reçois l'id depuis le wrapper server
export default function ClientEventoPage({ id }: { id: string }) {
  // 🔽 colle ici **tel quel** tout le contenu de ton composant précédent
  //     (tes types, états, useEffect, fonctions save(), reload(), JSX, etc.)
  //     en remplaçant l’endroit où tu faisais: const params = useParams();
  //     par: const eventoId = id;

  // EXEMPLE (adaptation minime) :
  const router = useRouter();
  const { msg, setMsg } = useToast();
  // ... (tes types et états)
  // Remplace toute référence à `const params = useParams(); const id = String((params as any).id);`
  // par `const eventoId = id;` et utilise `eventoId` là où tu passais avant `id` à l’API.
  // loadEvento(eventoId, ...) etc.

  return (
    <div className="space-y-4">
      {/* colle ici tout ton JSX d’avant */}
    </div>
  );
}
