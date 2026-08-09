export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 px-6 py-12 text-sm text-muted" role="status">
      <svg viewBox="0 0 24 24" fill="none" className="size-4 animate-spin motion-reduce:animate-none">
        <circle cx={12} cy={12} r={9} stroke="currentColor" strokeWidth={2.5} strokeOpacity={0.25} />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
      </svg>
      {label}
    </div>
  );
}
