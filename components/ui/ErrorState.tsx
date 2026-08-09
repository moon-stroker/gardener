export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-rojo-soft bg-rojo-soft px-6 py-8 text-center">
      <svg viewBox="0 0 24 24" fill="none" className="size-6 text-rojo">
        <path
          d="M12 9v4M12 16.5h.01M10.3 3.9L2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="text-sm font-medium text-rojo">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-semibold text-rojo underline underline-offset-2">
          Reintentar
        </button>
      )}
    </div>
  );
}
