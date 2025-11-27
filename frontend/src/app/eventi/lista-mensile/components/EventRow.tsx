/* (chemin : /frontend/src/app/eventi/lista-mensile/components/EventRow.tsx) */
import { StockBadge } from "@/components/StockBadge";

function EventRow({ evento }: { evento: any }) {
  return (
    <div className="flex items-center justify-between px-2 py-1">
      <div>
        <div className="font-semibold text-xs">{evento.titolo}</div>
        <div className="text-[10px] text-slate-500">
          {evento.cliente_nome} • {evento.luogo_nome}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* badge stato offerta existant */}
        {/* ... */}

        {/* badge stock basé sur totaux event */}
        {evento.stock_tot_scorta != null &&
          evento.stock_tot_dispon != null && (
            <StockBadge
              scorta={evento.stock_tot_scorta}
              dispon={evento.stock_tot_dispon}
            />
          )}
      </div>
    </div>
  );
}
