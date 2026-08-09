import { db } from "@/db";
import { bitacora } from "@/db/schema";
import { notFound } from "@/lib/api";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

const CAMPOS_EDITABLES = ["tipo", "fecha", "nota"] as const;

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const cambios: Record<string, unknown> = { editadoEn: new Date().toISOString() };
  for (const campo of CAMPOS_EDITABLES) {
    if (campo in body) cambios[campo] = body[campo];
  }

  const [actualizado] = await db.update(bitacora).set(cambios).where(eq(bitacora.id, id)).returning();
  if (!actualizado) return notFound("Registro de bitácora no encontrado");

  return NextResponse.json(actualizado);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const [eliminado] = await db.delete(bitacora).where(eq(bitacora.id, id)).returning();
  if (!eliminado) return notFound("Registro de bitácora no encontrado");

  return NextResponse.json({ ok: true });
}
