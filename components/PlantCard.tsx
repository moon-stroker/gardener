import Image from "next/image";
import Link from "next/link";
import { EstadoBadge } from "./ui/EstadoBadge";
import type { Estado } from "@/lib/semaforo";

const ETIQUETAS: Record<Estado, string> = { rojo: "Urgente", amarillo: "Pronto", verde: "Al día" };

export function PlantCard({
  id,
  nombre,
  especie,
  fotoPortadaUrl,
  estado,
}: {
  id: string;
  nombre: string;
  especie: string | null;
  fotoPortadaUrl: string | null;
  estado: Estado | null;
}) {
  return (
    <Link
      href={`/plantas/${id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition-transform hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-4/3 bg-accent-soft">
        {fotoPortadaUrl ? (
          <Image
            src={fotoPortadaUrl}
            alt={nombre}
            fill
            sizes="(min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-accent/60">
            <svg viewBox="0 0 24 24" fill="none" className="size-8">
              <path d="M12 2C8 6 6 10 6 13a6 6 0 0 0 12 0c0-3-2-7-6-11Z" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
            </svg>
          </div>
        )}
        {estado && (
          <div className="absolute left-2 top-2">
            <EstadoBadge estado={estado} label={ETIQUETAS[estado]} />
          </div>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="truncate text-sm font-bold text-foreground">{nombre}</p>
        <p className="truncate text-xs italic text-muted">{especie ?? "Especie sin identificar"}</p>
      </div>
    </Link>
  );
}
