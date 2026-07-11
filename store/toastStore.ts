import { create } from 'zustand';

export type ToastKind = 'error' | 'warning' | 'info';
export type Toast = { id: number; message: string; kind: ToastKind };

type ToastStore = {
  toasts: Toast[];
  push: (message: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
};

let seq = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, kind = 'info') => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    // Auto-dismiss after 4s.
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, 4000);
    }
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
