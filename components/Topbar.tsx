import Link from "next/link";
import { ReactNode } from "react";

export function Topbar({ children }: { children?: ReactNode }) {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
      <Link href="/" className="flex items-center gap-2 text-[15px] font-bold tracking-tight text-foreground">
        <span className="flex size-6 items-center justify-center rounded-md bg-accent">
          <svg viewBox="0 0 24 24" fill="none" className="size-2.5">
            <path d="M12 2C8 6 6 10 6 13a6 6 0 0 0 12 0c0-3-2-7-6-11Z" fill="white" />
          </svg>
        </span>
        Mis plantas
      </Link>
      {children}
    </header>
  );
}
