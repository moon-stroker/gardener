import { describe, expect, it } from "vitest";
import { calcularEstado } from "@/lib/semaforo";

const AHORA = new Date("2026-08-09T12:00:00.000Z");
const haceDias = (dias: number) => new Date(AHORA.getTime() - dias * 86_400_000).toISOString();
const enDias = (dias: number) => new Date(AHORA.getTime() + dias * 86_400_000).toISOString();

const BASE = {
  fechaInicio: haceDias(100), // planta "vieja" por defecto — el grace period de alta no interfiere salvo que se pruebe explícitamente
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
    const { estado } = calcularEstado({ ...BASE, reglaRiegoDias: 3, ultimoRiego: haceDias(1) }, AHORA);
    expect(estado).toBe("verde");
  });

  it("amarillo cuando pasó la regla pero está dentro del 50% de gracia", () => {
    const { estado, motivos } = calcularEstado({ ...BASE, reglaRiegoDias: 3, ultimoRiego: haceDias(4) }, AHORA);
    expect(estado).toBe("amarillo");
    expect(motivos[0]).toMatch(/Riego vencido hace 1 día/);
  });

  it("rojo cuando excede el margen de gracia", () => {
    const { estado } = calcularEstado({ ...BASE, reglaRiegoDias: 3, ultimoRiego: haceDias(10) }, AHORA);
    expect(estado).toBe("rojo");
  });

  it("verde cuando no hay regla de riego definida (no se evalúa)", () => {
    const { estado, motivos } = calcularEstado({ ...BASE, reglaRiegoDias: null, ultimoRiego: null }, AHORA);
    expect(estado).toBe("verde");
    expect(motivos).toEqual([]);
  });
});

describe("calcularEstado — grace period desde fechaInicio (sin bitácora todavía)", () => {
  it("una planta recién dada de alta con regla de riego no se marca urgente de inmediato", () => {
    const { estado } = calcularEstado({ ...BASE, fechaInicio: haceDias(1), reglaRiegoDias: 3, ultimoRiego: null }, AHORA);
    expect(estado).toBe("verde");
  });

  it("si pasa el tiempo de la regla desde fechaInicio sin registrar riego, escala a amarillo/rojo", () => {
    const amarillo = calcularEstado({ ...BASE, fechaInicio: haceDias(4), reglaRiegoDias: 3, ultimoRiego: null }, AHORA);
    expect(amarillo.estado).toBe("amarillo");
    expect(amarillo.motivos[0]).toMatch(/sin registrar desde que se dio de alta/);

    const rojo = calcularEstado({ ...BASE, fechaInicio: haceDias(10), reglaRiegoDias: 3, ultimoRiego: null }, AHORA);
    expect(rojo.estado).toBe("rojo");
  });
});

describe("calcularEstado — regla de poda", () => {
  it("verde dentro de la regla", () => {
    expect(calcularEstado({ ...BASE, reglaPodaDias: 30, ultimaPoda: haceDias(10) }, AHORA).estado).toBe("verde");
  });
  it("amarillo dentro del margen de gracia", () => {
    expect(calcularEstado({ ...BASE, reglaPodaDias: 30, ultimaPoda: haceDias(40) }, AHORA).estado).toBe("amarillo");
  });
  it("rojo fuera del margen de gracia", () => {
    expect(calcularEstado({ ...BASE, reglaPodaDias: 30, ultimaPoda: haceDias(60) }, AHORA).estado).toBe("rojo");
  });
});

describe("calcularEstado — regla de fertilización", () => {
  it("verde dentro de la regla", () => {
    expect(calcularEstado({ ...BASE, reglaFertilizacionDias: 21, ultimaFertilizacion: haceDias(5) }, AHORA).estado).toBe("verde");
  });
  it("amarillo dentro del margen de gracia", () => {
    expect(calcularEstado({ ...BASE, reglaFertilizacionDias: 21, ultimaFertilizacion: haceDias(25) }, AHORA).estado).toBe("amarillo");
  });
  it("rojo fuera del margen de gracia", () => {
    expect(calcularEstado({ ...BASE, reglaFertilizacionDias: 21, ultimaFertilizacion: haceDias(40) }, AHORA).estado).toBe("rojo");
  });
});

describe("calcularEstado — recomendaciones de IA pendientes", () => {
  it("usa la urgencia de una recomendación pendiente y expone el motivo", () => {
    const { estado, motivos } = calcularEstado(
      { ...BASE, recomendacionesPendientes: [{ texto: "riega pronto", urgencia: "rojo", fechaSugerida: null }] },
      AHORA
    );
    expect(estado).toBe("rojo");
    expect(motivos[0]).toMatch(/riega pronto/);
  });

  it("una recomendación verde no genera señal (no hay nada urgente que reportar)", () => {
    const { estado, motivos } = calcularEstado(
      { ...BASE, recomendacionesPendientes: [{ texto: "todo bien", urgencia: "verde", fechaSugerida: null }] },
      AHORA
    );
    expect(estado).toBe("verde");
    expect(motivos).toEqual([]);
  });

  it("fecha sugerida vencida escala a rojo aunque la urgencia guardada sea verde", () => {
    const { estado } = calcularEstado(
      { ...BASE, recomendacionesPendientes: [{ texto: "trasplantar", urgencia: "verde", fechaSugerida: haceDias(1) }] },
      AHORA
    );
    expect(estado).toBe("rojo");
  });

  it("fecha sugerida lejana (>3 días) no afecta el estado", () => {
    const { estado } = calcularEstado(
      { ...BASE, recomendacionesPendientes: [{ texto: "trasplantar", urgencia: null, fechaSugerida: enDias(10) }] },
      AHORA
    );
    expect(estado).toBe("verde");
  });

  it("fecha sugerida próxima (<=3 días) escala a amarillo", () => {
    const { estado } = calcularEstado(
      { ...BASE, recomendacionesPendientes: [{ texto: "trasplantar", urgencia: null, fechaSugerida: enDias(2) }] },
      AHORA
    );
    expect(estado).toBe("amarillo");
  });
});

describe("calcularEstado — varias condiciones compiten, gana la peor", () => {
  it("riego verde + poda amarilla + recomendación roja => rojo, con solo el motivo rojo listado", () => {
    const { estado, motivos } = calcularEstado(
      {
        ...BASE,
        reglaRiegoDias: 3,
        ultimoRiego: haceDias(1), // verde
        reglaPodaDias: 30,
        ultimaPoda: haceDias(40), // amarillo
        recomendacionesPendientes: [{ texto: "plaga detectada", urgencia: "rojo", fechaSugerida: null }],
      },
      AHORA
    );
    expect(estado).toBe("rojo");
    expect(motivos).toEqual(["Recomendación de la IA pendiente: plaga detectada"]);
  });

  it("riego verde + poda amarilla, sin nada rojo => amarillo (la peor entre las dos)", () => {
    const { estado } = calcularEstado(
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

  it("todo en verde => verde, sin motivos", () => {
    const { estado, motivos } = calcularEstado(
      {
        ...BASE,
        reglaRiegoDias: 3,
        ultimoRiego: haceDias(1),
        reglaPodaDias: 30,
        ultimaPoda: haceDias(5),
        reglaFertilizacionDias: 21,
        ultimaFertilizacion: haceDias(2),
        recomendacionesPendientes: [{ texto: "todo bien", urgencia: "verde", fechaSugerida: null }],
      },
      AHORA
    );
    expect(estado).toBe("verde");
    expect(motivos).toEqual([]);
  });
});
