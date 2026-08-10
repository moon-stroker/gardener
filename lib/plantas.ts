import { db } from "@/db";
import { bitacora, recomendaciones } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { calcularEstado, type Estado, type EstadoDetallado } from "@/lib/semaforo";

async function ultimoRegistro(plantaId: string, tipo: string): Promise<string | null> {
  const [row] = await db
    .select({ fecha: bitacora.fecha })
    .from(bitacora)
    .where(and(eq(bitacora.plantaId, plantaId), eq(bitacora.tipo, tipo)))
    .orderBy(desc(bitacora.fecha))
    .limit(1);
  return row?.fecha ?? null;
}

// Un análisis nuevo reemplaza al anterior en vez de acumularse: las recomendaciones
// pendientes previas se marcan atendidas (quedan en el historial, ya no en la lista activa).
export async function descartarRecomendacionesPendientes(plantaId: string): Promise<void> {
  await db
    .update(recomendaciones)
    .set({ atendida: 1 })
    .where(and(eq(recomendaciones.plantaId, plantaId), eq(recomendaciones.atendida, 0)));
}

export async function estadoDePlanta(planta: {
  id: string;
  fechaInicio: string;
  reglaRiegoDias: number | null;
  reglaPodaDias: number | null;
  reglaFertilizacionDias: number | null;
}): Promise<EstadoDetallado> {
  const [ultimoRiego, ultimaPoda, ultimaFertilizacion, pendientes] = await Promise.all([
    ultimoRegistro(planta.id, "riego"),
    ultimoRegistro(planta.id, "poda"),
    ultimoRegistro(planta.id, "fertilizacion"),
    db
      .select({ texto: recomendaciones.texto, urgencia: recomendaciones.urgencia, fechaSugerida: recomendaciones.fechaSugerida })
      .from(recomendaciones)
      .where(and(eq(recomendaciones.plantaId, planta.id), eq(recomendaciones.atendida, 0))),
  ]);

  return calcularEstado({
    fechaInicio: planta.fechaInicio,
    reglaRiegoDias: planta.reglaRiegoDias,
    reglaPodaDias: planta.reglaPodaDias,
    reglaFertilizacionDias: planta.reglaFertilizacionDias,
    ultimoRiego,
    ultimaPoda,
    ultimaFertilizacion,
    recomendacionesPendientes: pendientes.map((p) => ({
      texto: p.texto,
      urgencia: p.urgencia as Estado | null,
      fechaSugerida: p.fechaSugerida,
    })),
  });
}
