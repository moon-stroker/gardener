import { db } from "@/db";
import { recomendaciones } from "@/db/schema";
import { badRequest, esStringONulo, leerJson, notFound } from "@/lib/api";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

const URGENCIAS_VALIDAS = ["rojo", "amarillo", "verde"];

const VALIDADORES: Record<string, (v: unknown) => boolean> = {
  texto: (v) => typeof v === "string" && v.length > 0,
  urgencia: (v) => v === null || URGENCIAS_VALIDAS.includes(v as string),
  fechaSugerida: esStringONulo,
  atendida: (v) => v === 0 || v === 1,
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

  const [actualizada] = await db.update(recomendaciones).set(cambios).where(eq(recomendaciones.id, id)).returning();
  if (!actualizada) return notFound("Recomendación no encontrada");

  return NextResponse.json(actualizada);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const [eliminada] = await db.delete(recomendaciones).where(eq(recomendaciones.id, id)).returning();
  if (!eliminada) return notFound("Recomendación no encontrada");

  return NextResponse.json({ ok: true });
}
