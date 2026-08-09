import { db } from "@/db";
import { bitacora, fotos, plantas, recomendaciones } from "@/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  const [todasLasPlantas, todasLasFotos, todaLaBitacora, todasLasRecomendaciones] = await Promise.all([
    db.select().from(plantas),
    db.select().from(fotos),
    db.select().from(bitacora),
    db.select().from(recomendaciones),
  ]);

  const datos = todasLasPlantas.map((planta) => ({
    ...planta,
    fotos: todasLasFotos.filter((f) => f.plantaId === planta.id),
    bitacora: todaLaBitacora.filter((b) => b.plantaId === planta.id),
    recomendaciones: todasLasRecomendaciones.filter((r) => r.plantaId === planta.id),
  }));

  return NextResponse.json(
    { exportadoEn: new Date().toISOString(), plantas: datos },
    { headers: { "Content-Disposition": `attachment; filename="mis-plantas-${new Date().toISOString().slice(0, 10)}.json"` } }
  );
}
