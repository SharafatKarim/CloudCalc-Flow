"use client";

import { X, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useToastStore, type ToastKind } from "@/store/toastStore";

function icon(kind: ToastKind) {
  if (kind === "error") return <AlertCircle size={15} />;
  if (kind === "warning") return <AlertTriangle size={15} />;
  return <Info size={15} />;
}

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white shadow-lg ${
            t.kind === "error"
              ? "bg-red-600"
              : t.kind === "warning"
                ? "bg-amber-600"
                : "bg-slate-800"
          }`}
        >
          {icon(t.kind)}
          <span>{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
