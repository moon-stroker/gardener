import { NextResponse } from "next/server";

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export const badRequest = (message: string) => apiError(400, "bad_request", message);
export const notFound = (message: string) => apiError(404, "not_found", message);
export const serverError = (message: string) => apiError(500, "server_error", message);

export const esStringONulo = (v: unknown): v is string | null => v === null || typeof v === "string";
export const esNumeroONulo = (v: unknown): v is number | null => v === null || (typeof v === "number" && !Number.isNaN(v));

export async function leerJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}
