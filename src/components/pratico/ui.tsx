import { cva, type VariantProps } from "class-variance-authority";
import { useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const btn = cva(
  "press inline-flex min-h-11 items-center justify-center gap-2 rounded-ctl px-4 text-[15px] font-semibold disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: "bg-basil text-basil-ink hover:bg-basil-700 active:bg-basil-700 disabled:bg-basil disabled:opacity-40 disabled:text-basil-ink",
        secondary: "bg-sheet-2 text-ink hover:bg-sheet-hover disabled:opacity-60",
        quiet: "min-h-11 px-2 font-medium text-muted-foreground hover:text-ink",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export function Button({ variant, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof btn>) {
  return <button type="button" className={cn(btn({ variant }), className)} {...p} />;
}

const chip = cva("inline-flex items-center rounded-chip px-2 py-0.5 text-[12.5px] font-medium", {
  variants: {
    tone: {
      basil: "bg-basil-tint text-basil",
      mustard: "bg-mustard-tint text-[var(--mustard-ink)]",
      tomato: "bg-tomato-tint text-tomato",
      neutral: "bg-sheet-2 text-muted-foreground",
    },
  },
  defaultVariants: { tone: "neutral" },
});
export function Chip({ tone, children, className }: VariantProps<typeof chip> & { children: ReactNode; className?: string }) {
  return <span className={cn(chip({ tone }), className)}>{children}</span>;
}

export function Tape({ children, alt, basil }: { children: ReactNode; alt?: boolean; basil?: boolean }) {
  return <span className={cn("tape shrink-0", alt && "tape-alt", basil && "tape-basil")}>{children}</span>;
}

export function UnderlineTabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [bar, setBar] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const el = refs.current[value];
    if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value]);
  return (
    <div role="group" aria-label={label} className="relative flex gap-6 border-b border-rule">
      {options.map((o) => (
        <button
          key={o.value}
          ref={(el) => { refs.current[o.value] = el; }}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("min-h-11 text-[15px] font-semibold transition-colors", value === o.value ? "text-ink" : "text-muted-foreground hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
      <span aria-hidden className="absolute -bottom-px h-0.5 bg-basil transition-all duration-200 ease-kitchen" style={{ left: bar.left, width: bar.width }} />
    </div>
  );
}

export function PageHeader({ small, title, sub, right }: { small: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between md:gap-8">
      <div className="max-w-[560px]">
        <p className="eyebrow">{small}</p>
        <h1 className="mt-1 text-[32px] font-medium font-serif">{title}</h1>
        {sub && <p className="mt-2 text-muted-foreground">{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}

export function TwoCol({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid gap-8 min-[900px]:grid-cols-[1.6fr_1px_1fr] min-[900px]:gap-8">
      <div className="min-w-0">{main}</div>
      <div aria-hidden className="hidden bg-rule min-[900px]:block" />
      <aside className="min-w-0 border-t border-rule pt-6 min-[900px]:border-0 min-[900px]:pt-0">{side}</aside>
    </div>
  );
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2.5 rounded-full", className)} style={{ backgroundColor: color }} />;
}
