import * as React from "react";
import { X, MessageCircle, Sparkles, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils/classnames";
import { Button } from "@/components/ui/Button";

export type ToastType = "match" | "success" | "error" | "info";

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps extends ToastData {
  onDismiss: (id: string) => void;
}

interface ToastStyle {
  className: string;
  bg: string;
  color: string;
  iconColor: string;
}

const toastStyles: Record<ToastType, ToastStyle> = {
  match: {
    className: "",
    bg: "hsl(var(--c-primary))",
    color: "hsl(var(--c-frost))",
    iconColor: "hsl(var(--c-frost))",
  },
  success: {
    className: "",
    bg: "hsl(var(--c-teal) / 0.95)",
    color: "hsl(var(--c-frost))",
    iconColor: "hsl(var(--c-frost))",
  },
  error: {
    className: "",
    bg: "hsl(var(--c-error))",
    color: "hsl(var(--c-frost))",
    iconColor: "hsl(var(--c-frost))",
  },
  info: {
    className: "border border-[hsl(var(--c-border))]",
    bg: "hsl(var(--c-surface))",
    color: "hsl(var(--c-text-primary))",
    iconColor: "hsl(var(--c-primary))",
  },
};

const iconMap: Record<ToastType, React.ReactNode> = {
  match: <Sparkles className="h-5 w-5" />,
  success: <CheckCircle className="h-5 w-5" />,
  error: <AlertCircle className="h-5 w-5" />,
  info: <MessageCircle className="h-5 w-5" />,
};

export function Toast({ id, type, title, message, action, onDismiss }: ToastProps) {
  const style = toastStyles[type];

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  if (import.meta.env.DEV) {
    console.debug(`[Toast] variant=${type}`, { title });
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl px-4 py-3 shadow-lg shadow-black/10 border border-white/10 slide-in-right",
        style.className
      )}
      style={{ backgroundColor: style.bg, color: style.color }}
      role="alert"
    >
      <div className="shrink-0 mt-0.5" style={{ color: style.iconColor }}>{iconMap[type]}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[0.9375rem] leading-tight">{title}</p>
        {message && <p className="text-sm mt-1 font-normal" style={{ opacity: 0.8 }}>{message}</p>}
        {action && (
          <Button
            variant={type === "info" ? "primary" : "ghost"}
            size="sm"
            onClick={action.onClick}
            className="mt-2"
          >
            {action.label}
          </Button>
        )}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 opacity-70 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/30 rounded-md p-0.5 transition-opacity"
        aria-label="Stäng"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export const ToastContainer = React.forwardRef<HTMLDivElement, ToastContainerProps>(
  function ToastContainer({ toasts, onDismiss }, ref) {
    return (
      <div ref={ref} className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-full max-w-[400px]">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
        ))}
      </div>
    );
  }
);

// Toast context for app-wide usage
interface ToastContextValue {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, "id">) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToasts() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToasts must be used within a ToastProvider");
  }
  return context;
}
