import { db } from "@/db";
import { plantas } from "@/db/schema";
import { estadoDePlanta } from "@/lib/plantas";
import { badRequest, esNumeroONulo, esStringONulo, leerJson } from "@/lib/api";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ocultas = request.nextUrl.searchParams.get("ocultas") === "true";
  const filas = await db
    .select()
    .from(plantas)
    .where(eq(plantas.activo, ocultas ? 0 : 1));

  const conEstado = await Promise.all(
    filas.map(async (planta) => {
      if (ocultas) return { ...planta, estado: null, motivos: [] };
      const { estado, motivos } = await estadoDePlanta(planta);
      return { ...planta, estado, motivos };
    })
  );

  return NextResponse.json(conEstado);
}

export async function POST(request: NextRequest) {
  const body = await leerJson(request);
  if (!body) return badRequest("El cuerpo de la solicitud debe ser un objeto JSON válido");

  if (!body.nombre || typeof body.nombre !== "string") {
    return badRequest("El campo 'nombre' es requerido y debe ser texto");
  }
  if ("especie" in body && !esStringONulo(body.especie)) return badRequest("'especie' debe ser texto o null");
  if ("reglaRiegoDias" in body && !esNumeroONulo(body.reglaRiegoDias)) return badRequest("'reglaRiegoDias' debe ser numérico o null");
  if ("reglaPodaDias" in body && !esNumeroONulo(body.reglaPodaDias)) return badRequest("'reglaPodaDias' debe ser numérico o null");
  if ("reglaFertilizacionDias" in body && !esNumeroONulo(body.reglaFertilizacionDias)) {
    return badRequest("'reglaFertilizacionDias' debe ser numérico o null");
  }

  const ahora = new Date().toISOString();
  const [nueva] = await db
    .insert(plantas)
    .values({
      id: crypto.randomUUID(),
      nombre: body.nombre,
      especie: (body.especie as string | null) ?? null,
      fechaInicio: typeof body.fechaInicio === "string" ? body.fechaInicio : ahora,
      fotoPortadaUrl: (body.fotoPortadaUrl as string | null) ?? null,
      reglaRiegoDias: (body.reglaRiegoDias as number | null) ?? null,
      reglaPodaDias: (body.reglaPodaDias as number | null) ?? null,
      reglaFertilizacionDias: (body.reglaFertilizacionDias as number | null) ?? null,
      creadoEn: ahora,
    })
    .returning();

  return NextResponse.json(nueva, { status: 201 });
}
