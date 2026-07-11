import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge as rfAddEdge,
  MarkerType,
} from '@xyflow/react';
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react';
import type { AppNode, AppEdge, AppNodeData, NodeType, SimSnapshot } from '@/lib/types';
import { canConnect, connectionError } from '@/lib/connectionRules';
import { useToastStore } from './toastStore';

const HISTORY_LIMIT = 50;

type NodeKind = NodeType;

type State = {
  nodes: AppNode[];
  edges: AppEdge[];
  concurrentUsers: number;
  nodeSeq: number;
  selectedNodeId: string | null;
  showConfigModal: boolean;
  history: SimSnapshot[];
  redoStack: SimSnapshot[];
  varianceEnabled: boolean;
  varianceSeed: number;
  varianceLive: boolean;
};

type Actions = {
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;
  onConnect: (conn: Connection) => void;
  addNode: (type: NodeKind, position: { x: number; y: number }) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  updateNodeConfig: (id: string, patch: Partial<AppNodeData>) => void;
  setConcurrentUsers: (n: number) => void;
  snapshot: () => void;
  clearAll: () => void;
  undo: () => void;
  redo: () => void;
  openConfig: (id: string) => void;
  closeConfig: () => void;
  replaceArchitecture: (data: { nodes: AppNode[]; edges: AppEdge[]; concurrentUsers: number }) => void;
  toggleVariance: () => void;
  rerollVariance: () => void;
  toggleLive: () => void;
  tickVariance: () => void;
};

export type ArchitectureStore = State & Actions;

/** Deep-clone the history-relevant slice from a *plain* (non-draft) state. */
function captureSnap(s: State): SimSnapshot {
  return {
    nodes: structuredClone(s.nodes),
    edges: structuredClone(s.edges),
    concurrentUsers: s.concurrentUsers,
  };
}

/** Push a pre-captured snapshot onto history (mutates immer draft). */
function pushHist(draft: State, snap: SimSnapshot) {
  draft.history.push(snap);
  if (draft.history.length > HISTORY_LIMIT) draft.history.shift();
  draft.redoStack = [];
}

function defaultData(type: NodeKind, seq: number): AppNodeData {
  switch (type) {
    case 'server':
      return { kind: 'server', name: `Server-${seq}`, tier: 'Micro', os: 'Ubuntu', stack: 'Next.js' };
    case 'loadBalancer':
      return { kind: 'loadBalancer', name: `LB-${seq}` };
    case 'database':
      return { kind: 'database', name: `DB-${seq}`, db: 'PostgreSQL', sizeGB: 1 };
    case 'storage':
      return { kind: 'storage', name: `Storage-${seq}`, sizeGB: 10 };
    case 'cache':
      return { kind: 'cache', name: `Redis-${seq}` };
    case 'cdn':
      return { kind: 'cdn', name: `CDN-${seq}`, cachedGB: 50 };
    case 'apiGateway':
      return { kind: 'apiGateway', name: `Gateway-${seq}` };
    case 'queue':
      return { kind: 'queue', name: `Queue-${seq}` };
    case 'nosql':
      return { kind: 'nosql', name: `NoSQL-${seq}`, db: 'MongoDB', sizeGB: 1 };
  }
}

const safeStorage = createJSONStorage<Partial<State>>(() =>
  typeof window !== 'undefined'
    ? window.localStorage
    : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
);

export const useArchitectureStore = create<ArchitectureStore>()(
  persist(
    immer((set, get) => ({
      nodes: [],
      edges: [],
      concurrentUsers: 500,
      nodeSeq: 1,
      selectedNodeId: null,
      showConfigModal: false,
      history: [],
      redoStack: [],
      varianceEnabled: true,
      varianceSeed: 1,
      varianceLive: false,

      onNodesChange: (changes) => {
        const historyWorthy = changes.some(
          (c) => c.type === 'remove' || (c.type === 'position' && c.dragging === false),
        );
        const snap = historyWorthy ? captureSnap(get()) : null;
        set((state) => {
          if (snap) pushHist(state, snap);
          state.nodes = applyNodeChanges(changes, state.nodes as AppNode[]) as AppNode[];
        });
      },

      onEdgesChange: (changes) => {
        const historyWorthy = changes.some((c) => c.type === 'remove');
        const snap = historyWorthy ? captureSnap(get()) : null;
        set((state) => {
          if (snap) pushHist(state, snap);
          state.edges = applyEdgeChanges(changes, state.edges as AppEdge[]) as AppEdge[];
        });
      },

      onConnect: (conn) => {
        const nodes = get().nodes;
        const src = nodes.find((n) => n.id === conn.source);
        const tgt = nodes.find((n) => n.id === conn.target);
        if (!src || !tgt || !src.type || !tgt.type) return;
        if (!canConnect(src.type as NodeType, tgt.type as NodeType)) {
          useToastStore.getState().push(connectionError(src.type as NodeType, tgt.type as NodeType), 'error');
          return;
        }
        const snap = captureSnap(get());
        set((state) => {
          pushHist(state, snap);
          state.edges = rfAddEdge(
            { ...conn, type: 'traffic', markerEnd: { type: MarkerType.ArrowClosed } },
            state.edges as AppEdge[],
          ) as AppEdge[];
        });
      },

      addNode: (type, position) => {
        const snap = captureSnap(get());
        set((state) => {
          pushHist(state, snap);
          const seq = state.nodeSeq;
          const node: AppNode = {
            id: `${type}-${seq}`,
            type,
            position,
            // Stable per-node seed for deterministic traffic/usage variance.
            data: { ...defaultData(type, seq), seed: Math.floor(Math.random() * 1e9) },
          };
          state.nodes.push(node);
          state.nodeSeq += 1;
        });
      },

      deleteNode: (id) => {
        const snap = captureSnap(get());
        set((state) => {
          pushHist(state, snap);
          state.nodes = state.nodes.filter((n) => n.id !== id);
          state.edges = state.edges.filter((e) => e.source !== id && e.target !== id);
          if (state.selectedNodeId === id) {
            state.selectedNodeId = null;
            state.showConfigModal = false;
          }
        });
      },

      deleteEdge: (id) => {
        const snap = captureSnap(get());
        set((state) => {
          pushHist(state, snap);
          state.edges = state.edges.filter((e) => e.id !== id);
        });
      },

      updateNodeConfig: (id, patch) => {
        const snap = captureSnap(get());
        set((state) => {
          pushHist(state, snap);
          const node = state.nodes.find((n) => n.id === id);
          if (node) Object.assign(node.data, patch);
        });
      },

      setConcurrentUsers: (n) => {
        set((state) => {
          state.concurrentUsers = Math.max(0, Math.min(10000, Math.round(n)));
        });
      },

      // Capture one history entry at the start of a continuous interaction (e.g. slider drag).
      snapshot: () => {
        const snap = captureSnap(get());
        set((state) => pushHist(state, snap));
      },

      clearAll: () => {
        const snap = captureSnap(get());
        set((state) => {
          pushHist(state, snap);
          state.nodes = [];
          state.edges = [];
          state.selectedNodeId = null;
          state.showConfigModal = false;
        });
      },

      undo: () => {
        const cur = get();
        if (cur.history.length === 0) return;
        const current = captureSnap(cur);
        set((state) => {
          const prev = state.history.pop()!;
          state.redoStack.push(current);
          state.nodes = prev.nodes;
          state.edges = prev.edges;
          state.concurrentUsers = prev.concurrentUsers;
        });
      },

      redo: () => {
        const cur = get();
        if (cur.redoStack.length === 0) return;
        const current = captureSnap(cur);
        set((state) => {
          const next = state.redoStack.pop()!;
          state.history.push(current);
          state.nodes = next.nodes;
          state.edges = next.edges;
          state.concurrentUsers = next.concurrentUsers;
        });
      },

      openConfig: (id) =>
        set((state) => {
          state.selectedNodeId = id;
          state.showConfigModal = true;
        }),

      closeConfig: () =>
        set((state) => {
          state.showConfigModal = false;
          state.selectedNodeId = null;
        }),

      replaceArchitecture: (data) => {
        const snap = captureSnap(get());
        set((state) => {
          pushHist(state, snap);
          state.nodes = data.nodes;
          state.edges = data.edges;
          state.concurrentUsers = data.concurrentUsers;
          state.selectedNodeId = null;
          state.showConfigModal = false;
        });
      },

      toggleVariance: () =>
        set((state) => {
          state.varianceEnabled = !state.varianceEnabled;
        }),

      rerollVariance: () =>
        set((state) => {
          state.varianceSeed = Math.floor(Math.random() * 1e9);
          state.varianceEnabled = true;
        }),

      toggleLive: () =>
        set((state) => {
          state.varianceLive = !state.varianceLive;
          if (state.varianceLive) state.varianceEnabled = true;
        }),

      // Advance the seed one step (driven by an interval when live). No history.
      tickVariance: () =>
        set((state) => {
          state.varianceSeed = (state.varianceSeed + 1) % 1_000_000;
        }),
    })),
    {
      name: 'cloudcalc-flow',
      storage: safeStorage,
      partialize: (s) => ({
        nodes: s.nodes,
        edges: s.edges,
        concurrentUsers: s.concurrentUsers,
        nodeSeq: s.nodeSeq,
        varianceEnabled: s.varianceEnabled,
        varianceSeed: s.varianceSeed,
        varianceLive: s.varianceLive,
      }),
    },
  ),
);
