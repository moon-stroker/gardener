import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const URGENCIAS_VALIDAS = ["rojo", "amarillo", "verde"] as const;
const ASPECTOS = ["riego", "poda", "fertilizacion", "trasplante", "general"] as const;
export type Aspecto = (typeof ASPECTOS)[number];

export interface AnalisisAspecto {
  urgencia: (typeof URGENCIAS_VALIDAS)[number];
  diagnostico: string;
  fechaSugerida: string | null;
}

export interface AnalisisIA {
  especieIdentificada: string | null;
  especieCientifica: string | null;
  especieCoincide: boolean;
  riegoSugeridoDias: number | null;
  podaSugeridaDias: number | null;
  fertilizacionSugeridaDias: number | null;
  aspectos: Record<Aspecto, AnalisisAspecto>;
}

function construirPrompt(especieActual: string | null): string {
  return `Eres un asesor experto en botánica y cuidado de plantas de interior y exterior. Analiza la foto adjunta de una planta.

${
  especieActual
    ? `El usuario ya registró la especie como "${especieActual}". Identifica la especie de todas formas y determina si tu identificación se refiere a LA MISMA especie que la registrada — no compares el texto literal, compara el significado: "Aretillo (Fuchsia)", "Aretillo o Fucsia" y "Fuchsia" son la MISMA especie con distinta redacción, eso SÍ coincide. Solo marca que no coincide si es una especie genuinamente distinta.`
    : "El usuario no ha registrado la especie de esta planta todavía."
}

Identifica la especie (nombre común y, si puedes, nombre científico) — no asumas que se trata de un tipo de planta en particular, debe funcionar igual de bien con cualquier especie.

Evalúa SIEMPRE estos 5 aspectos, uno por uno, aunque a simple vista la foto no muestre ningún problema: riego, poda, fertilización, trasplante, y cuidados generales (plagas, luz, aspecto general no cubierto por los anteriores). Para cada aspecto:
- Si está en buen estado ("verde"), dilo en una frase breve y confirmatoria (ej. "El riego actual es adecuado, sigue igual").
- Si necesita atención ("amarillo" o "rojo"), el diagnóstico NO debe ser solo una observación — tiene que terminar en una instrucción concreta y verificable que el usuario pueda marcar como hecha. No basta con nombrar un problema ("exceso de humedad"); di qué hacer al respecto y, si aplica, por cuánto tiempo o hasta qué señal ("no vuelvas a regar hasta que los primeros 3cm de tierra estén secos al tacto, probablemente en 5-7 días" es accionable; "hay exceso de humedad" no lo es). Máximo 2 frases.
- El aspecto "trasplante" solo debe marcarse amarillo/rojo si hay una señal visible real (raíces saliendo de drenaje, maceta visiblemente pequeña, etc.) — no lo fuerces si no aplica, la mayoría de las fotos deberían dar "trasplante" en verde.

Además, como experto, sugiere cada cuántos días conviene regar, podar y fertilizar ESTA especie en condiciones típicas de interior/exterior en casa — el usuario no tiene por qué saberlo, es justo lo que te está pidiendo. Si no logras identificar la especie con confianza suficiente para sugerir una frecuencia razonable, usa null en vez de inventar un número.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes o después, con exactamente estas claves:
{
  "especie_identificada": string o null (nombre común),
  "especie_cientifica": string o null,
  "especie_coincide": true o false (${especieActual ? `¿tu identificación es la misma especie que "${especieActual}", aunque esté redactada distinto?` : "usa true, no hay especie registrada con qué comparar"}),
  "riego_sugerido_dias": number o null (cada cuántos días regar esta especie),
  "poda_sugerida_dias": number o null (cada cuántos días revisar/podar; null si esta especie no suele necesitar poda regular),
  "fertilizacion_sugerida_dias": number o null (cada cuántos días fertilizar; null si no aplica),
  "riego": { "urgencia": "rojo"|"amarillo"|"verde", "diagnostico": string },
  "poda": { "urgencia": "rojo"|"amarillo"|"verde", "diagnostico": string },
  "fertilizacion": { "urgencia": "rojo"|"amarillo"|"verde", "diagnostico": string },
  "trasplante": { "urgencia": "rojo"|"amarillo"|"verde", "diagnostico": string, "fecha_sugerida": string o null (ISO YYYY-MM-DD si aplica) },
  "general": { "urgencia": "rojo"|"amarillo"|"verde", "diagnostico": string }
}`;
}

function extraerJson(texto: string): Record<string, unknown> {
  const match = texto.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("La respuesta de la IA no contiene JSON");
  return JSON.parse(match[0]);
}

function validarAspecto(obj: unknown, nombre: string): AnalisisAspecto {
  if (typeof obj !== "object" || obj === null) throw new Error(`Falta el aspecto '${nombre}' en la respuesta de la IA`);
  const a = obj as Record<string, unknown>;
  if (typeof a.diagnostico !== "string") throw new Error(`Falta 'diagnostico' en el aspecto '${nombre}'`);
  if (!URGENCIAS_VALIDAS.includes(a.urgencia as (typeof URGENCIAS_VALIDAS)[number])) {
    throw new Error(`'urgencia' inválida en el aspecto '${nombre}'`);
  }
  return {
    urgencia: a.urgencia as AnalisisAspecto["urgencia"],
    diagnostico: a.diagnostico,
    fechaSugerida: (a.fecha_sugerida as string) ?? null,
  };
}

function validar(obj: Record<string, unknown>): AnalisisIA {
  const numeroONulo = (v: unknown): number | null => (typeof v === "number" && !Number.isNaN(v) ? v : null);

  const aspectos = Object.fromEntries(ASPECTOS.map((clave) => [clave, validarAspecto(obj[clave], clave)])) as Record<
    Aspecto,
    AnalisisAspecto
  >;

  return {
    especieIdentificada: (obj.especie_identificada as string) ?? null,
    especieCientifica: (obj.especie_cientifica as string) ?? null,
    especieCoincide: obj.especie_coincide !== false,
    riegoSugeridoDias: numeroONulo(obj.riego_sugerido_dias),
    podaSugeridaDias: numeroONulo(obj.poda_sugerida_dias),
    fertilizacionSugeridaDias: numeroONulo(obj.fertilizacion_sugerida_dias),
    aspectos,
  };
}

async function intentarAnalisis(imagenBase64: string, mediaType: string, especieActual: string | null): Promise<AnalisisIA> {
  const mensaje = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1200,
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

export interface SugerenciaCuidado {
  riegoSugeridoDias: number | null;
  podaSugeridaDias: number | null;
  fertilizacionSugeridaDias: number | null;
}

async function intentarSugerenciaCuidado(especie: string): Promise<SugerenciaCuidado> {
  const mensaje = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Eres un asesor experto en botánica. Para la especie "${especie}", en condiciones típicas de interior/exterior en casa, sugiere cada cuántos días conviene regarla, podarla/revisarla y fertilizarla.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes o después:
{
  "riego_sugerido_dias": number o null,
  "poda_sugerida_dias": number o null (null si esta especie no suele necesitar poda regular),
  "fertilizacion_sugerida_dias": number o null (null si no aplica)
}`,
      },
    ],
  });

  const bloqueTexto = mensaje.content.find((b) => b.type === "text");
  if (!bloqueTexto || bloqueTexto.type !== "text") throw new Error("La IA no devolvió texto");

  const obj = extraerJson(bloqueTexto.text);
  const numeroONulo = (v: unknown): number | null => (typeof v === "number" && !Number.isNaN(v) ? v : null);

  return {
    riegoSugeridoDias: numeroONulo(obj.riego_sugerido_dias),
    podaSugeridaDias: numeroONulo(obj.poda_sugerida_dias),
    fertilizacionSugeridaDias: numeroONulo(obj.fertilizacion_sugerida_dias),
  };
}

export async function sugerirCuidadosPorEspecie(especie: string): Promise<SugerenciaCuidado> {
  try {
    return await intentarSugerenciaCuidado(especie);
  } catch {
    return await intentarSugerenciaCuidado(especie);
  }
}
