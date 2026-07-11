import { useEffect } from "react";
import { useArchitectureStore } from "@/store/architectureStore";

/**
 * Global keyboard shortcuts (spec §8):
 * - Ctrl/Cmd+Z: undo, Ctrl/Cmd+Shift+Z: redo
 * - Escape: close config / deselect
 * (Delete of a selected node/edge is handled by React Flow's deleteKeyCode.)
 */
export function useKeyboardShortcuts() {
  const undo = useArchitectureStore((s) => s.undo);
  const redo = useArchitectureStore((s) => s.redo);
  const closeConfig = useArchitectureStore((s) => s.closeConfig);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeConfig();
        return;
      }
      const el = e.target as HTMLElement | null;
      const typing =
        el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.isContentEditable;
      if (typing) return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, closeConfig]);
}
