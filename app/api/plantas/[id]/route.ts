import { db } from "@/db";
import { bitacora, fotos, plantas, recomendaciones } from "@/db/schema";
import { estadoDePlanta } from "@/lib/plantas";
import { badRequest, esNumeroONulo, esStringONulo, leerJson, notFound } from "@/lib/api";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const [planta] = await db.select().from(plantas).where(eq(plantas.id, id));
  if (!planta) return notFound("Planta no encontrada");

  const [fotosDePlanta, bitacoraDePlanta, recomendacionesDePlanta, estado] = await Promise.all([
    db.select().from(fotos).where(eq(fotos.plantaId, id)).orderBy(desc(fotos.fecha)),
    db.select().from(bitacora).where(eq(bitacora.plantaId, id)).orderBy(desc(bitacora.fecha)),
    db.select().from(recomendaciones).where(eq(recomendaciones.plantaId, id)).orderBy(desc(recomendaciones.creadoEn)),
    estadoDePlanta(planta),
  ]);

  return NextResponse.json({
    ...planta,
    estado,
    fotos: fotosDePlanta,
    bitacora: bitacoraDePlanta,
    recomendaciones: recomendacionesDePlanta,
  });
}

const VALIDADORES: Record<string, (v: unknown) => boolean> = {
  nombre: (v) => typeof v === "string" && v.length > 0,
  especie: esStringONulo,
  fotoPortadaUrl: esStringONulo,
  reglaRiegoDias: esNumeroONulo,
  reglaPodaDias: esNumeroONulo,
  reglaFertilizacionDias: esNumeroONulo,
};

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await leerJson(request);
  if (!body) return badRequest("El cuerpo de la solicitud debe ser un objeto JSON válido");

  const cambios: Record<string, unknown> = {};
  for (const [campo, validar] of Object.entries(VALIDADORES)) {
    if (campo in body) {
      if (!validar(body[campo])) return badRequest(`El campo '${campo}' tiene un valor inválido`);
      cambios[campo] = body[campo];
    }
  }
  if (Object.keys(cambios).length === 0) {
    return badRequest("No se envió ningún campo editable");
  }

  const [actualizada] = await db.update(plantas).set(cambios).where(eq(plantas.id, id)).returning();
  if (!actualizada) return notFound("Planta no encontrada");

  return NextResponse.json(actualizada);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const [actualizada] = await db.update(plantas).set({ activo: 0 }).where(eq(plantas.id, id)).returning();
  if (!actualizada) return notFound("Planta no encontrada");

  return NextResponse.json(actualizada);
}
