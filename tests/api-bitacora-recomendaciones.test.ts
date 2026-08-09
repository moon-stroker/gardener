import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { bitacora, plantas, recomendaciones } from "@/db/schema";
import { eq, like } from "drizzle-orm";
import { POST as crearBitacora } from "@/app/api/plantas/[id]/bitacora/route";
import { DELETE as borrarBitacora, PUT as editarBitacora } from "@/app/api/bitacora/[id]/route";
import { DELETE as borrarRecomendacion, PUT as editarRecomendacion } from "@/app/api/recomendaciones/[id]/route";

const PREFIJO = "__test_bitrec__";
const jsonReq = (body?: unknown) =>
  new NextRequest("http://localhost/x", {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
const jsonPut = (body: unknown) =>
  new NextRequest("http://localhost/x", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

async function crearPlantaDePrueba() {
  const [planta] = await db
    .insert(plantas)
    .values({ id: crypto.randomUUID(), nombre: `${PREFIJO}`, fechaInicio: new Date().toISOString(), creadoEn: new Date().toISOString() })
    .returning();
  return planta;
}

afterAll(async () => {
  const plantasDePrueba = await db.select({ id: plantas.id }).from(plantas).where(like(plantas.nombre, `${PREFIJO}%`));
  for (const { id } of plantasDePrueba) {
    await db.delete(bitacora).where(eq(bitacora.plantaId, id));
    await db.delete(recomendaciones).where(eq(recomendaciones.plantaId, id));
  }
  await db.delete(plantas).where(like(plantas.nombre, `${PREFIJO}%`));
});

describe("POST /api/plantas/:id/bitacora", () => {
  it("crea un registro válido (201) y rechaza tipo inválido (400)", async () => {
    const planta = await crearPlantaDePrueba();

    const ok = await crearBitacora(jsonReq({ tipo: "riego", nota: "250ml" }), { params: Promise.resolve({ id: planta.id }) });
    expect(ok.status).toBe(201);
    const creado = await ok.json();
    expect(creado.tipo).toBe("riego");

    const malo = await crearBitacora(jsonReq({ tipo: "volar" }), { params: Promise.resolve({ id: planta.id }) });
    expect(malo.status).toBe(400);
  });

  it("404 si la planta no existe", async () => {
    const res = await crearBitacora(jsonReq({ tipo: "riego" }), { params: Promise.resolve({ id: "no-existe" }) });
    expect(res.status).toBe(404);
  });
});

describe("PUT/DELETE /api/bitacora/:id", () => {
  it("edita (200), rechaza tipo inválido (400), y 404 en id inexistente", async () => {
    const planta = await crearPlantaDePrueba();
    const [entrada] = await db
      .insert(bitacora)
      .values({ id: crypto.randomUUID(), plantaId: planta.id, tipo: "poda", fecha: new Date().toISOString() })
      .returning();

    const ok = await editarBitacora(jsonPut({ nota: "editado" }), { params: Promise.resolve({ id: entrada.id }) });
    expect(ok.status).toBe(200);
    expect((await ok.json()).nota).toBe("editado");

    const malo = await editarBitacora(jsonPut({ tipo: "no-valido" }), { params: Promise.resolve({ id: entrada.id }) });
    expect(malo.status).toBe(400);

    const notFound = await editarBitacora(jsonPut({ nota: "x" }), { params: Promise.resolve({ id: "no-existe" }) });
    expect(notFound.status).toBe(404);
  });

  it("borra un registro (200) y 404 si ya no existe", async () => {
    const planta = await crearPlantaDePrueba();
    const [entrada] = await db
      .insert(bitacora)
      .values({ id: crypto.randomUUID(), plantaId: planta.id, tipo: "otro", fecha: new Date().toISOString() })
      .returning();

    const ok = await borrarBitacora(new NextRequest("http://localhost/x", { method: "DELETE" }), { params: Promise.resolve({ id: entrada.id }) });
    expect(ok.status).toBe(200);

    const otraVez = await borrarBitacora(new NextRequest("http://localhost/x", { method: "DELETE" }), { params: Promise.resolve({ id: entrada.id }) });
    expect(otraVez.status).toBe(404);
  });
});

describe("PUT/DELETE /api/recomendaciones/:id", () => {
  it("marca atendida (200) y rechaza urgencia inválida (400)", async () => {
    const planta = await crearPlantaDePrueba();
    const [rec] = await db
      .insert(recomendaciones)
      .values({
        id: crypto.randomUUID(),
        plantaId: planta.id,
        texto: "riega pronto",
        tipo: "general",
        urgencia: "amarillo",
        atendida: 0,
        creadoEn: new Date().toISOString(),
      })
      .returning();

    const ok = await editarRecomendacion(jsonPut({ atendida: 1 }), { params: Promise.resolve({ id: rec.id }) });
    expect(ok.status).toBe(200);
    expect((await ok.json()).atendida).toBe(1);

    const malo = await editarRecomendacion(jsonPut({ urgencia: "azul" }), { params: Promise.resolve({ id: rec.id }) });
    expect(malo.status).toBe(400);
  });

  it("descarta una recomendación (200) y 404 si ya no existe", async () => {
    const planta = await crearPlantaDePrueba();
    const [rec] = await db
      .insert(recomendaciones)
      .values({ id: crypto.randomUUID(), plantaId: planta.id, texto: "x", tipo: "general", atendida: 0, creadoEn: new Date().toISOString() })
      .returning();

    const ok = await borrarRecomendacion(new NextRequest("http://localhost/x", { method: "DELETE" }), { params: Promise.resolve({ id: rec.id }) });
    expect(ok.status).toBe(200);

    const otraVez = await borrarRecomendacion(new NextRequest("http://localhost/x", { method: "DELETE" }), { params: Promise.resolve({ id: rec.id }) });
    expect(otraVez.status).toBe(404);
  });
});
