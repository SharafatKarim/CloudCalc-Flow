"use client";

import { useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import { useArchitectureStore } from "@/store/architectureStore";
import { useUiStore } from "@/store/uiStore";
import type { NodeType } from "@/lib/types";
import ServerNode from "./nodes/ServerNode";
import LoadBalancerNode from "./nodes/LoadBalancerNode";
import DatabaseNode from "./nodes/DatabaseNode";
import StorageNode from "./nodes/StorageNode";
import CacheNode from "./nodes/CacheNode";
import CdnNode from "./nodes/CdnNode";
import ApiGatewayNode from "./nodes/ApiGatewayNode";
import QueueNode from "./nodes/QueueNode";
import NosqlNode from "./nodes/NosqlNode";
import TrafficEdge from "./edges/TrafficEdge";

const nodeTypes: NodeTypes = {
  server: ServerNode,
  loadBalancer: LoadBalancerNode,
  database: DatabaseNode,
  storage: StorageNode,
  cache: CacheNode,
  cdn: CdnNode,
  apiGateway: ApiGatewayNode,
  queue: QueueNode,
  nosql: NosqlNode,
};

const edgeTypes: EdgeTypes = {
  traffic: TrafficEdge,
};

function Flow() {
  const { screenToFlowPosition } = useReactFlow();
  const nodes = useArchitectureStore((s) => s.nodes);
  const edges = useArchitectureStore((s) => s.edges);
  const onNodesChange = useArchitectureStore((s) => s.onNodesChange);
  const onEdgesChange = useArchitectureStore((s) => s.onEdgesChange);
  const onConnect = useArchitectureStore((s) => s.onConnect);
  const addNode = useArchitectureStore((s) => s.addNode);
  const theme = useUiStore((s) => s.theme);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/reactflow") as NodeType;
      if (!type) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(type, position);
    },
    [screenToFlowPosition, addNode],
  );

  return (
    <div className="h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode={theme}
        deleteKeyCode={["Backspace", "Delete"]}
        defaultEdgeOptions={{ type: "traffic" }}
        proOptions={{ hideAttribution: true }}
        fitView
        minZoom={0.2}
      >
        <Background gap={16} />
        <Controls />
        <MiniMap pannable zoomable className="!hidden md:!block" />
      </ReactFlow>
    </div>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
