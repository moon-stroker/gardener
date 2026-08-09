import { db } from "@/db";
import { plantas } from "@/db/schema";
import { estadoDePlanta } from "@/lib/plantas";
import { badRequest } from "@/lib/api";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ocultas = request.nextUrl.searchParams.get("ocultas") === "true";
  const filas = await db
    .select()
    .from(plantas)
    .where(eq(plantas.activo, ocultas ? 0 : 1));

  const conEstado = await Promise.all(
    filas.map(async (planta) => ({
      ...planta,
      estado: ocultas ? null : await estadoDePlanta(planta),
    }))
  );

  return NextResponse.json(conEstado);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.nombre || typeof body.nombre !== "string") {
    return badRequest("El campo 'nombre' es requerido");
  }

  const ahora = new Date().toISOString();
  const [nueva] = await db
    .insert(plantas)
    .values({
      id: crypto.randomUUID(),
      nombre: body.nombre,
      especie: body.especie ?? null,
      fechaInicio: body.fechaInicio ?? ahora,
      fotoPortadaUrl: body.fotoPortadaUrl ?? null,
      reglaRiegoDias: body.reglaRiegoDias ?? 3,
      reglaPodaDias: body.reglaPodaDias ?? null,
      reglaFertilizacionDias: body.reglaFertilizacionDias ?? null,
      creadoEn: ahora,
    })
    .returning();

  return NextResponse.json(nueva, { status: 201 });
}
