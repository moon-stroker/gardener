import { db } from "@/db";
import { bitacora, plantas } from "@/db/schema";
import { badRequest, notFound } from "@/lib/api";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

const TIPOS_VALIDOS = ["riego", "poda", "fertilizacion", "trasplante", "otro"];

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  if (!TIPOS_VALIDOS.includes(body.tipo)) {
    return badRequest(`El campo 'tipo' debe ser uno de: ${TIPOS_VALIDOS.join(", ")}`);
  }

  const [planta] = await db.select({ id: plantas.id }).from(plantas).where(eq(plantas.id, id));
  if (!planta) return notFound("Planta no encontrada");

  const [creado] = await db
    .insert(bitacora)
    .values({
      id: crypto.randomUUID(),
      plantaId: id,
      tipo: body.tipo,
      fecha: body.fecha ?? new Date().toISOString(),
      nota: body.nota ?? null,
    })
    .returning();

  return NextResponse.json(creado, { status: 201 });
}
