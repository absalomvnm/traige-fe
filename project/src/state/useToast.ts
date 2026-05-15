import { useState, useCallback, useRef } from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

export function useToast(duration = 3000) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, [duration]);

  const toast = {
    success: (msg: string) => show(msg, "success"),
    error:   (msg: string) => show(msg, "error"),
    info:    (msg: string) => show(msg, "info"),
    warning: (msg: string) => show(msg, "warning"),
  };

  return { toasts, toast };
}
