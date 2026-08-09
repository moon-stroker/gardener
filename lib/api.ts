import { NextResponse } from "next/server";

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export const badRequest = (message: string) => apiError(400, "bad_request", message);
export const notFound = (message: string) => apiError(404, "not_found", message);
export const serverError = (message: string) => apiError(500, "server_error", message);
