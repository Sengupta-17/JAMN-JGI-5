# Architecture & System Design — Segments 3 & 4

## 1. Overview
The Junior Astronaut Mission Trainer combines an operational base habitat interface (Segment 3) with a real-time 30-sol Martian surface game engine (Segment 4). The architecture enforces scientific rigor calibrated against NASA BVAD Rev. 2 (February 2022) and the CHAPEA 4-person baseline, operating under Mars surface physics ($0.38g$).

---

## 2. System Topology

```
index.html (Single Page App Container)
├── Top Telemetry Strip & Mission Header
├── Global Alarm Banner
├── Four Base Parameters HUD (Oxygen, Food, Water, Power)
├── Navigation Tabs (1. Entry, 2. Info, 3. 3D Base, 4. Challenges, 5. Game Engine)
├── Main Workspace Stages
│   ├── Screen 1: Base Entry (2D Canvas Exterior Visualizer + Airlock Modal)
│   ├── Screen 2: Base Info (Site sensor telemetry + Parameter diagnostics)
│   ├── Screen 3: 3D Base Exploration (Fullscreen First-Person Three.js Viewport)
│   │   ├── Reticle & Mini HUD
│   │   ├── Three.js WebGL Interior Renderer (Greenhouse dome, external terrain)
│   │   ├── Gazebo Contact Physics Engine (0.38g gravity, solid colliders)
│   │   └── Slide-in Diagnostic & Repair Popup Panel
│   ├── Screen 4: Challenge Briefing (Operational hazard specifications)
│   ├── Screen 5: Mission Launched (Random challenge assignment & handoff)
│   └── Screen 6: Segment 4 Game Engine (30-Sol Mars Surface Simulation)
│       ├── Sol & Day/Night Phase HUD (60s/sol: 42s day / 18s night)
│       ├── 4 Calibrated Resource Cards (Live values, rates, status tags)
│       ├── 3D Surface Viewport (Chunk streaming, Rover, Astronaut EVA, Sky, Dust)
│       ├── Operating Policy Selector (Normal L0, Conserve L1, Survival L2)
│       ├── Crew Action Command Deck (Brine cycle, Ice drill, Crops, Exercise, Arrays)
│       ├── Morning Briefing & Weather Forecast Modal
│       └── Mission Handover / Failure Modal
└── Dev Integration Harness (Site switch, hazard injection, event log)
```

---

## 3. Segment 3 Core Modules

### 3.1 Three.js Interior Viewport (`js/threeBaseRenderer.js`)
* **Fullscreen Rendering:** Expands across the browser viewport for immersive first-person base operations.
* **Transparent Greenhouse Dome Roof:** Built with an icosahedron structure and transparent glass material (`opacity: 0.18`, `roughness: 0.04`, `metalness: 0.85`), supported by titanium geodesic mullions and a central cupola ring beam.
* **External Martian Landscape:** Surrounding the habitat is a 160m radius Martian terrain ground mesh, atmospheric sky dome with dust haze, sun orb, scattered boulders, and external photovoltaic solar arrays visible through the greenhouse roof.
* **Interactive Airlock Blast Door:** Positioned at the EVA portal ($z = 16.5\text{m}$). Includes an armored bulkhead frame, central glass viewport, locking handwheel, pneumatic pistons, and status beacon (red = sealed, green = open). Animates smoothly on user interaction, playing servo sounds and toggling the physical collision boundary.
* **EVA Airlock Vestibule:** An accessible transition chamber ($z = 16.5\text{m}$ to $20.0\text{m}$) containing wall-mounted spacesuits and an outer observation window overlooking the surface.

### 3.2 Contact Physics Engine (`js/gazeboPhysics.js`)
* **Martian Gravity Simulation:** Simulates downward acceleration under Mars gravity ($g = 3.721\text{ m/s}^2$, $0.38g$).
* **Astronaut Kinematics:** Bounded by an upright capsule collider ($r = 0.38\text{m}$, eye level $h = 1.72\text{m}$).
* **Contact Resolution & Wall Sliding:** Implements Gazebo ODE contact projection. Penetration vectors are corrected along surface normals, preserving tangential velocity along walls and equipment.
* **Solid Collision Boundaries:** Perimeter dome bulkhead ($r = 16.6\text{m}$), central bio-planter bench, central telemetry column, 3 radial science workstations, command desk, server racks, ECLSS skids, vertical aeroponics, water distillation centrifuge, Kilopower switchboard, and the interactive blast door.

---

## 4. Segment 4 Game Engine Core Modules

### 4.1 Scientific Parameter Engine (`js/engine/parameterEngine.js`)
* **Strictly 4 Base Resources:** Oxygen, Food, Water, Power (0–100%).
* **NASA BVAD Rev. 2 Mathematical Modeling:**
  - **Oxygen ($100\% = 42.96\text{ kg}$):** 12 crew-days metabolic reserve for 4 crew ($D_O = 8.333\text{ pp/sol}$). Healthy Oxygen Generation Assembly (OGA) electrolyzes water to match crew demand. Rates scale with ECLSS module health, available power $\sigma_E(P)$, water feed, and airlock seal tightness.
  - **Food ($100\% = 144.0\text{ kg}$):** 45 crew-days dry food solids ($D_F = 2.222\text{ pp/sol}$). Staggered hydroponics supply up to a $22\%$ caloric harvest credit ($0.489\text{ pp/sol}$) under nominal lighting, temperature, and tending.
  - **Water ($100\% = 21.504\text{ kg}$):** 20 sols of net make-up water reserve for a $94\%$-efficient recovery loop ($D_W = 5.00\text{ pp/sol}$ make-up loss). Under high-recovery brine processing ($98\%$), loss drops to $1.67\text{ pp/sol}$. Local ice extraction adds $(2.00 + 1.50\sqrt{i_{\text{site}}})\cdot h_{\text{water}}\cdot\text{isruWater}\text{ pp/sol}$.
  - **Power ($100\% = 2,400\text{ kWh}$):** 5 sols of continuous $20\text{ kWe}$ nominal habitat load ($20\text{ pp/sol}$ consumption). Powered by a $10\text{ kWe}$ Kilopower fission reactor ($0.50$ supply, unaffected by dust) and photovoltaic arrays ($0.60$ supply, attenuated by atmospheric opacity $T_\tau = \exp(-0.45\cdot\max(0, \tau - 0.5))$ and array soiling).
* **Automatic Load Shedding Cascades:**
  - $\ge 40\%$: Nominal operation.
  - $25\text{--}40\%$: Crop lights and extraction halved; base load capped at $0.74$.
  - $10\text{--}25\%$: Lights and extraction shed; ECLSS power factor derates linearly $1.0 \to 0.8$; water recovery trends to $90\%$; heating halved.
  - $< 10\%$: Emergency life support only; ECLSS factor falls $0.8 \to 0$; heating at $25\%$.
  - $0\%$: Electrical blackout; failure declared if unrecovered before sol end.

### 4.2 Simulation Loop (`js/engine/simulationLoop.js`)
* **Diurnal Pacing:** 30 Martian sols total. 60 seconds real-time per sol (42 seconds Day phase / 18 seconds Night phase), achieving ~30 minutes of active gameplay.
* **Continuous Sub-Tick Integration:** Smoothly integrates derivatives at display refresh rates.
* **Crew-Hour (CH) Economy:** 20 discretionary Crew-Hours per sol for the 4-person team. Deducts CH for maintenance, countermeasure sessions, and repair operations.
* **Failure Evaluation:** Detects depletion of any resource ($0\%$ Oxygen, Food, Water, or Power blackout).
* **Handover Grading at Sol 30:**
  - **Certified Handover Ready:** All 4 meters $\ge 25\%$, no active critical faults, pressure stable.
  - **Marginal Completion:** All 4 meters $> 0\%$, but narrow reserve margins or pending non-critical maintenance.
  - **Failed Mission:** Any resource reaches $0\%$ during the 30 sols.

### 4.3 Modular Hazard Management (`js/engine/hazards/hazardManager.js`)
* Manages 7 distinct Martian environmental hazards:
  1. **Water Scarcity:** Fouling of recovery centrifuge, ice extraction decline, pipe freeze, perchlorate contamination.
  2. **Food Production:** Aeroponic mister clogs, nutrient/pathogen imbalance, grow-light shedding, cold damage.
  3. **Extreme Temperatures:** Subzero cold snaps increasing heating load and freeze-fault probability.
  4. **Radiation:** Chronic dose accumulation ($0.66\text{ mSv/sol}\times\text{doseFactor}$) and low-probability Solar Particle Events requiring storm shelter lockdown.
  5. **Low Gravity:** Daily exercise countermeasure (5 CH); skipping accumulates conditioning debt that reduces future CH and inflates EVA repair costs.
  6. **Dust Storms:** Regional squalls and global dust storms driving opacity $\tau$ up to $10.0$ and depositing array soiling.
  7. **Low Pressure:** Exterior atmospheric thinness ($0.15\text{--}1.24\text{ kPa}$) and airlock seal decompression events.
* **Challenge Profiles:** Standard Survival, Global Dust Storm & Power Crisis, ECLSS Decompression & Subzero Shock, Hydrologic Failure & Agricultural Triage.

### 4.4 3D Mars Surface Simulation (`js/engine/surfaceSimulator.js`)
* **Procedural Topography & Chunk Streaming (`terrain/terrainManager.js`):** Independent terrain chunks loaded/unloaded around the player position within a dynamic radius. Continuous Level of Detail (LOD) and edge skirts eliminate elevation gaps. Analytical multi-octave fBm height function `getElevationAt(x, z)` shared identically between graphics and physics.
* **Rocker-Bogie Rover Dynamics (`entities/rover.js`):** 6-wheel vehicle kinematics, steering, velocity acceleration/braking, dynamic pitch and roll terrain normal alignment, wheel spinning, and third-person chase camera tracking.
* **Surface Astronaut Locomotion (`physics/surfacePhysics.js`):** $0.38g$ surface clamping, terrain friction, and low-gravity leaping.
* **Diurnal Atmosphere & Sky (`graphics/marsAtmosphere.js`):** Realistic Martian sky colors (salmon day, blue-violet twilight sunset, deep space night starfield) with directional sun light orbiting dynamically with the 60s sol clock.
* **GPU Dust Storm Blizzard (`graphics/dustStormVFX.js`):** 3,000+ particle system with turbulence, drift velocity, and opacity dynamically scaling with atmospheric optical depth $\tau$.
