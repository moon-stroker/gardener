import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { plantas } from "@/db/schema";
import { eq, like } from "drizzle-orm";
import { GET as listar, POST as crear } from "@/app/api/plantas/route";
import { DELETE as ocultar, GET as detalle, PUT as editar } from "@/app/api/plantas/[id]/route";
import { POST as restaurar } from "@/app/api/plantas/[id]/restaurar/route";

const PREFIJO = "__test_plantas__";
const jsonReq = (url: string, method: string, body?: unknown) =>
  new NextRequest(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

afterAll(async () => {
  await db.delete(plantas).where(like(plantas.nombre, `${PREFIJO}%`));
});

describe("POST /api/plantas", () => {
  it("crea una planta con datos válidos (201)", async () => {
    const res = await crear(jsonReq("http://localhost/api/plantas", "POST", { nombre: `${PREFIJO}A`, reglaRiegoDias: 5 }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.nombre).toBe(`${PREFIJO}A`);
    expect(body.activo).toBe(1);
  });

  it("rechaza sin nombre (400)", async () => {
    const res = await crear(jsonReq("http://localhost/api/plantas", "POST", { especie: "x" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("bad_request");
  });
});

describe("GET /api/plantas", () => {
  it("solo retorna plantas activas, con estado calculado", async () => {
    const res = await listar(new NextRequest("http://localhost/api/plantas"));
    expect(res.status).toBe(200);
    const body = await res.json();
    const creada = body.find((p: { nombre: string }) => p.nombre === `${PREFIJO}A`);
    expect(creada).toBeDefined();
    expect(["rojo", "amarillo", "verde"]).toContain(creada.estado);
  });
});

describe("GET/PUT/DELETE /api/plantas/:id", () => {
  it("detalle incluye fotos, bitácora y recomendaciones vacías (200); 404 si no existe", async () => {
    const [planta] = await db.insert(plantas).values({
      id: crypto.randomUUID(),
      nombre: `${PREFIJO}B`,
      fechaInicio: new Date().toISOString(),
      creadoEn: new Date().toISOString(),
    }).returning();

    const res = await detalle(new NextRequest("http://localhost/x"), { params: Promise.resolve({ id: planta.id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fotos).toEqual([]);
    expect(body.bitacora).toEqual([]);
    expect(body.recomendaciones).toEqual([]);

    const res404 = await detalle(new NextRequest("http://localhost/x"), { params: Promise.resolve({ id: "no-existe" }) });
    expect(res404.status).toBe(404);
  });

  it("edita campos válidos (200) y rechaza valores inválidos (400)", async () => {
    const [planta] = await db.insert(plantas).values({
      id: crypto.randomUUID(),
      nombre: `${PREFIJO}C`,
      fechaInicio: new Date().toISOString(),
      creadoEn: new Date().toISOString(),
    }).returning();

    const ok = await editar(jsonReq("http://localhost/x", "PUT", { especie: "Nueva especie" }), {
      params: Promise.resolve({ id: planta.id }),
    });
    expect(ok.status).toBe(200);
    expect((await ok.json()).especie).toBe("Nueva especie");

    const malo = await editar(jsonReq("http://localhost/x", "PUT", { reglaRiegoDias: "no-numero" }), {
      params: Promise.resolve({ id: planta.id }),
    });
    expect(malo.status).toBe(400);
  });

  it("soft-delete: activo=0, desaparece del listado pero sigue en Turso; restaurar la regresa", async () => {
    const [planta] = await db.insert(plantas).values({
      id: crypto.randomUUID(),
      nombre: `${PREFIJO}D`,
      fechaInicio: new Date().toISOString(),
      creadoEn: new Date().toISOString(),
    }).returning();

    const del = await ocultar(new NextRequest("http://localhost/x"), { params: Promise.resolve({ id: planta.id }) });
    expect(del.status).toBe(200);
    expect((await del.json()).activo).toBe(0);

    const [enDb] = await db.select().from(plantas).where(eq(plantas.id, planta.id));
    expect(enDb).toBeDefined();
    expect(enDb.activo).toBe(0);

    const listado = await listar(new NextRequest("http://localhost/api/plantas"));
    const enListado = (await listado.json()).find((p: { id: string }) => p.id === planta.id);
    expect(enListado).toBeUndefined();

    const listadoOcultas = await listar(new NextRequest("http://localhost/api/plantas?ocultas=true"));
    const enOcultas = (await listadoOcultas.json()).find((p: { id: string }) => p.id === planta.id);
    expect(enOcultas).toBeDefined();

    const res = await restaurar(new NextRequest("http://localhost/x", { method: "POST" }), {
      params: Promise.resolve({ id: planta.id }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).activo).toBe(1);
  });

  it("restaurar sobre id inexistente responde 404", async () => {
    const res = await restaurar(new NextRequest("http://localhost/x", { method: "POST" }), {
      params: Promise.resolve({ id: "no-existe" }),
    });
    expect(res.status).toBe(404);
  });
});

