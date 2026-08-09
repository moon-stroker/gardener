export type Estado = "rojo" | "amarillo" | "verde";

const PESO: Record<Estado, number> = { verde: 0, amarillo: 1, rojo: 2 };

function peorDe(a: Estado, b: Estado): Estado {
  return PESO[b] > PESO[a] ? b : a;
}

function diasDesde(fechaIso: string, ahora: Date): number {
  return Math.floor((ahora.getTime() - new Date(fechaIso).getTime()) / 86_400_000);
}

// Sin registro previo → rojo. Dentro de la regla → verde. Hasta 50% de gracia → amarillo. Más → rojo.
function estadoPorRegla(ultimoRegistro: string | null, reglaDias: number | null, ahora: Date): Estado | null {
  if (reglaDias == null) return null;
  if (ultimoRegistro == null) return "rojo";
  const dias = diasDesde(ultimoRegistro, ahora);
  if (dias <= reglaDias) return "verde";
  if (dias <= reglaDias * 1.5) return "amarillo";
  return "rojo";
}

// Fecha ya vencida o a menos de 3 días → escala el semáforo. Más lejana → no participa todavía.
function estadoPorFechaSugerida(fechaSugerida: string | null, ahora: Date): Estado | null {
  if (!fechaSugerida) return null;
  const diasHasta = Math.floor((new Date(fechaSugerida).getTime() - ahora.getTime()) / 86_400_000);
  if (diasHasta <= 0) return "rojo";
  if (diasHasta <= 3) return "amarillo";
  return null;
}

export interface RecomendacionPendiente {
  urgencia: Estado | null;
  fechaSugerida: string | null;
}

export interface CalcularEstadoInput {
  reglaRiegoDias: number | null;
  reglaPodaDias: number | null;
  reglaFertilizacionDias: number | null;
  ultimoRiego: string | null;
  ultimaPoda: string | null;
  ultimaFertilizacion: string | null;
  recomendacionesPendientes: RecomendacionPendiente[];
}

export function calcularEstado(input: CalcularEstadoInput, ahora: Date = new Date()): Estado {
  const candidatos: (Estado | null)[] = [
    estadoPorRegla(input.ultimoRiego, input.reglaRiegoDias, ahora),
    estadoPorRegla(input.ultimaPoda, input.reglaPodaDias, ahora),
    estadoPorRegla(input.ultimaFertilizacion, input.reglaFertilizacionDias, ahora),
  ];

  for (const r of input.recomendacionesPendientes) {
    candidatos.push(r.urgencia);
    candidatos.push(estadoPorFechaSugerida(r.fechaSugerida, ahora));
  }

  return candidatos.reduce<Estado>((peor, c) => (c ? peorDe(peor, c) : peor), "verde");
}
