import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const TIPOS_VALIDOS = ["identificacion", "poda", "trasplante", "propagacion", "plaga", "general"] as const;
const URGENCIAS_VALIDAS = ["rojo", "amarillo", "verde"] as const;

export interface AnalisisIA {
  especieIdentificada: string | null;
  especieCientifica: string | null;
  diagnostico: string;
  tipo: (typeof TIPOS_VALIDOS)[number];
  urgencia: (typeof URGENCIAS_VALIDAS)[number];
  fechaSugerida: string | null;
  riegoSugeridoDias: number | null;
  podaSugeridaDias: number | null;
  fertilizacionSugeridaDias: number | null;
}

function construirPrompt(especieActual: string | null): string {
  return `Eres un asesor experto en botánica y cuidado de plantas de interior y exterior. Analiza la foto adjunta de una planta.

${
  especieActual
    ? `El usuario ya registró la especie como "${especieActual}". Confirma o corrige tu identificación de todas formas.`
    : "El usuario no ha registrado la especie de esta planta todavía."
}

Identifica la especie (nombre común y, si puedes, nombre científico) — no asumas que se trata de un tipo de planta en particular, debe funcionar igual de bien con cualquier especie.

El campo "diagnostico" NO debe ser solo una observación — tiene que terminar en una instrucción concreta y verificable que el usuario pueda marcar como hecha. No basta con nombrar un problema ("exceso de humedad"); di qué hacer al respecto y, si aplica, por cuánto tiempo o hasta qué señal ("no vuelvas a regar hasta que los primeros 3cm de tierra estén secos al tacto, probablemente en 5-7 días" es accionable; "hay exceso de humedad" no lo es). Máximo 2 frases: una de diagnóstico, una de acción concreta.

Además, como experto, sugiere cada cuántos días conviene regar, podar y fertilizar ESTA especie en condiciones típicas de interior/exterior en casa — el usuario no tiene por qué saberlo, es justo lo que te está pidiendo. Si no logras identificar la especie con confianza suficiente para sugerir una frecuencia razonable, usa null en vez de inventar un número.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes o después, con exactamente estas claves:
{
  "especie_identificada": string o null (nombre común),
  "especie_cientifica": string o null,
  "diagnostico": string (1-2 frases: qué observas + qué acción concreta debe tomar el usuario),
  "tipo": "identificacion" | "poda" | "trasplante" | "propagacion" | "plaga" | "general",
  "urgencia": "rojo" | "amarillo" | "verde",
  "fecha_sugerida": string o null (fecha ISO YYYY-MM-DD si la acción recomendada tiene una fecha objetivo),
  "riego_sugerido_dias": number o null (cada cuántos días regar esta especie),
  "poda_sugerida_dias": number o null (cada cuántos días revisar/podar; null si esta especie no suele necesitar poda regular),
  "fertilizacion_sugerida_dias": number o null (cada cuántos días fertilizar; null si no aplica)
}`;
}

function extraerJson(texto: string): Record<string, unknown> {
  const match = texto.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("La respuesta de la IA no contiene JSON");
  return JSON.parse(match[0]);
}

function validar(obj: Record<string, unknown>): AnalisisIA {
  if (typeof obj.diagnostico !== "string") throw new Error("Falta 'diagnostico' en la respuesta de la IA");
  if (!TIPOS_VALIDOS.includes(obj.tipo as (typeof TIPOS_VALIDOS)[number])) {
    throw new Error("'tipo' inválido en la respuesta de la IA");
  }
  if (!URGENCIAS_VALIDAS.includes(obj.urgencia as (typeof URGENCIAS_VALIDAS)[number])) {
    throw new Error("'urgencia' inválida en la respuesta de la IA");
  }

  const numeroONulo = (v: unknown): number | null => (typeof v === "number" && !Number.isNaN(v) ? v : null);

  return {
    especieIdentificada: (obj.especie_identificada as string) ?? null,
    especieCientifica: (obj.especie_cientifica as string) ?? null,
    diagnostico: obj.diagnostico,
    tipo: obj.tipo as AnalisisIA["tipo"],
    urgencia: obj.urgencia as AnalisisIA["urgencia"],
    fechaSugerida: (obj.fecha_sugerida as string) ?? null,
    riegoSugeridoDias: numeroONulo(obj.riego_sugerido_dias),
    podaSugeridaDias: numeroONulo(obj.poda_sugerida_dias),
    fertilizacionSugeridaDias: numeroONulo(obj.fertilizacion_sugerida_dias),
  };
}

async function intentarAnalisis(imagenBase64: string, mediaType: string, especieActual: string | null): Promise<AnalisisIA> {
  const mensaje = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: imagenBase64,
            },
          },
          { type: "text", text: construirPrompt(especieActual) },
        ],
      },
    ],
  });

  const bloqueTexto = mensaje.content.find((b) => b.type === "text");
  if (!bloqueTexto || bloqueTexto.type !== "text") throw new Error("La IA no devolvió texto");

  return validar(extraerJson(bloqueTexto.text));
}

// Reintenta una vez ante timeout, error de red, o respuesta que no es JSON válido.
export async function analizarFoto(imagenBase64: string, mediaType: string, especieActual: string | null): Promise<AnalisisIA> {
  try {
    return await intentarAnalisis(imagenBase64, mediaType, especieActual);
  } catch {
    return await intentarAnalisis(imagenBase64, mediaType, especieActual);
  }
}
