"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";

interface PlantaOculta {
  id: string;
  nombre: string;
  especie: string | null;
  fotoPortadaUrl: string | null;
}

export default function PlantasOcultas() {
  const [plantas, setPlantas] = useState<PlantaOculta[] | null>(null);

  const cargar = () => {
    fetch("/api/plantas?ocultas=true")
      .then((r) => r.json())
      .then(setPlantas);
  };

  useEffect(cargar, []);

  async function restaurar(id: string) {
    setPlantas((prev) => prev?.filter((p) => p.id !== id) ?? null);
    await fetch(`/api/plantas/${id}/restaurar`, { method: "POST" });
  }

  return (
    <div className="flex flex-1 flex-col">
      <Topbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="mb-1 text-xl font-bold tracking-tight">Plantas ocultas</h1>
        <p className="mb-6 text-sm text-muted">Plantas que ocultaste del dashboard principal.</p>

        {plantas === null && <LoadingState />}

        {plantas?.length === 0 && <EmptyState title="No tienes plantas ocultas" />}

        <div className="flex flex-col gap-2">
          {plantas?.map((planta) => (
            <div key={planta.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
              <div className="relative size-12 flex-none overflow-hidden rounded-md bg-accent-soft">
                {planta.fotoPortadaUrl && (
                  <Image src={planta.fotoPortadaUrl} alt={planta.nombre} fill sizes="48px" className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{planta.nombre}</p>
                <p className="truncate text-xs italic text-muted">{planta.especie ?? "Especie sin identificar"}</p>
              </div>
              <Button variant="ghost" onClick={() => restaurar(planta.id)}>
                Restaurar
              </Button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
