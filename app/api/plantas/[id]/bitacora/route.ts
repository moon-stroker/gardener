import { db } from "@/db";
import { bitacora, plantas } from "@/db/schema";
import { badRequest, esStringONulo, leerJson, notFound } from "@/lib/api";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

const TIPOS_VALIDOS = ["riego", "poda", "fertilizacion", "trasplante", "otro"];

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await leerJson(request);
  if (!body) return badRequest("El cuerpo de la solicitud debe ser un objeto JSON válido");

  if (!TIPOS_VALIDOS.includes(body.tipo as string)) {
    return badRequest(`El campo 'tipo' debe ser uno de: ${TIPOS_VALIDOS.join(", ")}`);
  }
  if ("fecha" in body && typeof body.fecha !== "string") return badRequest("'fecha' debe ser texto (ISO)");
  if ("nota" in body && !esStringONulo(body.nota)) return badRequest("'nota' debe ser texto o null");

  const [planta] = await db.select({ id: plantas.id }).from(plantas).where(eq(plantas.id, id));
  if (!planta) return notFound("Planta no encontrada");

  const [creado] = await db
    .insert(bitacora)
    .values({
      id: crypto.randomUUID(),
      plantaId: id,
      tipo: body.tipo as string,
      fecha: (body.fecha as string) ?? new Date().toISOString(),
      nota: (body.nota as string | null) ?? null,
    })
    .returning();

  return NextResponse.json(creado, { status: 201 });
}
