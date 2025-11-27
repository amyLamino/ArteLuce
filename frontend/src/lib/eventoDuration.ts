// /frontend/src/lib/eventoDuration.ts
import dayjs from "dayjs";

export type EventoLike = {
  data_evento?: string | null;
  data_evento_da?: string | null;
  data_evento_a?: string | null;
};

export function getEventoDurationDays(e: EventoLike): number {
  const da = e.data_evento_da || e.data_evento;
  const a = e.data_evento_a || e.data_evento;

  if (!da || !a) return 1;

  const start = dayjs(da);
  const end = dayjs(a);

  const diff = end.diff(start, "day");
  return diff >= 0 ? diff + 1 : 1; // min 1 jour
}
