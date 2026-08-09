import type { Estado } from "@/lib/semaforo";

const ESTILOS: Record<Estado, { bg: string; text: string; icono: React.ReactNode }> = {
  rojo: {
    bg: "bg-rojo-soft",
    text: "text-rojo",
    icono: (
      <path
        d="M12 9v4M12 16.5h.01M10.3 3.9L2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  amarillo: {
    bg: "bg-amarillo-soft",
    text: "text-amarillo",
    icono: (
      <>
        <circle cx={12} cy={12} r={9} stroke="currentColor" strokeWidth={2.5} />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
      </>
    ),
  },
  verde: {
    bg: "bg-verde-soft",
    text: "text-verde",
    icono: <path d="M4 12l5 5L20 6" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />,
  },
};

export function EstadoBadge({ estado, label, size = "sm" }: { estado: Estado; label: string; size?: "sm" | "md" }) {
  const estilo = ESTILOS[estado];
  const padding = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";
  const iconSize = size === "sm" ? "size-3" : "size-3.5";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold ${padding} ${estilo.bg} ${estilo.text}`}>
      <svg viewBox="0 0 24 24" fill="none" className={iconSize}>
        {estilo.icono}
      </svg>
      {label}
    </span>
  );
}
