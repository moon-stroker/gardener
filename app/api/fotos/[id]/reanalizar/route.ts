import { db } from "@/db";
import { fotos, plantas } from "@/db/schema";
import { notFound } from "@/lib/api";
import { analizarFoto } from "@/lib/anthropic";
import { analisisDisponiblesHoy } from "@/lib/rate-limit";
import { crearRecomendacionesDeAnalisis, descartarRecomendacionesPendientes } from "@/lib/plantas";
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
      recomendaciones: [],
      analisis: { estado: "limite_alcanzado", mensaje: `Se alcanzó el límite diario de ${limite} análisis con IA. Intenta más tarde.` },
    });
  }

  try {
    const respuestaBlob = await fetch(foto.urlBlob);
    if (!respuestaBlob.ok) throw new Error("No se pudo leer la foto guardada");
    const mediaType = respuestaBlob.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await respuestaBlob.arrayBuffer());

    const resultado = await analizarFoto(buffer.toString("base64"), mediaType, planta.especie);

    await descartarRecomendacionesPendientes(planta.id);
    const ahora = new Date().toISOString();
    const recomendacionesCreadas = await crearRecomendacionesDeAnalisis(planta.id, foto.id, resultado.aspectos, ahora);

    const cambiosPlanta: Record<string, unknown> = {};
    if (resultado.especieIdentificada) {
      if (!planta.especie) {
        cambiosPlanta.especie = resultado.especieIdentificada;
        cambiosPlanta.especieSugeridaIa = resultado.especieIdentificada;
      } else if (!resultado.especieCoincide) {
        cambiosPlanta.especieSugeridaIa = resultado.especieIdentificada;
      }
    }
    if (planta.reglaRiegoDias == null && resultado.riegoSugeridoDias != null) cambiosPlanta.reglaRiegoDias = resultado.riegoSugeridoDias;
    if (planta.reglaPodaDias == null && resultado.podaSugeridaDias != null) cambiosPlanta.reglaPodaDias = resultado.podaSugeridaDias;
    if (planta.reglaFertilizacionDias == null && resultado.fertilizacionSugeridaDias != null) {
      cambiosPlanta.reglaFertilizacionDias = resultado.fertilizacionSugeridaDias;
    }
    if (Object.keys(cambiosPlanta).length > 0) {
      await db.update(plantas).set(cambiosPlanta).where(eq(plantas.id, planta.id));
    }

    const mensaje = recomendacionesCreadas.length === 0 ? "¡Todo en orden! La IA no encontró nada que necesite atención." : undefined;
    return NextResponse.json({ recomendaciones: recomendacionesCreadas, analisis: { estado: "ok", mensaje } });
  } catch {
    return NextResponse.json({
      recomendaciones: [],
      analisis: { estado: "pendiente", mensaje: "El reintento también falló. Puedes intentarlo de nuevo más tarde." },
    });
  }
}
