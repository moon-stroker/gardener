import { db } from "@/db";
import { plantas } from "@/db/schema";
import { notFound } from "@/lib/api";
import { sugerirCuidadosPorEspecie } from "@/lib/anthropic";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

// Acepta la especie sugerida por la IA (especie_sugerida_ia -> especie) y recalibra
// las reglas de cuidado para la especie correcta, sin esperar a la próxima foto.
export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const [planta] = await db.select().from(plantas).where(eq(plantas.id, id));
  if (!planta) return notFound("Planta no encontrada");
  if (!planta.especieSugeridaIa) return notFound("Esta planta no tiene una especie sugerida por la IA");

  const cambios: Record<string, unknown> = { especie: planta.especieSugeridaIa };

  try {
    const sugerencia = await sugerirCuidadosPorEspecie(planta.especieSugeridaIa);
    cambios.reglaRiegoDias = sugerencia.riegoSugeridoDias;
    cambios.reglaPodaDias = sugerencia.podaSugeridaDias;
    cambios.reglaFertilizacionDias = sugerencia.fertilizacionSugeridaDias;
  } catch {
    // Si falla la recalibración, igual se confirma la especie; las reglas quedan como estaban.
  }

  const [actualizada] = await db.update(plantas).set(cambios).where(eq(plantas.id, id)).returning();
  return NextResponse.json(actualizada);
}
