import { db } from "@/db";
import { recomendaciones } from "@/db/schema";
import { notFound } from "@/lib/api";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

const CAMPOS_EDITABLES = ["texto", "urgencia", "fechaSugerida", "atendida"] as const;

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const cambios: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (campo in body) cambios[campo] = body[campo];
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
