"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { Button } from "@/components/ui/Button";
import { comprimirImagen } from "@/lib/image";

const campo = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent";
const etiqueta = "text-sm font-semibold text-foreground";

export default function NuevaPlanta() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [especie, setEspecie] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre es requerido");
      return;
    }
    setEnviando(true);
    setError(null);

    try {
      const res = await fetch("/api/plantas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, especie: especie.trim() || null }),
      });
      if (!res.ok) throw new Error();
      const planta = await res.json();

      if (archivo) {
        const comprimida = await comprimirImagen(archivo);
        const formData = new FormData();
        formData.append("file", comprimida);
        await fetch(`/api/plantas/${planta.id}/foto`, { method: "POST", body: formData }).catch(() => {});
      }

      router.push(`/plantas/${planta.id}`);
    } catch {
      setError("No se pudo crear la planta. Intenta de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Topbar />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-xl font-bold tracking-tight">Nueva planta</h1>

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className={etiqueta} htmlFor="nombre">Nombre</label>
            <input id="nombre" className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Albahaca de la cocina" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={etiqueta} htmlFor="especie">Especie (opcional)</label>
            <input id="especie" className={campo} value={especie} onChange={(e) => setEspecie(e.target.value)} placeholder="Ej. Ocimum basilicum" />
            {!especie && (
              <p className="text-xs text-muted">Si la dejas en blanco, la IA la identificará al subir la primera foto.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={etiqueta} htmlFor="foto">Foto inicial (opcional)</label>
            <input
              id="foto"
              type="file"
              accept="image/*"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              className="text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-accent"
            />
            <p className="text-xs text-muted">
              Si subes una foto, la IA sugerirá cada cuántos días regarla, podarla y fertilizarla según la especie — tú no tienes que
              adivinarlo. Puedes ajustarlo después desde &quot;Editar datos&quot; en el perfil.
            </p>
          </div>

          {error && <p className="text-sm font-medium text-rojo">{error}</p>}

          <Button type="submit" disabled={enviando} className="self-start disabled:opacity-60">
            {enviando ? "Guardando…" : "Guardar planta"}
          </Button>
        </form>
      </main>
    </div>
  );
}
