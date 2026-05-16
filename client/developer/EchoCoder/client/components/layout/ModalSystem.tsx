import React, { ReactNode, useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Portal component for rendering modals outside DOM hierarchy
 */
interface PortalProps {
  children: ReactNode;
  containerId?: string;
}

export function Portal({ children, containerId = "modal-root" }: PortalProps) {
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      document.body.appendChild(container);
    }
  }, [containerId]);

  if (!mounted) return null;

  const container = document.getElementById(containerId);
  if (!container) return null;

  return <>{ReactDOM.createPortal(children, container)}</>;
}

/**
 * Hook for managing modal state
 */
interface ModalConfig {
  onClose?: () => void;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
}

export function useModal(config: ModalConfig = {}) {
  const {
    onClose,
    closeOnEscape = true,
    closeOnBackdropClick = true,
  } = config;

  const [isOpen, setIsOpen] = React.useState(false);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, handleClose]);

  return {
    isOpen,
    open: handleOpen,
    close: handleClose,
    toggle: () => setIsOpen(!isOpen),
  };
}

/**
 * Backdrop component with optional click handler
 */
interface BackdropProps {
  onClick?: () => void;
  className?: string;
  role?: string;
}

export function Backdrop({ onClick, className, role = "presentation" }: BackdropProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm",
        "animate-in fade-in duration-200",
        className
      )}
      onClick={onClick}
      role={role}
      aria-hidden="true"
    />
  );
}

/**
 * Modal component with full accessibility support
 */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  closeButton?: boolean;
  closeOnBackdropClick?: boolean;
  className?: string;
  overlayClassName?: string;
}

const SIZE_MAP = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  closeButton = true,
  closeOnBackdropClick = true,
  className,
  overlayClassName,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Focus trap: focus the close button or first focusable element
      const focusableElements =
        modalRef.current?.querySelectorAll(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        ) || [];
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <Backdrop
        onClick={closeOnBackdropClick ? onClose : undefined}
        className={overlayClassName}
      />
      <div
        ref={modalRef}
        className={cn(
          "relative bg-card rounded-lg shadow-2xl",
          "w-full",
          SIZE_MAP[size],
          "max-h-[90vh] overflow-y-auto",
          "animate-in zoom-in-95 fade-in duration-200",
          "focus:outline-none",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border/20 px-6 py-4 flex items-center justify-between">
          <h2
            id="modal-title"
            className="text-xl font-semibold text-foreground"
          >
            {title}
          </h2>
          {closeButton && (
            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-md hover:bg-muted transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary"
              )}
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

/**
 * Sheet component for side modals
 */
interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: "left" | "right";
  width?: "sm" | "md" | "lg";
  closeButton?: boolean;
}

const SHEET_WIDTH_MAP = {
  sm: "w-80",
  md: "w-96",
  lg: "w-[500px]",
};

export function Sheet({
  isOpen,
  onClose,
  title,
  children,
  side = "right",
  width = "md",
  closeButton = true,
}: SheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const positionClass = side === "left" ? "left-0" : "right-0";
  const slideDirection = side === "left" ? "slide-in-from-left" : "slide-in-from-right";

  return (
    <div className="fixed inset-0 z-50">
      <Backdrop onClick={onClose} />
      <div
        className={cn(
          "fixed top-0 bottom-0 bg-card shadow-lg border-r border-border/20",
          positionClass,
          SHEET_WIDTH_MAP[width],
          "overflow-y-auto",
          `animate-in ${slideDirection}-96 duration-300`
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border/20 px-6 py-4 flex items-center justify-between">
          <h2
            id="sheet-title"
            className="text-xl font-semibold text-foreground"
          >
            {title}
          </h2>
          {closeButton && (
            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-md hover:bg-muted transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary"
              )}
              aria-label="Close sheet"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

/**
 * Drawer component (full-height modal)
 */
interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  closeButton?: boolean;
}

export function Drawer({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  closeButton = true,
}: DrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <Backdrop onClick={onClose} />
      <div
        className={cn(
          "relative bg-card rounded-t-3xl shadow-2xl",
          "mt-auto max-h-[90vh] overflow-y-auto",
          "animate-in slide-in-from-bottom-96 duration-300"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "drawer-title" : undefined}
      >
        {/* Handle */}
        <div
          className="flex justify-center py-2"
          role="presentation"
        >
          <div className="h-1 w-12 rounded-full bg-muted" />
        </div>

        {/* Header */}
        {(title || closeButton) && (
          <div className="sticky top-0 bg-card border-b border-border/20 px-6 py-4 flex items-center justify-between">
            <div>
              {title && (
                <h2
                  id="drawer-title"
                  className="text-lg font-semibold text-foreground"
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {closeButton && (
              <button
                onClick={onClose}
                className={cn(
                  "p-2 rounded-md hover:bg-muted transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-primary"
                )}
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4 pb-8">{children}</div>
      </div>
    </div>
  );
}

// Note: ReactDOM import would be needed at top of file
import ReactDOM from "react-dom";
