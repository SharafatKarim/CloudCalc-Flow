## CloudCalc Flow - Visual Cloud Architecture Simulator and Cost Estimator

### **Role and Objective**
Act as an Expert Frontend Architect and UI/UX Developer. Build a "Visual Cloud Architecture Simulator and Cost Estimator"—a fully client-side application where users drag-and-drop infrastructure components onto a canvas, configure them, simulate user traffic, and view real-time cost and performance metrics with intelligent suggestions.

---

### **Tech Stack**
* **Framework:** Next.js (App Router, React 18+)
* **Drag-and-Drop Canvas:** React Flow v11+
* **State Management:** Zustand
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
* **Undo/Redo:** Zustand middleware or `immer` for immutable state updates
* **Export:** Browser's native File API for downloading files

---

### **1. Data Models and Hardcoded Logic (`lib/infrastructureData.ts`)**

#### **Server Tiers (with monthly costs):**
```
Micro:   1GB RAM,  2 vCPU,  $8/mo
Small:   2GB RAM,  2 vCPU,  $16/mo
Medium:  4GB RAM,  4 vCPU,  $32/mo
Large:   8GB RAM,  8 vCPU,  $64/mo
```

#### **Operating Systems (Base RAM Overhead):**
```
Ubuntu:       400MB
Alpine Linux: 50MB
Arch Linux:   100MB
```

#### **Tech Stacks (Memory Footprint per 100 Concurrent Users):**
```
Next.js (Frontend SSR):  150MB per 100 users
Express.js (Node.js):    80MB per 100 users
Python/Flask (Sync):     50MB per 100 users
Go (Compiled):           20MB per 100 users
```

#### **Database/Storage Components (Fixed Monthly Costs):**
```
PostgreSQL (1GB):  $10/mo
MySQL (1GB):       $8/mo
S3-like Storage:   $5/mo (base) + $0.10 per GB
Redis Cache:       $15/mo
```

#### **Load Balancer (Fixed Cost):**
```
Cost: $20/mo
Supports: Up to 1,000 concurrent connections per instance
```

#### **Performance Baseline (per tier, per 100 users):**
```
Micro:   Response time +50ms, Max throughput 100 req/s
Small:   Response time +20ms, Max throughput 500 req/s
Medium:  Response time +10ms, Max throughput 2000 req/s
Large:   Response time +5ms,  Max throughput 5000 req/s
```

---

### **2. UI Layout & Architecture**

#### **Left Sidebar (Component Palette):**
- Draggable items with icons:
  - 🖥️ Compute Server
  - ⚖️ Load Balancer
  - 🗄️ Database (PostgreSQL, MySQL)
  - 💾 S3 Storage
  - ⚡ Redis Cache
- Each item should show basic info on hover (cost, purpose, default config)

#### **Center Area (React Flow Canvas):**
- Interactive grid background
- Nodes with drag handles
- Edges showing connections (arrows pointing direction of traffic flow)
- **Connection Rules (Enforce Visually):**
  - Load Balancer → connects only to Compute Servers
  - Compute Server → can connect to Databases, Redis, S3
  - Database/Cache → can receive connections from multiple Servers
  - Visual feedback: highlight valid drop zones when dragging a node near another
  - Show error toast if user tries invalid connection

#### **Right Sidebar (Global Controls & Metrics):**
- **Simulated Concurrent Users Slider:** 0–10,000 (with numeric input field)
- **Total Estimated Monthly Cost:** Bold, prominent display
- **Global Status Indicator:** 
  - 🟢 Healthy (all nodes ≤ 80% capacity)
  - 🟡 Warning (any node 80–99% capacity)
  - 🔴 Overloaded (any node ≥ 100% capacity)
- **Key Metrics Display:**
  - Total RAM across all servers
  - Average Response Time (ms)
  - Peak Throughput (req/s)
  - Estimated Bandwidth Usage (GB/mo) *if applicable*
- **Buttons:**
  - 📥 Undo (disabled if no history)
  - 📤 Redo (disabled if no redo stack)
  - 💾 Export to JSON
  - 📋 Copy Architecture as Text
  - 🗑️ Clear All

#### **Top Bar/Header:**
- App title + logo
- Quick stats badge (e.g., "5 Servers, 2 Databases")

---

### **3. Custom Node Components & State**

#### **Compute Server Node:**
Display the following:
- **Icon & Label:** Server icon + custom name (editable)
- **Config Badge:** Shows selected tier, OS, and tech stack as small pills (e.g., "Micro / Ubuntu / Next.js")
- **RAM Utilization Progress Bar:**
  - Green: 0–60%
  - Yellow: 60–80%
  - Orange: 80–100%
  - Red: ≥ 100% (OOM state, node border turns red)
- **Metrics Tooltip (on hover):**
  - Used RAM / Total RAM
  - Response time
  - Current throughput
  - Status (Healthy/Warning/Overloaded)
- **Click to Configure:** Opens a modal/panel (see below)

#### **Load Balancer Node:**
- Icon & label "Load Balancer"
- Displays: Current connections / max capacity
- Connection counter (e.g., "Connected to 3 servers")
- No configuration needed (fixed cost)

#### **Database/Storage/Cache Nodes:**
- Icon & label (PostgreSQL, S3, Redis, etc.)
- Size indicator (e.g., "1GB", "5GB")
- Displays: Cost per month
- Simple click to configure storage size (if applicable)

#### **Connection Edges:**
- Arrow showing direction of traffic flow
- On hover, show: data volume, estimated bandwidth cost (if applicable)
- Click to delete connection

#### **Node Configuration Modal (triggered on node click):**
Opens a side panel with:
- **For Compute Servers:**
  - Dropdown: Hardware Tier (Micro, Small, Medium, Large)
  - Dropdown: Operating System (Ubuntu, Alpine, Arch)
  - Dropdown: Tech Stack (Next.js, Express.js, Flask, Go)
  - Text input: Custom server name
  - Preview of updated calculations
  - 🗑️ Delete this server button
- **For Databases:**
  - Dropdown: Database type (PostgreSQL, MySQL)
  - Slider: Storage size (1GB–100GB)
  - Preview cost update
- **For Storage:**
  - Slider: Storage size (1GB–1000GB)
  - Preview cost update

---

### **4. The Core Simulation Math (Zustand Store)**

#### **Calculation Loop (triggers on slider change or node config update):**

For **each Compute Server node:**

```
Total Node RAM = Selected Tier RAM

Base RAM Used = (OS Overhead) + (Framework Idle Memory)

Connected Servers Count = Total servers in canvas connected to load balancer or directly receiving traffic

Traffic RAM Used = (Concurrent Users / Connected Servers Count) / 100 * (Stack RAM per 100 users)

Total RAM Utilized = Base RAM Used + Traffic RAM Used

RAM Utilization % = (Total RAM Utilized / Total Node RAM) * 100

Response Time Impact = (Tier Response Baseline) + (RAM Utilization % / 100) * 50ms

Throughput = Tier Max Throughput * (1 - RAM Utilization % / 150) [degradation if overloaded]
```

#### **Global Metrics:**

```
Total Monthly Cost = Sum of all active node costs

Total System RAM = Sum of all server tier RAM

Average Response Time = Weighted average based on traffic distribution

Peak Throughput = Min(Sum of all server throughputs, Load Balancer capacity limit)

Total Bandwidth Usage = (Concurrent Users * Avg Data per User per Month) [define a default]
```

#### **State Structure (Zustand):**
```typescript
{
  nodes: Node[],          // React Flow nodes
  edges: Edge[],          // React Flow edges
  concurrentUsers: number,
  history: State[],       // for undo
  redoStack: State[],     // for redo
  selectedNodeId: string | null,
  showConfigModal: boolean,
}
```

---

### **5. Real-Time Warnings & Intelligent Suggestions**

When a **Compute Server reaches OOM (≥100% RAM):**
- Node border turns red
- Show a notification toast: "Server 'API-01' is overloaded!"
- Display suggestion: 
  - Option A: "Upgrade to [Next Tier] (+$X/mo) to handle load"
  - Option B: "Add another server and connect to Load Balancer (+$X/mo)"
  - Option C: "Reduce simulated users to [X] to stay healthy"
- Each suggestion should show the delta cost and impact

When **Global Status is Warning or Overloaded:**
- Highlight the critical node(s) with a pulsing glow or warning icon
- Display banner at top with recommendation

---

### **6. Advanced Feature: Export Configuration**

#### **Export to JSON:**
- Button: "💾 Export Architecture"
- Downloads a `.json` file containing:
  - All nodes (config, position, type)
  - All edges (connections)
  - Metadata (creation date, total cost, user count)
- Allow users to import previously saved architectures

#### **Copy as Text:**
- Button: "📋 Copy Architecture Summary"
- Generates markdown/text summary:
  ```
  # Cloud Architecture
  
  ## Servers
  - Server-1 (Micro, Ubuntu, Next.js) @ 8/mo
  
  ## Databases
  - PostgreSQL (1GB) @ 10/mo
  
  ## Total Monthly Cost: $18
  ```
- Copy to clipboard

#### **Docker Compose Export (Optional, Future):**
- For now, **skip this**—focus on JSON export and text summary

---

### **7. Undo/Redo Functionality**

- Maintain a `history` array in Zustand state
- Every action (add node, delete node, change config, move node, add edge, delete edge, change user slider) creates a new state snapshot
- **Undo button:** Revert to previous state
- **Redo button:** Move forward in history
- Limit history to last 50 states to prevent memory bloat
- Visual indicator: disable buttons when at start/end of history

---

### **8. UI/UX Enhancements & Best Practices**

#### **Drag & Drop:**
- Dragging from sidebar creates new node at drop location
- Show ghost/preview while dragging
- Snap to grid (optional, for clean alignment)

#### **Zoom & Pan:**
- Mouse wheel to zoom canvas
- Middle-mouse or space+drag to pan
- Reset view button

#### **Keyboard Shortcuts:**
- `Ctrl/Cmd + Z` = Undo
- `Ctrl/Cmd + Shift + Z` = Redo
- `Delete` = Delete selected node/edge
- `Escape` = Deselect / close modal

#### **Responsiveness:**
- Sidebar collapses on mobile to hamburger menu
- Canvas adapts to screen size
- Metrics panel stacks vertically on small screens

#### **Dark Mode Support (Nice-to-Have):**
- Use Tailwind's `dark:` utilities
- Toggle in header

#### **Tooltips & Help:**
- Hover hints on all buttons
- Info icons next to metrics with explanations
- First-time user tour (optional: Shepherd.js or similar)

---

### **9. Execution Steps for the AI**

1. **Project Setup:**
   - Initialize Next.js project (App Router)
   - Install dependencies: `react-flow-renderer`, `zustand`, `tailwind`, `lucide-react`
   - Set up folder structure (`app/`, `lib/`, `components/`, `store/`, `hooks/`)

2. **Define Data Models:**
   - Create `lib/infrastructureData.ts` with all tier, OS, tech stack, and component data
   - Create TypeScript interfaces: `ServerNode`, `DatabaseNode`, `LoadBalancerNode`, `EdgeConfig`

3. **Build Zustand Store (`store/architectureStore.ts`):**
   - State: nodes, edges, concurrentUsers, history, redoStack
   - Actions: addNode, deleteNode, updateNode, addEdge, deleteEdge, updateConfig, setUsers
   - History: Wrap actions with history snapshotting
   - Selectors: totalCost, totalRAM, globalStatus, avgResponseTime, peakThroughput

4. **Create React Flow Canvas Component:**
   - Custom nodes: `components/nodes/ServerNode.tsx`, `DatabaseNode.tsx`, etc.
   - Custom edges (optional styling)
   - Handles for drag-and-drop
   - Right-click context menu (delete, duplicate)

5. **Build Configuration Panel:**
   - `components/ConfigModal.tsx` with dynamic fields based on node type
   - Real-time cost preview
   - Suggestion engine (when OOM detected)

6. **Implement Metrics Display:**
   - Right sidebar: live metrics update as slider changes
   - Status indicator color logic
   - Suggestion cards

7. **Wire Up Simulation Math:**
   - Create `hooks/useSimulation.ts` that recalculates metrics whenever users or node config changes
   - Sync progress bar on nodes with calculations

8. **Add Export Functionality:**
   - JSON export/import
   - Text summary copy-to-clipboard

9. **Implement Undo/Redo:**
   - Zustand middleware to snapshot state on mutations
   - Hook: `useUndo()` / `useRedo()`

10. **Polish & Testing:**
    - Add loading states, error boundaries
    - Keyboard shortcuts
    - Mobile responsiveness
    - Test with various architectures

---

### **10. Suggested Connection Validation Rules**

**Strict Mode (Recommended):**
- ✅ Load Balancer → Compute Server
- ✅ Compute Server → Database
- ✅ Compute Server → S3 Storage
- ✅ Compute Server → Redis Cache
- ❌ Database → Database (invalid)
- ❌ S3 → Anything (invalid source)
- ❌ Redis → Anything except Compute Server (invalid source)

**Visual Feedback:**
- When dragging from a node, highlight valid targets in green
- Invalid targets show red outline
- Show tooltip: "Cannot connect [Type A] to [Type B]"

---

### **11. Optional Future Enhancements**

- **Monitoring Dashboard:** Add a separate view showing real-time metrics trends (chart history)
- **Preset Architectures:** Load common patterns (e.g., "Scalable Web App," "Microservices")
- **Cost Comparison:** Side-by-side view of different configurations
- **SSL/Security Costs:** Add security layers with associated costs
- **CDN Integration:** Add CDN nodes for static asset delivery
- **Region Selection:** Deploy same architecture to different cloud regions with cost comparison
- **Terraform/CloudFormation Export:** Generate IaC code (future)

---

### **12. Notes for the AI Agent**

- **Prioritize User Experience:** Smooth animations, responsive feedback, clear error messages
- **Accessibility:** Use semantic HTML, ARIA labels, keyboard navigation
- **Performance:** Canvas should handle 20+ nodes smoothly; use React Flow's virtualization if needed
- **Code Organization:** Keep components small, use custom hooks for logic extraction
- **Testing:** Add unit tests for simulation math and state mutations
- **Documentation:** Include JSDoc comments for all calculation functions

---

This should be a complete, production-ready prompt! Let me know if you'd like me to refine any section further.
