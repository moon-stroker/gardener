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
}

function construirPrompt(especieActual: string | null): string {
  return `Eres un asesor experto en botánica y cuidado de plantas de interior y exterior. Analiza la foto adjunta de una planta.

${
  especieActual
    ? `El usuario ya registró la especie como "${especieActual}". Confirma o corrige tu identificación de todas formas.`
    : "El usuario no ha registrado la especie de esta planta todavía."
}

Identifica la especie (nombre común y, si puedes, nombre científico) — no asumas que se trata de un tipo de planta en particular, debe funcionar igual de bien con cualquier especie. Da un diagnóstico breve del estado visible de la planta y UNA recomendación de cuidado accionable.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes o después, con exactamente estas claves:
{
  "especie_identificada": string o null (nombre común),
  "especie_cientifica": string o null,
  "diagnostico": string (1-2 frases sobre el estado de la planta),
  "tipo": "identificacion" | "poda" | "trasplante" | "propagacion" | "plaga" | "general",
  "urgencia": "rojo" | "amarillo" | "verde",
  "fecha_sugerida": string o null (fecha ISO YYYY-MM-DD si la acción recomendada tiene una fecha objetivo)
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

  return {
    especieIdentificada: (obj.especie_identificada as string) ?? null,
    especieCientifica: (obj.especie_cientifica as string) ?? null,
    diagnostico: obj.diagnostico,
    tipo: obj.tipo as AnalisisIA["tipo"],
    urgencia: obj.urgencia as AnalisisIA["urgencia"],
    fechaSugerida: (obj.fecha_sugerida as string) ?? null,
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
