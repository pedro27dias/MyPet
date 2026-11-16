import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "soft" | "ghost" | "outline" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary shadow-[0_6px_16px_rgb(43_67_33/0.25)] hover:bg-primary-strong",
  soft: "bg-primary-soft text-primary-strong hover:brightness-95",
  ghost: "text-muted hover:bg-line/60",
  outline: "border-2 border-line bg-card text-fg hover:border-faint",
  danger: "bg-danger-soft text-danger hover:brightness-95",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "lg" | "sm" }) {
  const sizes = { sm: "h-9 px-4 text-sm", md: "h-12 px-5 text-base", lg: "h-14 px-6 text-lg" }[size];
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-bold transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${sizes} ${VARIANTS[variant]} ${className}`}
    />
  );
}
