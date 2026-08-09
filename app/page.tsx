"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlantCard } from "@/components/PlantCard";
import { Topbar } from "@/components/Topbar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import type { Estado } from "@/lib/semaforo";

interface PlantaListItem {
  id: string;
  nombre: string;
  especie: string | null;
  fotoPortadaUrl: string | null;
  estado: Estado;
}

const GRUPOS: { estado: Estado; titulo: string; icono: string }[] = [
  { estado: "rojo", titulo: "Atención urgente", icono: "text-rojo" },
  { estado: "amarillo", titulo: "Pronto", icono: "text-amarillo" },
  { estado: "verde", titulo: "En orden", icono: "text-verde" },
];

export default function Dashboard() {
  const [plantas, setPlantas] = useState<PlantaListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = () => {
    fetch("/api/plantas")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setPlantas(data);
        setError(null);
      })
      .catch(() => setError("No se pudieron cargar tus plantas. Revisa tu conexión."));
  };

  useEffect(cargar, []);

  const urgentes = plantas?.filter((p) => p.estado === "rojo").length ?? 0;

  return (
    <div className="flex flex-1 flex-col">
      <Topbar>
        <Link href="/plantas/nueva">
          <Button>+ Nueva planta</Button>
        </Link>
      </Topbar>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-6">
        <div className="pt-6 pb-1">
          <h1 className="text-xl font-bold tracking-tight text-balance sm:text-2xl">
            {new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
          </h1>
          <p className="text-sm text-muted">
            {plantas === null
              ? "Revisando tus plantas…"
              : urgentes > 0
                ? `${urgentes} planta${urgentes === 1 ? "" : "s"} necesita${urgentes === 1 ? "" : "n"} atención`
                : "Todo en orden por hoy"}
          </p>
        </div>

        {error && <div className="mt-6"><ErrorState message={error} onRetry={cargar} /></div>}

        {!error && plantas === null && <LoadingState label="Cargando plantas…" />}

        {!error && plantas?.length === 0 && (
          <div className="mt-6">
            <EmptyState
              title="Todavía no tienes plantas registradas"
              description="Agrega tu primera planta para empezar a llevar su seguimiento."
              action={
                <Link href="/plantas/nueva" className="mt-2">
                  <Button>+ Nueva planta</Button>
                </Link>
              }
            />
          </div>
        )}

        {!error &&
          plantas &&
          plantas.length > 0 &&
          GRUPOS.map(({ estado, titulo }) => {
            const delGrupo = plantas.filter((p) => p.estado === estado);
            if (delGrupo.length === 0) return null;
            return (
              <section key={estado} className="mt-6">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wide text-muted uppercase">
                  {titulo}
                  <span className="rounded-full bg-border px-2 py-0.5 text-[11px] tabular-nums text-foreground">
                    {delGrupo.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {delGrupo.map((planta) => (
                    <PlantCard key={planta.id} {...planta} />
                  ))}
                </div>
              </section>
            );
          })}

        {!error && plantas && plantas.length > 0 && (
          <div className="mt-10 text-center">
            <Link href="/plantas/ocultas" className="text-sm font-medium text-muted underline underline-offset-2">
              Ver plantas ocultas
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
