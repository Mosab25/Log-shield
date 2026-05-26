import { useEffect, useState } from "react";
import { ArrowLeft, Bell, LogOut, Menu, ShieldCheck, UserCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth, type AuthUser } from "../auth/AuthContext";
import { pageTitleForPath } from "../navigation";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { getRouteAccent } from "../theme/routeAccents";
import { loadUserPreferences } from "../utils/userPreferences";
import { GlobalSearch } from "./GlobalSearch";

function getAvatarPreview(user: Pick<AuthUser, "id" | "email"> | null): string {
  return loadUserPreferences(user).avatarPreview || "";
}

export function Navbar({
  onMobileMenuClick,
}: {
  onMobileMenuClick?: () => void;
}) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const title = pageTitleForPath(location.pathname, role);
  const routeTitle = getRouteAccent(location.pathname).name;
  const [avatarPreview, setAvatarPreview] = useState<string>(() => getAvatarPreview(user));

  useEffect(() => {
    const refreshAvatar = () => setAvatarPreview(getAvatarPreview(user));
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith("logshield.user.preferences.")) refreshAvatar();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("logshield:preferences-updated", refreshAvatar);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("logshield:preferences-updated", refreshAvatar);
    };
  }, [user?.id, user?.email]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/home");
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-cyber-surface/85 shadow-lg shadow-black/20 backdrop-blur-xl" style={{ borderColor: "color-mix(in srgb, var(--module-accent) 14%, transparent)", minHeight: "var(--topbar-height)" }}>
      <div className={`relative flex items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-4 lg:gap-4 lg:px-6 ${isMobile ? "min-h-12" : "min-h-16 sm:py-3 lg:py-3"}`}>
        <div className="flex min-w-0 items-center gap-2">
          {!isMobile && onMobileMenuClick ? (
          <button
            type="button"
            onClick={() => onMobileMenuClick()}
            aria-label="Open navigation"
            className="soc-button-ghost h-10 w-10 px-0 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          ) : null}
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className={`soc-button-ghost h-10 ${isMobile ? "px-2" : "px-2 sm:px-3"}`}
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
            {!isMobile ? <span className="hidden xs:inline sm:inline">Back</span> : null}
          </button>
          <div className="min-w-0">
            {!isMobile ? (
              <div className="flex items-center gap-1 text-xs font-semibold uppercase text-cyber-muted">
                <ShieldCheck className="h-3 w-3 text-[color:var(--module-accent)]" />
                <span className="hidden sm:inline">Defensive monitoring</span>
              </div>
            ) : null}
            <h2 className={`page-title truncate font-black text-cyber-text ${isMobile ? "hidden text-[13px]" : "text-base sm:text-lg lg:text-xl"}`}>{isMobile ? routeTitle : title}</h2>
          </div>
        </div>
        {isMobile ? (
          <div className="pointer-events-none absolute left-1/2 top-1/2 max-w-[46%] -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">{routeTitle}</p>
          </div>
        ) : null}

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {!isMobile ? <GlobalSearch /> : null}
          <div className={`${isTablet ? "hidden" : "hidden xs:block sm:hidden md:block"}`}>
            <p className="truncate text-sm font-semibold text-cyber-text">{user?.full_name ?? "Unknown"}</p>
            <p className="text-xs font-bold uppercase text-[color:var(--module-accent)]">{role ?? "user"}</p>
          </div>
          {isMobile ? (
            <button type="button" className="soc-button-ghost h-10 w-10 px-0" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </button>
          ) : null}
          <div className="module-empty-icon flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl shadow-inner shadow-black/20">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Profile avatar" className="h-full w-full object-cover" />
            ) : (
              <UserCircle className="h-5 w-5" />
            )}
          </div>
          <button type="button" onClick={handleLogout} className={`soc-button-ghost h-10 ${isMobile ? "w-10 px-0" : "px-2 sm:px-3"}`}>
            <LogOut className="h-4 w-4" />
            {!isMobile ? <span className="hidden xs:inline sm:inline">Logout</span> : null}
          </button>
        </div>
      </div>
    </header>
  );
}
