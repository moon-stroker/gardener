import { describe, expect, it } from "vitest";
import { calcularEstado } from "@/lib/semaforo";

const AHORA = new Date("2026-08-09T12:00:00.000Z");
const haceDias = (dias: number) => new Date(AHORA.getTime() - dias * 86_400_000).toISOString();
const enDias = (dias: number) => new Date(AHORA.getTime() + dias * 86_400_000).toISOString();

const BASE = {
  reglaRiegoDias: null,
  reglaPodaDias: null,
  reglaFertilizacionDias: null,
  ultimoRiego: null,
  ultimaPoda: null,
  ultimaFertilizacion: null,
  recomendacionesPendientes: [],
};

describe("calcularEstado — regla de riego", () => {
  it("verde cuando el riego está dentro de la regla", () => {
    const estado = calcularEstado({ ...BASE, reglaRiegoDias: 3, ultimoRiego: haceDias(1) }, AHORA);
    expect(estado).toBe("verde");
  });

  it("amarillo cuando pasó la regla pero está dentro del 50% de gracia", () => {
    const estado = calcularEstado({ ...BASE, reglaRiegoDias: 3, ultimoRiego: haceDias(4) }, AHORA);
    expect(estado).toBe("amarillo");
  });

  it("rojo cuando excede el margen de gracia", () => {
    const estado = calcularEstado({ ...BASE, reglaRiegoDias: 3, ultimoRiego: haceDias(10) }, AHORA);
    expect(estado).toBe("rojo");
  });

  it("rojo cuando nunca se ha regado y hay una regla definida", () => {
    const estado = calcularEstado({ ...BASE, reglaRiegoDias: 3, ultimoRiego: null }, AHORA);
    expect(estado).toBe("rojo");
  });

  it("verde (sin evaluar) cuando no hay regla de riego definida", () => {
    const estado = calcularEstado({ ...BASE, reglaRiegoDias: null, ultimoRiego: null }, AHORA);
    expect(estado).toBe("verde");
  });
});

describe("calcularEstado — regla de poda", () => {
  it("verde dentro de la regla", () => {
    expect(calcularEstado({ ...BASE, reglaPodaDias: 30, ultimaPoda: haceDias(10) }, AHORA)).toBe("verde");
  });
  it("amarillo dentro del margen de gracia", () => {
    expect(calcularEstado({ ...BASE, reglaPodaDias: 30, ultimaPoda: haceDias(40) }, AHORA)).toBe("amarillo");
  });
  it("rojo fuera del margen de gracia", () => {
    expect(calcularEstado({ ...BASE, reglaPodaDias: 30, ultimaPoda: haceDias(60) }, AHORA)).toBe("rojo");
  });
});

describe("calcularEstado — regla de fertilización", () => {
  it("verde dentro de la regla", () => {
    expect(calcularEstado({ ...BASE, reglaFertilizacionDias: 21, ultimaFertilizacion: haceDias(5) }, AHORA)).toBe("verde");
  });
  it("amarillo dentro del margen de gracia", () => {
    expect(calcularEstado({ ...BASE, reglaFertilizacionDias: 21, ultimaFertilizacion: haceDias(25) }, AHORA)).toBe("amarillo");
  });
  it("rojo fuera del margen de gracia", () => {
    expect(calcularEstado({ ...BASE, reglaFertilizacionDias: 21, ultimaFertilizacion: haceDias(40) }, AHORA)).toBe("rojo");
  });
});

describe("calcularEstado — recomendaciones de IA pendientes", () => {
  it("usa la urgencia de una recomendación pendiente", () => {
    const estado = calcularEstado(
      { ...BASE, recomendacionesPendientes: [{ urgencia: "rojo", fechaSugerida: null }] },
      AHORA
    );
    expect(estado).toBe("rojo");
  });

  it("fecha sugerida vencida escala a rojo aunque la urgencia guardada sea verde", () => {
    const estado = calcularEstado(
      { ...BASE, recomendacionesPendientes: [{ urgencia: "verde", fechaSugerida: haceDias(1) }] },
      AHORA
    );
    expect(estado).toBe("rojo");
  });

  it("fecha sugerida lejana (>3 días) no afecta el estado", () => {
    const estado = calcularEstado(
      { ...BASE, recomendacionesPendientes: [{ urgencia: null, fechaSugerida: enDias(10) }] },
      AHORA
    );
    expect(estado).toBe("verde");
  });

  it("fecha sugerida próxima (<=3 días) escala a amarillo", () => {
    const estado = calcularEstado(
      { ...BASE, recomendacionesPendientes: [{ urgencia: null, fechaSugerida: enDias(2) }] },
      AHORA
    );
    expect(estado).toBe("amarillo");
  });
});

describe("calcularEstado — varias condiciones compiten, gana la peor", () => {
  it("riego verde + poda amarilla + recomendación roja => rojo", () => {
    const estado = calcularEstado(
      {
        reglaRiegoDias: 3,
        ultimoRiego: haceDias(1), // verde
        reglaPodaDias: 30,
        ultimaPoda: haceDias(40), // amarillo
        reglaFertilizacionDias: null,
        ultimaFertilizacion: null,
        recomendacionesPendientes: [{ urgencia: "rojo", fechaSugerida: null }], // rojo
      },
      AHORA
    );
    expect(estado).toBe("rojo");
  });

  it("riego verde + poda amarilla, sin nada rojo => amarillo (la peor entre las dos)", () => {
    const estado = calcularEstado(
      {
        ...BASE,
        reglaRiegoDias: 3,
        ultimoRiego: haceDias(1),
        reglaPodaDias: 30,
        ultimaPoda: haceDias(40),
      },
      AHORA
    );
    expect(estado).toBe("amarillo");
  });

  it("todo en verde => verde", () => {
    const estado = calcularEstado(
      {
        reglaRiegoDias: 3,
        ultimoRiego: haceDias(1),
        reglaPodaDias: 30,
        ultimaPoda: haceDias(5),
        reglaFertilizacionDias: 21,
        ultimaFertilizacion: haceDias(2),
        recomendacionesPendientes: [{ urgencia: "verde", fechaSugerida: null }],
      },
      AHORA
    );
    expect(estado).toBe("verde");
  });
});
