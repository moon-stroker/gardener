import { db } from "@/db";
import { bitacora } from "@/db/schema";
import { badRequest, esStringONulo, leerJson, notFound } from "@/lib/api";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

const TIPOS_VALIDOS = ["riego", "poda", "fertilizacion", "trasplante", "otro"];

const VALIDADORES: Record<string, (v: unknown) => boolean> = {
  tipo: (v) => TIPOS_VALIDOS.includes(v as string),
  fecha: (v) => typeof v === "string",
  nota: esStringONulo,
};

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await leerJson(request);
  if (!body) return badRequest("El cuerpo de la solicitud debe ser un objeto JSON válido");

  const cambios: Record<string, unknown> = { editadoEn: new Date().toISOString() };
  for (const [campo, validar] of Object.entries(VALIDADORES)) {
    if (campo in body) {
      if (!validar(body[campo])) return badRequest(`El campo '${campo}' tiene un valor inválido`);
      cambios[campo] = body[campo];
    }
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
