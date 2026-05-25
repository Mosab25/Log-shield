import type { ReactNode } from "react";
import {
  Activity,
  Ban,
  BookOpen,
  Briefcase,
  Bug,
  ClipboardList,
  Crosshair,
  FileText,
  Fingerprint,
  Home,
  LayoutDashboard,
  ListChecks,
  Radar,
  ScrollText,
  Search,
  Server,
  Settings,
  ShieldCheck,
  TriangleAlert,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation } from "react-router-dom";

import { moduleThemeForPath, moduleThemeStyle, moduleThemes, type ModuleThemeKey } from "../theme/moduleThemes";

const moduleIcons: Record<string, LucideIcon> = {
  Activity,
  Ban,
  BookOpen,
  Briefcase,
  Bug,
  ClipboardList,
  Crosshair,
  FileText,
  Fingerprint,
  Home,
  LayoutDashboard,
  ListChecks,
  Radar,
  ScrollText,
  Search,
  Server,
  Settings,
  ShieldCheck,
  TriangleAlert,
  Users,
  Wrench,
};

export function iconForModule(iconName: string): LucideIcon {
  return moduleIcons[iconName] ?? ShieldCheck;
}

export function ModuleThemeFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  const location = useLocation();
  const theme = moduleThemeForPath(location.pathname);

  return (
    <div className={`module-theme-shell ${className}`} data-module-theme={theme.key} style={moduleThemeStyle(theme)}>
      {children}
    </div>
  );
}

export function ModulePageHeader({
  moduleKey,
  eyebrow,
  title,
  description,
  actions,
  stats,
}: {
  moduleKey?: ModuleThemeKey;
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  stats?: Array<{ label: string; value: string | number }>;
}) {
  const location = useLocation();
  const theme = moduleKey ? moduleThemes[moduleKey] : moduleThemeForPath(location.pathname);
  const Icon = iconForModule(theme.icon);

  return (
    <section className="module-page-header" style={moduleThemeStyle(theme)}>
      <div className="module-page-header-pattern" aria-hidden="true" />
      <div className="relative z-10 flex min-w-0 flex-1 items-start gap-4">
        <div className="module-icon-badge">
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="module-eyebrow">
            <span>{eyebrow ?? theme.label}</span>
            <span className="module-pattern-label">{theme.pattern}</span>
          </div>
          <h1>{title ?? theme.label}</h1>
          <p>{description ?? theme.description}</p>
        </div>
      </div>
      {stats?.length ? (
        <div className="module-header-stats">
          {stats.map(stat => (
            <div key={stat.label} className="module-header-stat">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {actions ? <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </section>
  );
}

export function ThemedCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`themed-card ${className}`}>{children}</div>;
}

export function ThemedBadge({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "muted" | "danger" | "success" | "warning" }) {
  return <span className={`themed-badge themed-badge-${tone}`}>{children}</span>;
}
