import { db } from "@/db";
import { fotos } from "@/db/schema";
import { gte, sql } from "drizzle-orm";

const LIMITE_DIARIO = Number(process.env.AI_DAILY_LIMIT ?? 20);

export async function analisisDisponiblesHoy(): Promise<{ disponible: boolean; usados: number; limite: number }> {
  const inicioDia = new Date();
  inicioDia.setUTCHours(0, 0, 0, 0);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(fotos)
    .where(gte(fotos.fecha, inicioDia.toISOString()));

  return { disponible: count < LIMITE_DIARIO, usados: count, limite: LIMITE_DIARIO };
}
