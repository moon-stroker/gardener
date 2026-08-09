import { db } from "@/db";
import { bitacora, recomendaciones } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { calcularEstado, type Estado } from "@/lib/semaforo";

async function ultimoRegistro(plantaId: string, tipo: string): Promise<string | null> {
  const [row] = await db
    .select({ fecha: bitacora.fecha })
    .from(bitacora)
    .where(and(eq(bitacora.plantaId, plantaId), eq(bitacora.tipo, tipo)))
    .orderBy(desc(bitacora.fecha))
    .limit(1);
  return row?.fecha ?? null;
}

export async function estadoDePlanta(planta: {
  id: string;
  reglaRiegoDias: number | null;
  reglaPodaDias: number | null;
  reglaFertilizacionDias: number | null;
}): Promise<Estado> {
  const [ultimoRiego, ultimaPoda, ultimaFertilizacion, pendientes] = await Promise.all([
    ultimoRegistro(planta.id, "riego"),
    ultimoRegistro(planta.id, "poda"),
    ultimoRegistro(planta.id, "fertilizacion"),
    db
      .select({ urgencia: recomendaciones.urgencia, fechaSugerida: recomendaciones.fechaSugerida })
      .from(recomendaciones)
      .where(and(eq(recomendaciones.plantaId, planta.id), eq(recomendaciones.atendida, 0))),
  ]);

  return calcularEstado({
    reglaRiegoDias: planta.reglaRiegoDias,
    reglaPodaDias: planta.reglaPodaDias,
    reglaFertilizacionDias: planta.reglaFertilizacionDias,
    ultimoRiego,
    ultimaPoda,
    ultimaFertilizacion,
    recomendacionesPendientes: pendientes.map((p) => ({
      urgencia: p.urgencia as Estado | null,
      fechaSugerida: p.fechaSugerida,
    })),
  });
}
