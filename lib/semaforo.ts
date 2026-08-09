export type Estado = "rojo" | "amarillo" | "verde";

const PESO: Record<Estado, number> = { verde: 0, amarillo: 1, rojo: 2 };

function peorDe(a: Estado, b: Estado): Estado {
  return PESO[b] > PESO[a] ? b : a;
}

function diasDesde(fechaIso: string, ahora: Date): number {
  return Math.floor((ahora.getTime() - new Date(fechaIso).getTime()) / 86_400_000);
}

interface Senal {
  estado: Estado;
  motivo: string;
}

const ETIQUETA_REGLA = { riego: "Riego", poda: "Poda", fertilización: "Fertilización" } as const;

// Si nunca hay bitácora para esa regla, se usa fechaInicio como línea base (se asume recién atendida al dar de alta).
// Dentro de la regla → sin señal. Hasta 50% de gracia → amarillo. Más → rojo.
function evaluarRegla(
  etiqueta: (typeof ETIQUETA_REGLA)[keyof typeof ETIQUETA_REGLA],
  ultimoRegistro: string | null,
  fechaInicio: string,
  reglaDias: number | null,
  ahora: Date
): Senal | null {
  if (reglaDias == null) return null;
  const base = ultimoRegistro ?? fechaInicio;
  const dias = diasDesde(base, ahora);
  if (dias <= reglaDias) return null;

  const vencidoHace = dias - reglaDias;
  const detalleTiempo = ultimoRegistro
    ? `vencido hace ${vencidoHace} día${vencidoHace === 1 ? "" : "s"}`
    : `sin registrar desde que se dio de alta (hace ${dias} días)`;
  const motivo = `${etiqueta} ${detalleTiempo} (regla: cada ${reglaDias} días)`;

  return { estado: dias <= reglaDias * 1.5 ? "amarillo" : "rojo", motivo };
}

// Fecha ya vencida o a menos de 3 días → escala el semáforo. Más lejana → no participa todavía.
function evaluarFechaSugerida(fechaSugerida: string | null, texto: string, ahora: Date): Senal | null {
  if (!fechaSugerida) return null;
  const diasHasta = Math.floor((new Date(fechaSugerida).getTime() - ahora.getTime()) / 86_400_000);
  if (diasHasta <= 0) return { estado: "rojo", motivo: `Fecha sugerida por la IA vencida: ${texto}` };
  if (diasHasta <= 3) return { estado: "amarillo", motivo: `Fecha sugerida por la IA en ${diasHasta} día${diasHasta === 1 ? "" : "s"}: ${texto}` };
  return null;
}

export interface RecomendacionPendiente {
  texto: string;
  urgencia: Estado | null;
  fechaSugerida: string | null;
}

export interface CalcularEstadoInput {
  fechaInicio: string;
  reglaRiegoDias: number | null;
  reglaPodaDias: number | null;
  reglaFertilizacionDias: number | null;
  ultimoRiego: string | null;
  ultimaPoda: string | null;
  ultimaFertilizacion: string | null;
  recomendacionesPendientes: RecomendacionPendiente[];
}

export interface EstadoDetallado {
  estado: Estado;
  motivos: string[];
}

export function calcularEstado(input: CalcularEstadoInput, ahora: Date = new Date()): EstadoDetallado {
  const señales: (Senal | null)[] = [
    evaluarRegla(ETIQUETA_REGLA.riego, input.ultimoRiego, input.fechaInicio, input.reglaRiegoDias, ahora),
    evaluarRegla(ETIQUETA_REGLA.poda, input.ultimaPoda, input.fechaInicio, input.reglaPodaDias, ahora),
    evaluarRegla(ETIQUETA_REGLA.fertilización, input.ultimaFertilizacion, input.fechaInicio, input.reglaFertilizacionDias, ahora),
  ];

  for (const r of input.recomendacionesPendientes) {
    if (r.urgencia && r.urgencia !== "verde") {
      señales.push({ estado: r.urgencia, motivo: `Recomendación de la IA pendiente: ${r.texto}` });
    }
    señales.push(evaluarFechaSugerida(r.fechaSugerida, r.texto, ahora));
  }

  const activas = señales.filter((s): s is Senal => s !== null);
  const estado = activas.reduce<Estado>((peor, s) => peorDe(peor, s.estado), "verde");
  const motivos = activas.filter((s) => s.estado === estado).map((s) => s.motivo);

  return { estado, motivos };
}
