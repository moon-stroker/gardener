import { db } from "@/db";
import { plantas } from "@/db/schema";
import { notFound } from "@/lib/api";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const [actualizada] = await db.update(plantas).set({ activo: 1 }).where(eq(plantas.id, id)).returning();
  if (!actualizada) return notFound("Planta no encontrada");

  return NextResponse.json(actualizada);
}
