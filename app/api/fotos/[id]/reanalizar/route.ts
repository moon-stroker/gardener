import { db } from "@/db";
import { fotos, plantas, recomendaciones } from "@/db/schema";
import { notFound } from "@/lib/api";
import { analizarFoto } from "@/lib/anthropic";
import { analisisDisponiblesHoy } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const [foto] = await db.select().from(fotos).where(eq(fotos.id, id));
  if (!foto) return notFound("Foto no encontrada");

  const [planta] = await db.select().from(plantas).where(eq(plantas.id, foto.plantaId));
  if (!planta) return notFound("Planta no encontrada");

  const { disponible, limite } = await analisisDisponiblesHoy();
  if (!disponible) {
    return NextResponse.json({
      recomendacion: null,
      analisis: { estado: "limite_alcanzado", mensaje: `Se alcanzó el límite diario de ${limite} análisis con IA. Intenta más tarde.` },
    });
  }

  try {
    const respuestaBlob = await fetch(foto.urlBlob);
    if (!respuestaBlob.ok) throw new Error("No se pudo leer la foto guardada");
    const mediaType = respuestaBlob.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await respuestaBlob.arrayBuffer());

    const resultado = await analizarFoto(buffer.toString("base64"), mediaType, planta.especie);

    const [recomendacion] = await db
      .insert(recomendaciones)
      .values({
        id: crypto.randomUUID(),
        plantaId: planta.id,
        fotoId: foto.id,
        texto: resultado.diagnostico,
        tipo: resultado.tipo,
        fechaSugerida: resultado.fechaSugerida,
        urgencia: resultado.urgencia,
        atendida: 0,
        creadoEn: new Date().toISOString(),
      })
      .returning();

    const cambiosPlanta: Record<string, unknown> = {};
    if (resultado.especieIdentificada) {
      Object.assign(
        cambiosPlanta,
        planta.especie
          ? { especieSugeridaIa: resultado.especieIdentificada }
          : { especie: resultado.especieIdentificada, especieSugeridaIa: resultado.especieIdentificada }
      );
    }
    if (planta.reglaRiegoDias == null && resultado.riegoSugeridoDias != null) cambiosPlanta.reglaRiegoDias = resultado.riegoSugeridoDias;
    if (planta.reglaPodaDias == null && resultado.podaSugeridaDias != null) cambiosPlanta.reglaPodaDias = resultado.podaSugeridaDias;
    if (planta.reglaFertilizacionDias == null && resultado.fertilizacionSugeridaDias != null) {
      cambiosPlanta.reglaFertilizacionDias = resultado.fertilizacionSugeridaDias;
    }
    if (Object.keys(cambiosPlanta).length > 0) {
      await db.update(plantas).set(cambiosPlanta).where(eq(plantas.id, planta.id));
    }

    return NextResponse.json({ recomendacion, analisis: { estado: "ok" } });
  } catch {
    return NextResponse.json({
      recomendacion: null,
      analisis: { estado: "pendiente", mensaje: "El reintento también falló. Puedes intentarlo de nuevo más tarde." },
    });
  }
}
