import { db } from "@/db";
import { fotos, plantas, recomendaciones } from "@/db/schema";
import { badRequest, notFound, serverError } from "@/lib/api";
import { analizarFoto } from "@/lib/anthropic";
import { analisisDisponiblesHoy } from "@/lib/rate-limit";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

const TIPOS_IMAGEN_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const [planta] = await db.select().from(plantas).where(eq(plantas.id, id));
  if (!planta) return notFound("Planta no encontrada");

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return badRequest("Se requiere un archivo 'file'");
  }
  if (!TIPOS_IMAGEN_PERMITIDOS.includes(file.type)) {
    return badRequest(`Formato de imagen no soportado. Usa: ${TIPOS_IMAGEN_PERMITIDOS.join(", ")}`);
  }

  let urlBlob: string;
  try {
    const subida = await put(`plantas/${id}/${crypto.randomUUID()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: false,
    });
    urlBlob = subida.url;
  } catch {
    return serverError("No se pudo subir la imagen. Nada se guardó en la base de datos.");
  }

  const notaCampo = formData.get("nota");
  const nota = typeof notaCampo === "string" && notaCampo.length > 0 ? notaCampo : null;
  const ahora = new Date().toISOString();

  const [foto] = await db
    .insert(fotos)
    .values({ id: crypto.randomUUID(), plantaId: id, urlBlob, fecha: ahora, nota })
    .returning();

  const { disponible, limite } = await analisisDisponiblesHoy();
  if (!disponible) {
    return NextResponse.json({
      foto,
      recomendacion: null,
      analisis: {
        estado: "limite_alcanzado",
        mensaje: `Se alcanzó el límite diario de ${limite} análisis con IA. La foto quedó guardada; el análisis se puede reintentar más tarde.`,
      },
    });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const resultado = await analizarFoto(buffer.toString("base64"), file.type, planta.especie);

    const [recomendacion] = await db
      .insert(recomendaciones)
      .values({
        id: crypto.randomUUID(),
        plantaId: id,
        fotoId: foto.id,
        texto: resultado.diagnostico,
        tipo: resultado.tipo,
        fechaSugerida: resultado.fechaSugerida,
        urgencia: resultado.urgencia,
        atendida: 0,
        creadoEn: ahora,
      })
      .returning();

    if (resultado.especieIdentificada) {
      await db
        .update(plantas)
        .set(
          planta.especie
            ? { especieSugeridaIa: resultado.especieIdentificada }
            : { especie: resultado.especieIdentificada, especieSugeridaIa: resultado.especieIdentificada }
        )
        .where(eq(plantas.id, id));
    }

    return NextResponse.json({ foto, recomendacion, analisis: { estado: "ok" } });
  } catch {
    const [recomendacionPendiente] = await db
      .insert(recomendaciones)
      .values({
        id: crypto.randomUUID(),
        plantaId: id,
        fotoId: foto.id,
        texto: "El análisis con IA no pudo completarse (falló tras un reintento). La foto quedó guardada — puedes reintentar el análisis más tarde.",
        tipo: "general",
        urgencia: null,
        atendida: 0,
        creadoEn: ahora,
      })
      .returning();

    return NextResponse.json({
      foto,
      recomendacion: recomendacionPendiente,
      analisis: { estado: "pendiente", mensaje: "El análisis de IA falló y quedó pendiente de reintento manual." },
    });
  }
}
