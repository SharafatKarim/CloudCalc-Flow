"use client";

import dynamic from "next/dynamic";

// The whole app is canvas-driven and client-only; disable SSR to avoid
// hydration mismatches with the persisted (localStorage) architecture.
const AppShell = dynamic(() => import("@/components/AppShell"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center text-slate-500">
      Loading CloudCalc Flow…
    </div>
  ),
});

export default function Home() {
  return <AppShell />;
}
