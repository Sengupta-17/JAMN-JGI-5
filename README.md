# Junior Astronaut Mission Trainer (JAMN)

Comprehensive end-to-end simulation for the *Junior Astronaut Mission Trainer*, implementing **Segment 1** (Trans-Mars Flight Deck, Orbital Reconnaissance & Site Analysis), **Segment 2** (9-Stage EDL & Surface EVA Exploration), **Segment 3** (Base Operations, 5-Stage Hyperbaric Airlock Ingress, 3D First-Person Habitat Navigation & Gazebo Contact Physics), and **Segment 4** (Game Engine: NASA BVAD Rev. 2 Parameter Physics, 30-Sol Diurnal Cycle, 7 Modular Hazards, and 3D Mars Surface Simulation).

---

## 🚀 Mission Architecture & Overview

The mission trainer provides an unbroken, scientifically calibrated expedition from interplanetary flight through a 30-Sol surface survival deployment:

```
[ Segment 1: Flight Deck & Orbit ] ➔ [ Segment 2: EDL & EVA ] ➔ [ Segment 3: Base Ingress & 3D Habitat ] ➔ [ Segment 4: 30-Sol Surface Sim ]
```

### Segment 1: Trans-Mars Flight Deck, Orbital Reconnaissance & Site Dossiers
* **Stage 0 — Mission Briefing & Mars Globe:** High-fidelity procedural 3D Mars sphere utilizing MOLA topographic heightfield displacement, real-time solar terminator lighting, albedo feature maps, and mission briefing telemetries.
* **Stage 1 — Cockpit Approach Flight Deck:** First-person interplanetary spacecraft cockpit featuring structural canopy glazing, dashboard glare shield, 3 interactive angled Multi-Function Displays (MFDs), throttle lever, flight stick, warp boost mode, and live approach telemetry.
* **Stage 2 — Orbital Reconnaissance:** Spacecraft orbital insertion track with 4 selectable landing beacons orbiting above the Martian sphere.
* **Stage 3 — Landing Site Analysis Dossiers:** Environmental and topographical profiles for 4 authentic landing sites, verified against NASA/JPL Viking, Mars Global Surveyor MOLA, Mars Odyssey THEMIS, and Mars Reconnaissance Orbiter (MRO) datasets:
  - **Valles Marineris (`valles_marineris`):** $14.0^\circ\text{S}, 301.0^\circ\text{E}$ ($-7.0\text{ km}$ elevation, $0.95\text{–}1.05\text{ kPa}$). Baseline resources: 70% $\text{O}_2$, 75% Food, 68% $\text{H}_2\text{O}$, 72% Power.
  - **North Polar Ice Cap / Planum Boreum (`north_polar` / `polar_ice_caps`):** $83.5^\circ\text{N}, 15.0^\circ\text{E}$ ($-2.0\text{ km}$ elevation, $-110^\circ\text{C}$ to $-125^\circ\text{C}$). High water ice reserves ($92\%$), high thermal heating load ($55\%$ Power).
  - **Olympus Mons (`olympus_mons`):** $18.65^\circ\text{N}, 226.2^\circ\text{E}$ ($+21.9\text{ km}$ summit, $30\text{–}72\text{ Pa}$). Superior solar flux ($88\%$ Power), arid basaltic terrain ($45\% \text{H}_2\text{O}$).
  - **Hellas Basin (`hellas_basin`):** $42.4^\circ\text{S}, 70.5^\circ\text{E}$ ($-7.15\text{ km}$ floor, $1.15\text{–}1.24\text{ kPa}$). Deep atmospheric shielding ($82\% \text{O}_2$), high dust opacity ($50\%$ Power).

### Segment 2: Entry, Descent, Landing (EDL) & Surface EVA Traversal
* **Stage 4 — 9-Stage Telemetry-Calibrated EDL:**
  1. Orbital Positioning & De-orbit Burn
  2. Atmospheric Entry Interface ($125\text{ km}$, Mach 24.5)
  3. Peak Compression Heating & Plasma Blackout
  4. Supersonic Deceleration & Parachute Deployment (Mach 1.8)
  5. Heat Shield Jettison & Terrain Navigation Camera Lock
  6. Terminal Retro-Propulsion Ignition (Methalox plumes)
  7. Radar Altimetry & Lateral Hazard Avoidance
  8. Final Touchdown & Landing Confirmation
  9. Habitat Ingress Authorization & Power Handover
* **Stage 5 — Surface EVA & Regolith Sampling:** Dual-perspective EVA exploration (First-person helmet visor overlay with HUD telemetry and third-person articulated 3D astronaut suit), $0.38g$ low-gravity walking/jumping, geological core sampling, and Outpost Ares-1 approach.
* **Stage 6 — Base Survival Interface & Clean Ingress:** Direct handoff via **Begin Survival Mission** into Segment 3's **1. BASE ENTRY** screen without premature cycle triggers.

### Segment 3: Mars Base Operations, 3D Habitat & Hardware Diagnostics
* **Base Ingress & Exterior Visualizer:** Exterior habitat render displaying the inflatable pressurized dome, 3D-printed sulfur-regolith protective shell, and manual airlock hatch.
* **5-Stage Hyperbaric Airlock Equalization:** Simulates atmospheric purge and chamber pressurization from ambient Mars ($0.62\text{ kPa}$) to habitat operational pressure ($101.3\text{ kPa}$) with acoustic cues.
* **Fullscreen First-Person 3D Viewport:** Interactive interior habitat rendering with an icosahedron greenhouse dome, external terrain projection, and operable blast doors.
* **Gazebo Contact Physics:** Physical space constraints with Gazebo ODE contact projection ($0.38g = 3.72\text{ m/s}^2$, $\mu=0.82$) and solid capsule collision bounds preventing geometry clipping.
* **Hardware Module Inspection & Repairs:** Proximity-based interaction (`[E]` key) to diagnose and repair 7 internal modules: Water Recovery System, Oxygen Generation Assembly, Power Distribution, Hydroponic Aeroponics, Thermal Control, Comm Array, and Airlock Seals.

### Segment 4: 30-Sol Martian Surface Game Engine
* **NASA BVAD Rev. 2 Scientific Life-Support Calibration:**
  - **Oxygen ($100\% = 42.96\text{ kg}$):** 12 crew-days metabolic buffer for 4 crew ($D_O = 8.333\text{ pp/sol}$). Electrolysis rate modulated by module health, power, water availability, and seal integrity.
  - **Food ($100\% = 144.0\text{ kg}$):** 45 crew-days dry ration solids ($D_F = 2.222\text{ pp/sol}$). Hydroponics yield up to $+22\%$ caloric harvest credit ($+0.489\text{ pp/sol}$).
  - **Water ($100\% = 21.504\text{ kg}$):** 20 sols of net make-up buffer for a $94\%$-efficient closed recovery loop ($D_W = 5.00\text{ pp/sol}$ loss). Brine recovery ($98\%$) reduces loss to $1.67\text{ pp/sol}$; subsurface ISRU extraction replenishes $(2.00 + 1.50\sqrt{i_{\text{site}}})\cdot h_{\text{water}}\cdot\text{isruWater}\text{ pp/sol}$.
  - **Power ($100\% = 2,400\text{ kWh}$):** 5 sols of continuous $20\text{ kWe}$ nominal habitat load ($20\text{ pp/sol}$ consumption). Dual-source generation from a $10\text{ kWe}$ Kilopower reactor ($0.50$ baseline, dust-immune) and photovoltaic solar arrays ($0.60$ baseline, attenuated by optical depth $\tau$ and soiling).
* **Automatic Electrical Load Shedding:** Cascades across 40%, 25%, 10%, and 0% blackout thresholds.
* **30-Sol Diurnal Simulation Clock:** 60 seconds real-time per sol (42s Day / 18s Night, ~30 minutes total campaign) with continuous integration.
* **Crew Economy & Conditioning Debt:** 20 discretionary Crew-Hours (CH) pool per sol. Skipping daily exercise countermeasure incurs musculoskeletal debt, reducing future CH and elevating EVA maintenance costs.
* **Simulation Pause State:** On-screen pause toggle and `[P]` shortcut suspending physics, kinematics, and resource drain with zero penalty.
* **Daily Return to Base & Re-launch Loop:**
  - Concluding a 60-second sol prompts the End-of-Sol summary and returns the crew to Base Alpha-1 (`Base Info`).
  - Active Sol illuminated on the **30-Sol Expedition Timeline & Sol Tracker Graphic**.
  - Advancing to the next sol launches through **Challenge Briefing**, where a fresh random operational scenario is generated for each day.
* **Mission Restart & Warning Confirmation Protocol:**
  - Selecting **0. FLIGHT & LANDING** from Segments 3 and 4 displays a confirmation dialog (`#restartConfirmationModal`) preventing accidental resets.
  - Confirming terminates active surface rover simulations, resets the loop, restores Sol to 1, clears active hazards, and restarts from Segment 1 Stage 0.
* **7 Modular Environmental Hazards:** Water recovery malfunction, crop rack failure, subzero cold snaps, SPE radiation storms, deconditioning, dust storms, and cabin seal decompression.
* **3D Mars Surface Simulation:** Procedural LOD terrain streaming, 6-wheel rocker-bogie rover vehicle dynamics, dynamic diurnal sun lighting, and GPU dust storm particle shaders.
* **Handover Evaluation at Sol 30:** Evaluates mission completion as *Certified Handover Ready*, *Marginal Completion*, or *Failed Mission*.

---

## 🎮 Controls

### Flight Deck & Cockpit (Segment 1)
| Control | Action |
|---------|--------|
| **Mouse Drag / Click** | Rotate cockpit camera & examine flight instruments |
| **Warp Button / Toggle** | Engage Trans-Mars warp acceleration burst |
| **Site Reticle Click** | Select orbital target and inspect landing site dossier |

### Surface EVA Exploration (Segment 2)
| Control | Action |
|---------|--------|
| **W / A / S / D** or **Arrows** | Walk across Martian surface terrain |
| **Spacebar** | Low-gravity jump ($0.38g$ Martian leap) |
| **[V] Key** | Toggle Helmet Visor POV / Third-Person Spacesuit View |
| **Action Buttons** | Collect regolith sample / Enter Habitat Airlock |

### Interior Base Operations (Segment 3)
| Control | Action |
|---------|--------|
| **W / A / S / D** or **Arrows** | Walk forward, left, backward, right |
| **Mouse Look (Click viewport)** | Rotate head / look around (Pointer Lock) |
| **Spacebar** | Low-gravity jump ($0.38g$ leap) |
| **[E] Key** | Interact with terminal / Toggle Airlock Blast Door |
| **[ESC] Key** | Close side popup / Release mouse look |
| **[TAB] Key** | Exit 3D Viewport to navigation menu |

### Surface Simulation & Rover (Segment 4)
| Control | Action |
|---------|--------|
| **W / S** or **Up / Down** | Rover throttle / Astronaut walk |
| **A / D** or **Left / Right** | Rover steering / Astronaut turn |
| **Spacebar** | Low-gravity leap ($0.38g$, in Astronaut EVA view) |
| **[V] Key** | Toggle camera mode: **Rover Chase** $\to$ **Astronaut EVA** $\to$ **Tactical Orbit** |
| **[P] Key** | Pause / Resume surface simulation |

---

## 🧪 Automated Scientific Test Suite

The project includes an automated test runner validating the complete scientific and operational acceptance criteria across all segments:

```bash
npm test
```

### Test Coverage Summary (130 Tests Passing):
1. **`tests/test_parameters.js` (25 Tests):** NASA BVAD Rev. 2 baseline consumption, site-specific differentials, dust storm solar degradation, bulkhead decompression isolation, conditioning debt, load shedding cascades, and Sol 30 handover grading.
2. **`tests/test_pause_and_daily_loop.js` (21 Tests):** Simulation pause/resume state machine, overlay display guards, and the daily return-to-base cycle.
3. **`tests/test_base_telemetry_and_repair.js` (11 Tests):** Base telemetry synchronization and Gazebo 3D module repairs.
4. **`tests/test_segment1_2_integration.js` (73 Tests):** Landing site calibrations, 9-stage EDL sequence, Stage 6 survival handoff to Base Entry, restart confirmation modal, and simulation loop reset.

---

## 🛠️ Running the Application

Serve the application locally using any standard static HTTP server:

```bash
# Option 1: Python
python -m http.server 3000

# Option 2: Node.js serve
npx serve .
```

Open `http://localhost:3000` in any modern WebGL-compatible browser.
