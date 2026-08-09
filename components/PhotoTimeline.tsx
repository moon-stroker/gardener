import Image from "next/image";
import { EmptyState } from "./ui/EmptyState";

export interface FotoTimelineItem {
  id: string;
  urlBlob: string;
  fecha: string;
  nota: string | null;
}

const FORMATO_FECHA = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });

export function PhotoTimeline({ fotos }: { fotos: FotoTimelineItem[] }) {
  if (fotos.length === 0) {
    return <EmptyState title="Todavía no hay fotos" description="Sube la primera foto para empezar la línea de tiempo." />;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {fotos.map((foto) => (
        <div key={foto.id} className="w-24 flex-none sm:w-28">
          <div className="relative aspect-square overflow-hidden rounded-md border border-border">
            <Image src={foto.urlBlob} alt={foto.nota ?? "Foto de la planta"} fill sizes="112px" className="object-cover" />
          </div>
          <p className="mt-1 text-xs tabular-nums text-muted">{FORMATO_FECHA.format(new Date(foto.fecha))}</p>
        </div>
      ))}
    </div>
  );
}
