import { db } from "@/db";
import { fotos, plantas } from "@/db/schema";
import { badRequest, notFound } from "@/lib/api";
import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  if (!("nota" in body)) {
    return badRequest("El campo 'nota' es requerido");
  }

  const [actualizada] = await db.update(fotos).set({ nota: body.nota }).where(eq(fotos.id, id)).returning();
  if (!actualizada) return notFound("Foto no encontrada");

  return NextResponse.json(actualizada);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const [foto] = await db.select().from(fotos).where(eq(fotos.id, id));
  if (!foto) return notFound("Foto no encontrada");

  await del(foto.urlBlob);
  await db.delete(fotos).where(eq(fotos.id, id));

  const [planta] = await db.select({ fotoPortadaUrl: plantas.fotoPortadaUrl }).from(plantas).where(eq(plantas.id, foto.plantaId));
  if (planta?.fotoPortadaUrl === foto.urlBlob) {
    await db.update(plantas).set({ fotoPortadaUrl: null }).where(eq(plantas.id, foto.plantaId));
  }

  return NextResponse.json({ ok: true });
}
