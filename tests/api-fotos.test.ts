import { put } from "@vercel/blob";
import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { fotos, plantas } from "@/db/schema";
import { eq, like } from "drizzle-orm";
import { DELETE as borrarFoto, PUT as editarFoto } from "@/app/api/fotos/[id]/route";
import { POST as reanalizar } from "@/app/api/fotos/[id]/reanalizar/route";

const PREFIJO = "__test_fotos__";
const jsonPut = (body: unknown) =>
  new NextRequest("http://localhost/x", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

async function crearPlantaConFoto(fotoPortada = false) {
  const [planta] = await db
    .insert(plantas)
    .values({ id: crypto.randomUUID(), nombre: `${PREFIJO}`, fechaInicio: new Date().toISOString(), creadoEn: new Date().toISOString() })
    .returning();

  const subida = await put(`__tests__/${crypto.randomUUID()}.txt`, "contenido de prueba", { access: "public", addRandomSuffix: false });

  if (fotoPortada) {
    await db.update(plantas).set({ fotoPortadaUrl: subida.url }).where(eq(plantas.id, planta.id));
  }

  const [foto] = await db
    .insert(fotos)
    .values({ id: crypto.randomUUID(), plantaId: planta.id, urlBlob: subida.url, fecha: new Date().toISOString() })
    .returning();

  return { planta, foto };
}

afterAll(async () => {
  const plantasDePrueba = await db.select({ id: plantas.id }).from(plantas).where(like(plantas.nombre, `${PREFIJO}%`));
  for (const { id } of plantasDePrueba) {
    await db.delete(fotos).where(eq(fotos.plantaId, id));
  }
  await db.delete(plantas).where(like(plantas.nombre, `${PREFIJO}%`));
});

describe("PUT /api/fotos/:id", () => {
  it("edita la nota (200) y rechaza body inválido (400)", async () => {
    const { foto } = await crearPlantaConFoto();

    const ok = await editarFoto(jsonPut({ nota: "hoja nueva" }), { params: Promise.resolve({ id: foto.id }) });
    expect(ok.status).toBe(200);
    expect((await ok.json()).nota).toBe("hoja nueva");

    const malo = await editarFoto(jsonPut({}), { params: Promise.resolve({ id: foto.id }) });
    expect(malo.status).toBe(400);

    const notFound = await editarFoto(jsonPut({ nota: "x" }), { params: Promise.resolve({ id: "no-existe" }) });
    expect(notFound.status).toBe(404);
  });
});

describe("DELETE /api/fotos/:id", () => {
  it("borra la foto y limpia la portada si coincide (200); 404 si no existe", async () => {
    const { planta, foto } = await crearPlantaConFoto(true);

    const res = await borrarFoto(new NextRequest("http://localhost/x", { method: "DELETE" }), { params: Promise.resolve({ id: foto.id }) });
    expect(res.status).toBe(200);

    const [enDb] = await db.select().from(fotos).where(eq(fotos.id, foto.id));
    expect(enDb).toBeUndefined();

    const [plantaActualizada] = await db.select().from(plantas).where(eq(plantas.id, planta.id));
    expect(plantaActualizada.fotoPortadaUrl).toBeNull();

    const otraVez = await borrarFoto(new NextRequest("http://localhost/x", { method: "DELETE" }), { params: Promise.resolve({ id: foto.id }) });
    expect(otraVez.status).toBe(404);
  });
});

describe("POST /api/fotos/:id/reanalizar", () => {
  it("404 si la foto no existe", async () => {
    const res = await reanalizar(new NextRequest("http://localhost/x", { method: "POST" }), { params: Promise.resolve({ id: "no-existe" }) });
    expect(res.status).toBe(404);
  });
});
