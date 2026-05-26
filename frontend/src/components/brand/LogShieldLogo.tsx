import { BRAND } from "../../config/branding";

type LogoSize = "sm" | "md" | "lg";

const sizeMap: Record<LogoSize, { box: string; img: string; text: string; sub: string }> = {
  sm: { box: "h-9 w-9", img: "h-6 w-6", text: "text-sm", sub: "text-[10px]" },
  md: { box: "h-12 w-12", img: "h-8 w-8", text: "text-lg", sub: "text-xs" },
  lg: { box: "h-14 w-14", img: "h-10 w-10", text: "text-xl", sub: "text-xs" },
};

export function LogShieldLogo({
  size = "md",
  showText = true,
  subtitle,
  className = "",
}: {
  size?: LogoSize;
  showText?: boolean;
  subtitle?: string;
  className?: string;
}) {
  const s = sizeMap[size];
  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <div
        className={`relative flex shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 shadow-[0_0_28px_rgba(0,216,255,0.12)] ${s.box}`}
      >
        <img src="/logo.svg" alt="" className={s.img} aria-hidden />
      </div>
      {showText ? (
        <div className="min-w-0">
          <p className={`truncate font-black tracking-tight text-[var(--text-primary)] ${s.text}`}>{BRAND.name}</p>
          {subtitle ? <p className={`truncate font-medium text-[var(--text-muted)] ${s.sub}`}>{subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
