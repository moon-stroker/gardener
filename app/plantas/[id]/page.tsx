"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { EstadoBadge } from "@/components/ui/EstadoBadge";
import { comprimirImagen } from "@/lib/image";
import type { Estado } from "@/lib/semaforo";

interface Foto {
  id: string;
  urlBlob: string;
  fecha: string;
  nota: string | null;
}
interface Bitacora {
  id: string;
  tipo: string;
  fecha: string;
  nota: string | null;
}
interface Recomendacion {
  id: string;
  texto: string;
  tipo: string;
  urgencia: Estado | null;
  fechaSugerida: string | null;
  atendida: number;
}
interface PlantaDetalle {
  id: string;
  nombre: string;
  especie: string | null;
  especieSugeridaIa: string | null;
  fotoPortadaUrl: string | null;
  reglaRiegoDias: number | null;
  reglaPodaDias: number | null;
  reglaFertilizacionDias: number | null;
  estado: Estado;
  motivos: string[];
  fotos: Foto[];
  bitacora: Bitacora[];
  recomendaciones: Recomendacion[];
}

const ETIQUETAS: Record<Estado, string> = { rojo: "Urgente", amarillo: "Pronto", verde: "Al día" };
const FECHA_CORTA = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });
const FECHA_LARGA = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" });
const TIPOS_BITACORA = ["riego", "poda", "fertilizacion", "trasplante", "otro"] as const;
const ETIQUETAS_BITACORA: Record<string, string> = {
  riego: "Riego",
  poda: "Poda",
  fertilizacion: "Fertilización",
  trasplante: "Trasplante",
  otro: "Otro",
  general: "Cuidado general",
};

export default function PerfilPlanta() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [planta, setPlanta] = useState<PlantaDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [mensajeAnalisis, setMensajeAnalisis] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [reintentando, setReintentando] = useState<string | null>(null);
  const [confirmandoEspecie, setConfirmandoEspecie] = useState(false);
  const [sugerirReanalisis, setSugerirReanalisis] = useState(false);
  const [nuevoTipoBitacora, setNuevoTipoBitacora] = useState<string>("riego");
  const [accionError, setAccionError] = useState<string | null>(null);

  async function llamar(url: string, opts?: RequestInit): Promise<Response | null> {
    try {
      const res = await fetch(url, opts);
      if (!res.ok) throw new Error();
      setAccionError(null);
      return res;
    } catch {
      setAccionError("No se pudo completar la acción. Revisa tu conexión e intenta de nuevo.");
      return null;
    }
  }

  const cargar = () => {
    fetch(`/api/plantas/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setPlanta(data);
        setError(null);
      })
      .catch(() => setError("No se pudo cargar esta planta."));
  };

  useEffect(cargar, [id]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10"><ErrorState message={error} onRetry={cargar} /></main>
      </div>
    );
  }

  if (!planta) {
    return (
      <div className="flex flex-1 flex-col">
        <Topbar />
        <LoadingState label="Cargando planta…" />
      </div>
    );
  }

  async function subirFoto(file: File) {
    setSubiendo(true);
    setMensajeAnalisis(null);
    try {
      const comprimida = await comprimirImagen(file);
      const formData = new FormData();
      formData.append("file", comprimida);
      const res = await fetch(`/api/plantas/${id}/foto`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error();

      if (data.analisis?.mensaje) {
        setMensajeAnalisis(data.analisis.mensaje);
      }
      cargar();
    } catch {
      setMensajeAnalisis("No se pudo subir la foto. Intenta de nuevo.");
    } finally {
      setSubiendo(false);
    }
  }

  async function ocultarPlanta() {
    if (!window.confirm(`¿Ocultar "${planta!.nombre}"? Podrás restaurarla después desde "Plantas ocultas".`)) return;
    const res = await llamar(`/api/plantas/${id}`, { method: "DELETE" });
    if (res) router.push("/");
  }

  async function editarNotaFoto(foto: Foto) {
    const nota = window.prompt("Nota de la foto:", foto.nota ?? "");
    if (nota === null) return;
    const res = await llamar(`/api/fotos/${foto.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nota }),
    });
    if (res) cargar();
  }

  async function borrarFoto(foto: Foto) {
    if (!window.confirm("¿Borrar esta foto? Esta acción no se puede deshacer.")) return;
    const res = await llamar(`/api/fotos/${foto.id}`, { method: "DELETE" });
    if (res) cargar();
  }

  async function usarComoPortada(foto: Foto) {
    const res = await llamar(`/api/plantas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fotoPortadaUrl: foto.urlBlob }),
    });
    if (res) cargar();
  }

  async function usarEspecieDeIA() {
    setConfirmandoEspecie(true);
    const res = await llamar(`/api/plantas/${id}/confirmar-especie`, { method: "POST" });
    setConfirmandoEspecie(false);
    if (res) {
      setSugerirReanalisis(planta!.fotos.length > 0);
      cargar();
    }
  }

  async function mantenerEspecieManual() {
    const res = await llamar(`/api/plantas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ especieSugeridaIa: planta!.especie }),
    });
    if (res) cargar();
  }

  async function reanalizarUltimaFoto() {
    const ultima = planta!.fotos[0];
    if (!ultima) return;
    setSugerirReanalisis(false);
    await reintentarAnalisis(ultima);
  }

  async function agregarBitacora(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nota = (form.get("nota") as string) || null;
    const res = await llamar(`/api/plantas/${id}/bitacora`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: nuevoTipoBitacora, nota }),
    });
    if (res) {
      e.currentTarget.reset();
      cargar();
    }
  }

  async function editarBitacora(entrada: Bitacora) {
    const nota = window.prompt("Nota de la bitácora:", entrada.nota ?? "");
    if (nota === null) return;
    const res = await llamar(`/api/bitacora/${entrada.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nota }),
    });
    if (res) cargar();
  }

  async function borrarBitacora(entrada: Bitacora) {
    if (!window.confirm("¿Eliminar este registro de bitácora?")) return;
    const res = await llamar(`/api/bitacora/${entrada.id}`, { method: "DELETE" });
    if (res) cargar();
  }

  async function marcarAtendida(rec: Recomendacion) {
    const res = await llamar(`/api/recomendaciones/${rec.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atendida: rec.atendida ? 0 : 1 }),
    });
    if (res) cargar();
  }

  async function descartarRecomendacion(rec: Recomendacion) {
    if (!window.confirm("¿Descartar esta recomendación?")) return;
    const res = await llamar(`/api/recomendaciones/${rec.id}`, { method: "DELETE" });
    if (res) cargar();
  }

  async function registrarCuidado(tipo: "riego" | "poda" | "fertilizacion") {
    const res = await llamar(`/api/plantas/${id}/bitacora`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo }),
    });
    if (res) cargar();
  }

  async function reintentarAnalisis(foto: Foto) {
    setReintentando(foto.id);
    setMensajeAnalisis(null);
    const res = await llamar(`/api/fotos/${foto.id}/reanalizar`, { method: "POST" });
    if (res) {
      const data = await res.json();
      setMensajeAnalisis(data.analisis?.mensaje ?? null);
      cargar();
    }
    setReintentando(null);
  }

  const hayRecomendacionPendiente = planta.recomendaciones.some((r) => !r.atendida && r.urgencia && r.urgencia !== "verde");

  return (
    <div className="flex flex-1 flex-col">
      <Topbar>
        <Button variant="ghost" onClick={ocultarPlanta}>Ocultar planta</Button>
      </Topbar>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-6">
        {accionError && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-rojo-soft bg-rojo-soft px-3 py-2 text-sm text-rojo">
            {accionError}
            <button onClick={() => setAccionError(null)} className="font-semibold">✕</button>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 overflow-hidden rounded-lg border border-border sm:grid-cols-[220px_1fr]">
          <div className="relative aspect-4/3 bg-accent-soft sm:aspect-auto sm:min-h-[220px]">
            {planta.fotoPortadaUrl ? (
              <Image src={planta.fotoPortadaUrl} alt={planta.nombre} fill sizes="220px" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-accent/60">
                <svg viewBox="0 0 24 24" fill="none" className="size-10">
                  <path d="M12 2C8 6 6 10 6 13a6 6 0 0 0 12 0c0-3-2-7-6-11Z" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3.5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-balance">{planta.nombre}</h1>
                <p className="italic text-muted">{planta.especie ?? "Especie sin identificar"}</p>
              </div>
              <EstadoBadge estado={planta.estado} label={ETIQUETAS[planta.estado]} size="md" />
            </div>

            {planta.especieSugeridaIa && planta.especieSugeridaIa !== planta.especie && (
              <div className="flex flex-col gap-2 rounded-md border border-accent/25 bg-accent-soft px-3 py-2 text-sm">
                <span>
                  La IA identificó esto como <strong className="text-accent">{planta.especieSugeridaIa}</strong>, distinto a lo que
                  tienes registrado (<strong>{planta.especie ?? "sin especie"}</strong>). ¿Cuál es correcto?
                </span>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <button
                    onClick={usarEspecieDeIA}
                    disabled={confirmandoEspecie}
                    className="flex-none text-sm font-semibold text-accent underline underline-offset-2 disabled:opacity-50"
                  >
                    {confirmandoEspecie ? "Actualizando…" : `Usar "${planta.especieSugeridaIa}" (la IA)`}
                  </button>
                  <button
                    onClick={mantenerEspecieManual}
                    disabled={confirmandoEspecie}
                    className="flex-none text-sm font-semibold text-muted underline underline-offset-2 disabled:opacity-50"
                  >
                    Mantener &quot;{planta.especie ?? "sin especie"}&quot; (la mía)
                  </button>
                </div>
              </div>
            )}

            {sugerirReanalisis && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-accent/25 bg-accent-soft px-3 py-2 text-sm">
                <span>Cambiaste la especie — ¿reanalizamos la última foto para que la recomendación coincida?</span>
                <div className="flex flex-none gap-3">
                  <button
                    onClick={reanalizarUltimaFoto}
                    disabled={reintentando === planta.fotos[0]?.id}
                    className="font-semibold text-accent underline underline-offset-2 disabled:opacity-50"
                  >
                    {reintentando === planta.fotos[0]?.id ? "Analizando…" : "Reanalizar"}
                  </button>
                  <button onClick={() => setSugerirReanalisis(false)} className="font-medium text-muted">Ahora no</button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Regla etiqueta="Riego cada" valor={planta.reglaRiegoDias} sufijo="días" />
              <Regla etiqueta="Poda cada" valor={planta.reglaPodaDias} sufijo="días" />
              <Regla etiqueta="Fertilizar cada" valor={planta.reglaFertilizacionDias} sufijo="días" />
            </div>

            {planta.reglaRiegoDias == null && planta.reglaPodaDias == null && planta.reglaFertilizacionDias == null && (
              <p className="text-xs text-muted">
                Todavía no hay reglas de cuidado — sube una foto para que la IA las sugiera según la especie.
              </p>
            )}

            {planta.estado !== "verde" && planta.motivos.length > 0 && (
              <div className={`rounded-md border px-3 py-2 text-sm ${planta.estado === "rojo" ? "border-rojo-soft bg-rojo-soft text-rojo" : "border-amarillo-soft bg-amarillo-soft text-amarillo"}`}>
                <ul className="flex flex-col gap-1">
                  {planta.motivos.map((motivo) => (
                    <li key={motivo}>{motivo}</li>
                  ))}
                </ul>
                {hayRecomendacionPendiente && (
                  <a href="#recomendaciones" className="mt-1 inline-block font-semibold underline underline-offset-2">
                    ↓ Ir a Recomendaciones para marcarla como atendida
                  </a>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) subirFoto(f);
                  e.target.value = "";
                }}
              />
              <Button onClick={() => fileRef.current?.click()} disabled={subiendo}>
                {subiendo ? "Analizando…" : "Subir foto y analizar"}
              </Button>
              {planta.reglaRiegoDias != null && (
                <Button variant="ghost" onClick={() => registrarCuidado("riego")}>Regué hoy</Button>
              )}
              {planta.reglaPodaDias != null && (
                <Button variant="ghost" onClick={() => registrarCuidado("poda")}>Podé hoy</Button>
              )}
              {planta.reglaFertilizacionDias != null && (
                <Button variant="ghost" onClick={() => registrarCuidado("fertilizacion")}>Fertilicé hoy</Button>
              )}
              <Button variant="ghost" onClick={() => setEditando((v) => !v)}>
                {editando ? "Cerrar edición" : "Editar datos"}
              </Button>
            </div>

            {subiendo && <LoadingState label="La IA está analizando la foto…" />}
            {mensajeAnalisis && <p className="text-sm text-amarillo">{mensajeAnalisis}</p>}

            {editando && (
              <EditarPlantaForm
                planta={planta}
                llamar={llamar}
                onGuardado={(especieCambio) => {
                  setEditando(false);
                  if (especieCambio && planta.fotos.length > 0) setSugerirReanalisis(true);
                  cargar();
                }}
              />
            )}
          </div>
        </div>

        <Seccion titulo="Línea de tiempo">
          {planta.fotos.length === 0 ? (
            <EmptyState title="Todavía no hay fotos" description="Sube la primera foto para empezar la línea de tiempo." />
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {planta.fotos.map((foto) => (
                <div key={foto.id} className="group w-24 flex-none sm:w-28">
                  <div className="relative aspect-square overflow-hidden rounded-md border border-border">
                    <Image src={foto.urlBlob} alt={foto.nota ?? "Foto de la planta"} fill sizes="112px" className="object-cover" />
                  </div>
                  <p className="mt-1 text-xs tabular-nums text-muted">{FECHA_CORTA.format(new Date(foto.fecha))}</p>
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
                    <button onClick={() => editarNotaFoto(foto)} className="font-medium text-accent">Nota</button>
                    <button onClick={() => usarComoPortada(foto)} className="font-medium text-muted">Portada</button>
                    <button onClick={() => borrarFoto(foto)} className="font-medium text-rojo">Borrar</button>
                    <button
                      onClick={() => reintentarAnalisis(foto)}
                      disabled={reintentando === foto.id}
                      className="font-medium text-amarillo disabled:opacity-50"
                    >
                      {reintentando === foto.id ? "Analizando…" : "Reintentar IA"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Seccion>

        <Seccion id="recomendaciones" titulo="Recomendaciones">
          {planta.recomendaciones.length === 0 ? (
            <EmptyState title="Sin recomendaciones todavía" description="Sube una foto para recibir un diagnóstico de la IA." />
          ) : (
            <div className="flex flex-col gap-2">
              {planta.recomendaciones.map((rec) => (
                <div key={rec.id} className={`flex items-start gap-3 rounded-md border border-border p-3 ${rec.atendida ? "opacity-50" : ""}`}>
                  {rec.urgencia && <EstadoBadge estado={rec.urgencia} label="" size="sm" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{rec.texto}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {ETIQUETAS_BITACORA[rec.tipo] ?? rec.tipo}
                      {rec.fechaSugerida && ` · sugerida para ${FECHA_LARGA.format(new Date(rec.fechaSugerida))}`}
                    </p>
                  </div>
                  <div className="flex flex-none flex-col items-end gap-1 text-xs">
                    <button onClick={() => marcarAtendida(rec)} className="font-semibold text-accent">
                      {rec.atendida ? "Reabrir" : "Marcar atendida"}
                    </button>
                    <button onClick={() => descartarRecomendacion(rec)} className="font-medium text-muted">Descartar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Seccion>

        <Seccion titulo="Bitácora">
          <form onSubmit={agregarBitacora} className="mb-3 flex flex-wrap items-center gap-2">
            <select
              value={nuevoTipoBitacora}
              onChange={(e) => setNuevoTipoBitacora(e.target.value)}
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm"
            >
              {TIPOS_BITACORA.map((t) => (
                <option key={t} value={t}>{ETIQUETAS_BITACORA[t]}</option>
              ))}
            </select>
            <input
              name="nota"
              placeholder="Nota (opcional)"
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm"
            />
            <Button type="submit" variant="ghost">Registrar</Button>
          </form>

          {planta.bitacora.length === 0 ? (
            <EmptyState title="Sin registros de bitácora" />
          ) : (
            <div className="flex flex-col gap-2">
              {planta.bitacora.map((b) => (
                <div key={b.id} className="flex items-start gap-3 rounded-md border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{ETIQUETAS_BITACORA[b.tipo] ?? b.tipo}</p>
                    {b.nota && <p className="text-sm text-muted">{b.nota}</p>}
                    <p className="mt-0.5 text-xs tabular-nums text-muted">{FECHA_LARGA.format(new Date(b.fecha))}</p>
                  </div>
                  <div className="flex flex-none gap-2 text-xs">
                    <button onClick={() => editarBitacora(b)} className="font-semibold text-accent">Editar</button>
                    <button onClick={() => borrarBitacora(b)} className="font-medium text-rojo">Borrar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Seccion>

        <div className="mt-8">
          <Link href="/" className="text-sm font-medium text-muted underline underline-offset-2">← Volver al dashboard</Link>
        </div>
      </main>
    </div>
  );
}

function Regla({ etiqueta, valor, sufijo }: { etiqueta: string; valor: number | null; sufijo: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium tracking-wide text-muted uppercase">{etiqueta}</span>
      <span className="text-sm font-semibold tabular-nums">{valor ? `${valor} ${sufijo}` : "—"}</span>
    </div>
  );
}

function Seccion({ id, titulo, children }: { id?: string; titulo: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-8 scroll-mt-4">
      <h2 className="mb-3 text-sm font-bold tracking-tight">{titulo}</h2>
      {children}
    </section>
  );
}

function EditarPlantaForm({
  planta,
  onGuardado,
  llamar,
}: {
  planta: PlantaDetalle;
  onGuardado: (especieCambio: boolean) => void;
  llamar: (url: string, opts?: RequestInit) => Promise<Response | null>;
}) {
  const [nombre, setNombre] = useState(planta.nombre);
  const [especie, setEspecie] = useState(planta.especie ?? "");
  const [riego, setRiego] = useState(String(planta.reglaRiegoDias ?? ""));
  const [poda, setPoda] = useState(String(planta.reglaPodaDias ?? ""));
  const [fert, setFert] = useState(String(planta.reglaFertilizacionDias ?? ""));
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setErrorLocal(false);
    const res = await llamar(`/api/plantas/${planta.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        especie: especie.trim() || null,
        reglaRiegoDias: riego ? Number(riego) : null,
        reglaPodaDias: poda ? Number(poda) : null,
        reglaFertilizacionDias: fert ? Number(fert) : null,
      }),
    });
    setGuardando(false);
    if (res) onGuardado(especie.trim() !== (planta.especie ?? ""));
    else setErrorLocal(true);
  }

  const campo = "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm";

  return (
    <form onSubmit={onSubmit} className="mt-1 flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted">Nombre</label>
          <input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted">Especie</label>
          <input className={campo} value={especie} onChange={(e) => setEspecie(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted">Regar cada (días)</label>
          <input className={campo} type="number" min={1} value={riego} onChange={(e) => setRiego(e.target.value)} placeholder="—" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted">Podar cada (días)</label>
          <input className={campo} type="number" min={1} value={poda} onChange={(e) => setPoda(e.target.value)} placeholder="—" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted">Fertilizar cada (días)</label>
          <input className={campo} type="number" min={1} value={fert} onChange={(e) => setFert(e.target.value)} placeholder="—" />
        </div>
      </div>
      <p className="text-xs text-muted">
        La IA lo sugiere automáticamente según la especie al analizar una foto; ajústalo aquí solo si no coincide con lo que tu planta necesita.
      </p>
      {errorLocal && <p className="text-sm font-medium text-rojo">No se guardaron los cambios. Intenta de nuevo.</p>}
      <Button type="submit" disabled={guardando} className="self-start">{guardando ? "Guardando…" : "Guardar cambios"}</Button>
    </form>
  );
}
