# Architecture & System Design — Segment 3: Mars Base Operations

## 1. Overview
Segment 3 provides the operational base interface for the Junior Astronaut Mission Trainer, encompassing base ingress, resource telemetry HUD, fullscreen first-person 3D exploration with simulated 0.38g Martian contact physics, subsystem diagnostic inspection & repair, and randomized mission handoff into Segment 4.

---

## 2. Component Architecture

```
index.html (Single Page App Container)
├── Header HUD (Mission telemetry, site profile, audio toggle)
├── Parameters Bar (Oxygen, Food, Water, Power)
├── Navigation Tabs (1. Entry, 2. Info, 3. 3D Exploration, 4. Challenges)
├── Main Stage
│   ├── Screen 1: Base Entry (2D Canvas Exterior Visualizer + Airlock Modal)
│   ├── Screen 2: Base Info (Site sensor telemetry + Parameter diagnostics)
│   ├── Screen 3: 3D Base Exploration (Fullscreen Three.js Viewport)
│   │   ├── Reticle & In-Cockpit Mini HUD
│   │   ├── Three.js WebGL Renderer (Greenhouse dome, external terrain, modules)
│   │   ├── Gazebo Contact Physics Engine (0.38g gravity, solid colliders)
│   │   └── Slide-in Diagnostic & Repair Popup Panel
│   ├── Screen 4: Challenge Briefing (Operational hazard specifications)
│   └── Screen 5: Mission Launched (Random scenario reveal & handoff)
└── Simulation Harness (Landing site switch, hazard injection, contract log)
```

---

## 3. Core Modules

### 3.1 Three.js 3D Viewport (`js/threeBaseRenderer.js`)
* **Fullscreen Rendering:** The 3D viewport expands across the entire browser window upon activating the navigation screen.
* **Transparent Greenhouse Dome Roof:** Built with an icosahedron structure and transparent glass material (`opacity: 0.18`, `roughness: 0.04`, `metalness: 0.85`), supported by titanium geodesic mullions and a central cupola ring beam.
* **External Martian Landscape:** Surrounding the habitat is a 160m radius Martian terrain ground mesh, atmospheric sky dome with dust haze, sun orb, scattered boulders, and external photovoltaic solar arrays visible through the greenhouse roof.
* **Interactive Airlock Blast Door:** Positioned at the EVA portal ($z = 16.5\text{m}$). Includes an armored bulkhead frame, central glass viewport, locking handwheel, pneumatic pistons, and status beacon (red = sealed, green = open). Animates smoothly on user interaction, playing servo sounds and toggling the physical collision boundary.
* **EVA Airlock Vestibule:** An accessible transition chamber ($z = 16.5\text{m}$ to $20.0\text{m}$) containing wall-mounted spacesuits and an outer observation window overlooking the surface.

### 3.2 Contact Physics Engine (`js/gazeboPhysics.js`)
* **Martian Gravity Simulation:** Simulates downward acceleration under Mars gravity ($g = 3.721\text{ m/s}^2$, $0.38g$).
* **Astronaut Kinematics:** Bounded by an upright capsule collider ($r = 0.38\text{m}$, eye level $h = 1.72\text{m}$).
* **Contact Resolution & Wall Sliding:** Implements Gazebo ODE contact projection. Penetration vectors are corrected along surface normals, and tangential velocity components are preserved to produce smooth sliding along obstacles and walls.
* **Solid Collision Coverage:**
  - Perimeter dome bulkhead: $r = 16.6\text{m}$ (prevents clipping into perimeter storage lockers).
  - Central bio-planter bench: Cylinder at $(0, 0)$, $r = 3.4\text{m}$.
  - Central telemetry column: Cylinder at $(0, 0)$, $r = 0.6\text{m}$.
  - 3 Radial science workstations: Cylinder colliders ($r = 1.35\text{m}$) at radius $5.2\text{m}$.
  - Command desk console and ergonomic operator chair.
  - Comms and telemetry server racks.
  - ECLSS oxygen generation skids and Sabatier methanation reactor.
  - Agri-Pod vertical aeroponic towers.
  - Water recovery centrifuge distillation assembly.
  - Kilopower nuclear microgrid switchboard.
  - Interactive blast door: Solid when closed, toggled off when opened to allow corridor passage.

### 3.3 Application Controller (`js/segment3App.js`)
* **Lifecycle & Event Orchestration:** Binds DOM elements, initialises visualizers, manages active screens, and coordinates cross-segment contract events.
* **Slide-In Diagnostic Popup:** Replaces static sidebars. Pressing `[E]` near any subsystem slides in a hardware diagnostics panel showing component integrity and active malfunction data.
* **Emergency Repair Loop:** Displays alerts when issues are raised, handles active technician repair sequences, and confirms resolution via contract events.
* **Mission Handoff:** Randomly selects one of four mission challenges upon launch and dispatches state to Segment 4.

### 3.4 Procedural Audio Synthesizer (`js/audio.js`)
* Synthesizes all audio in real-time via the Web Audio API without external audio file dependencies.
* Procedural sound profiles:
  - UI tactile clicks and frequency beeps.
  - Hyperbaric airlock pressurization cycles (sub-bass hum and bandpassed noise bursts).
  - Hydraulic door servo motors and heavy mechanical locking clanks.
  - Emergency alarms with modulated frequency sweeps.
  - Low-frequency ambient ventilation background hum (55 Hz).
