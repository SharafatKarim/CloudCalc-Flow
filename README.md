# CloudCalc Flow

Visual Cloud Architecture Simulator & Cost Estimator — a fully client-side app to
drag-and-drop infrastructure onto a canvas, wire it up, simulate concurrent-user
traffic, and watch live cost / RAM / response-time / throughput metrics with OOM
warnings and remediation suggestions.

## Stack

- **Next.js 16** (App Router) + **React 19** + TypeScript
- **React Flow v12** (`@xyflow/react`) — drag-drop node canvas
- **Zustand** (`immer` + `persist`) — state, undo/redo, localStorage autosave
- **Tailwind CSS v4** + **lucide-react**
- **Vitest** — simulation unit tests

## Getting started

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # production build
pnpm test     # simulation unit tests
```

> This repo uses pnpm 11. Native build scripts (`sharp`, `unrs-resolver`, …) are
> allow-listed in `pnpm-workspace.yaml` — required or `next build` fails its
> dependency check.

## How it works

- **Palette (left):** drag Compute Server / Load Balancer / Database / S3 / Redis onto the canvas.
- **Canvas (center):** connect nodes under strict rules (`lib/connectionRules.ts`) —
  Load Balancer → Server, Server → DB/Storage/Cache. Invalid attempts raise a toast.
- **Metrics (right):** the concurrent-users slider drives the simulation
  (`lib/simulation.ts`); total cost, system status, RAM, response time, throughput
  and bandwidth update live. Overloaded servers surface upgrade/scale/reduce suggestions.
- **Export:** JSON download / import + Copy-as-Text markdown summary (`lib/export.ts`).
- Undo/redo (50-state history), keyboard shortcuts (Ctrl/Cmd+Z, Delete, Esc), dark mode.

### Modelling assumptions

The instructions leave a few numbers open; documented defaults live in
`lib/infrastructureData.ts`: framework idle memory per stack, DB `$2/GB` beyond the
first GB, and `2 GB/user/mo` bandwidth.

## Layout

```
lib/        data catalogue, types, pure simulation math, export, connection rules
store/      Zustand architecture store (+ toast/ui stores)
hooks/      useSimulation, useKeyboardShortcuts
components/ AppShell, Header, Palette, Canvas, MetricsPanel, ConfigModal, nodes/, edges/
```
