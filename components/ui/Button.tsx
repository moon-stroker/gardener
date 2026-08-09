import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "link";

const ESTILOS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:opacity-90",
  ghost: "bg-transparent text-foreground border border-border hover:bg-surface",
  link: "bg-transparent text-accent hover:underline p-0",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    variant === "link"
      ? "text-sm font-semibold"
      : "inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-semibold transition-opacity";

  return <button className={`${base} ${ESTILOS[variant]} ${className}`} {...props} />;
}
