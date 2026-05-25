import type { LucideIcon } from "lucide-react";

export function IntroCard({
  icon: Icon,
  title,
  detail,
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  className?: string;
}) {
  return (
    <div className={`intro-card ${className}`}>
      <div className="intro-card-icon">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-black text-white">{title}</p>
        <p className="mt-1 text-xs font-medium text-[#94A3B8]">{detail}</p>
      </div>
    </div>
  );
}
