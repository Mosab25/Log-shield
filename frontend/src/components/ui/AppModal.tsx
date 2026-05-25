import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type AppModalSize = "sm" | "md" | "lg" | "xl";

const sizeClassMap: Record<AppModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-4xl",
};

let modalScrollLockCount = 0;
let previousBodyOverflow = "";
let previousBodyPaddingRight = "";
let previousHtmlOverflow = "";

function lockBackgroundScroll() {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  if (modalScrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousBodyPaddingRight = document.body.style.paddingRight;
    previousHtmlOverflow = document.documentElement.style.overflow;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  modalScrollLockCount += 1;
}

function unlockBackgroundScroll() {
  if (typeof document === "undefined") return;
  if (modalScrollLockCount === 0) return;

  modalScrollLockCount -= 1;

  if (modalScrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
    document.body.style.paddingRight = previousBodyPaddingRight;
    document.documentElement.style.overflow = previousHtmlOverflow;
  }
}

export function AppModal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  closeOnOverlayClick = false,
  panelClassName = "",
  overlayClassName = "",
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: AppModalSize;
  closeOnOverlayClick?: boolean;
  panelClassName?: string;
  overlayClassName?: string;
}) {
  useEffect(() => {
    if (!isOpen) return;
    lockBackgroundScroll();

    return () => {
      unlockBackgroundScroll();
    };
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`app-modal-overlay fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-slate-950/80 px-4 backdrop-blur-sm ${overlayClassName}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        className={`app-modal-panel w-full ${sizeClassMap[size]} max-h-[85vh] overflow-y-auto overscroll-contain [scrollbar-gutter:stable] ${panelClassName}`}
        onMouseDown={event => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
