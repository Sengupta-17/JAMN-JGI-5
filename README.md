# Junior Astronaut Mission Trainer — Segment 3: Mars Base Operations

This repository contains the production implementation of **Segment 3** for the *Junior Astronaut Mission Trainer* project.

---

## 🚀 Overview of Segment 3

Segment 3 covers everything from touchdown at the chosen Martian landing site up to launching the 30-sol survival simulation in Segment 4:

1. **Base Entry & Surface View**
   - High-fidelity visual landscape of Mars tailored to the 4 landing sites (North Polar Ice Cap, Olympus Mons, Valles Marineris, Hellas Basin).
   - Inflatable habitat domes, 3D-printed regolith radiation shield (NASA CHAPEA Mars Dune Alpha style), Kilopower Stirling nuclear reactor, and solar wings.
   - Interactive airlock cycle with a 5-stage hyperbaric pressure equalization sequence (0.62 kPa to 101.3 kPa).

2. **Base Telemetry & Resource HUD**
   - Tracks the **four fundamental base parameters**: `Oxygen`, `Food`, `Water`, and `Power`.
   - Scientifically calibrated starting parameter baselines per site.
   - Live telemetry status badges (Nominal / Deficit / Critical) and sensor breakdowns.

3. **Fullscreen 3D First-Person Base Exploration (Three.js & Gazebo Contact Physics)**
   - **Fullscreen First-Person View (FPV):** The 3D movement screen occupies the full browser viewport with an in-cockpit Mini HUD showing live Oxygen, Food, Water, and Power reserves.
   - **Slide-in Side Popup Panel:** Replaces static sidebars. Pressing `[E]` near any subsystem smoothly slides in a dedicated diagnostic and repair panel from the right.
   - **Solid Collision Physics:** Every interior object (3 radial science lab desks, command console, ergonomic chair, server racks, OGA electrolysis tanks, Sabatier reactor, aeroponic towers, centrifuge, and 20 perimeter cabinets) is bounded with strict collision hulls.
   - **Transparent Greenhouse Dome Roof:** The habitat dome features a transparent greenhouse structure overhead. Looking up reveals the Martian atmospheric sky, sun glare, outer red desert landscape, distant crater rims, and external solar panel arrays.
   - **Interactive Airlock Blast Door:** A circular sci-fi bulkhead hatch featuring pneumatic actuators, locking wheel, and status LED indicator (red when locked, green when open). Pressing `[E]` animates the door open with procedural hydraulic servo audio, allowing the astronaut to physically walk into the EVA airlock vestibule and observe Mars through the outer surface viewport.
   - **Gazebo Contact Physics:**
     * Implements Gazebo ODE contact physics under Martian partial gravity ($0.38g = 3.72\text{ m/s}^2$).
     * Astronaut kinematic capsule collider ($r=0.38\text{m}, h=1.72\text{m}$).
     * Penetration depth resolution, contact normal forces, surface friction ($\mu=0.82$), and tangential velocity projection for smooth wall-sliding.
     * Gazebo world definitions in `physics/base_habitat.world` and `physics/astronaut_kinematics.sdf`.
   - **Emergency Repair Loop:** When Segment 4 emits `baseIssueRaised`, the afflicted module pulses red with an audible siren. The astronaut can walk up to it in 3D and execute repairs via the slide-in popup panel, emitting `baseIssueFixed(locationId)` back to Segment 4.

4. **Challenge Briefing & Mission Allocation**
   - Detailed descriptions of the 4 operational Martian challenges (Standard Survival, Global Dust Storm & Power Crisis, ECLSS Atmospheric Decompression, Hydrologic Failure & Agricultural Triage).
   - Random allocation upon launch into Segment 4:
   - When the astronaut clicks **"LAUNCH MISSION"**, a challenge is **randomly assigned** and dispatched to Segment 4 via:
     $$\text{challengeSelected}(\text{siteId}, \text{randomChallengeType})$$

---

## 🎮 First-Person Controls

| Control | Action |
|---------|--------|
| **W / A / S / D** or **Arrow Keys** | Walk forward, left, backward, right |
| **Mouse Look (Click viewport)** | Rotate head / look around (Pointer Lock) |
| **Spacebar** | Low-gravity jump ($0.38g$ Martian leap) |
| **[E] Key** | Interact with terminal / Toggle Airlock Blast Door |
| **[ESC] Key** | Close side popup / Release mouse look |
| **[Tab] Key or ✕ EXIT 3D** | Return to mission tabs from fullscreen 3D |
| **View Toggle Button** | Switch between 3D FPV Interior and 2D Schematic Blueprint |

---

## 📦 Directory Structure

```
JAMN-JGI-5/
├── index.html                 # Segment 3 Mission Control & Fullscreen 3D FPV Interface
├── package.json               # Project manifest and start scripts
├── README.md                  # Segment 3 documentation
├── css/
│   └── styles.css             # Fullscreen 3D HUD, slide-in side popup, and tactical styling
├── js/
│   ├── baseData.js            # NASA subsystems, landing sites, and challenge configs
│   ├── audio.js               # Procedural Web Audio API sound synthesizer & door servos
│   ├── baseVisualizer.js      # 2D Canvas visualizer (Exterior landscape & Interior blueprint)
│   ├── gazeboPhysics.js       # Gazebo-grade contact physics engine (0.38g, solid colliders, door state)
│   ├── threeBaseRenderer.js   # Three.js 3D Fullscreen Base Renderer (Greenhouse dome, blast door, lab desks)
│   ├── contract.js            # BroadcastChannel / DOM event bus for Section 1.4 events
│   ├── segment3App.js         # Segment 3 UI controller, side popup manager, and repair engine
│   ├── segment3Contract.js    # Typed helper functions and constants for Segment 2 / 4 / 6 integration
│   └── vendor/
│       ├── three.min.js       # Standalone Three.js r128 engine
│       └── three.module.js    # Local Three.js ES module
└── physics/
    ├── base_habitat.world     # Gazebo 11 / Ignition Gazebo XML SDF world description
    └── astronaut_kinematics.sdf # Gazebo astronaut capsule collider definition
```

---

## ⚡ Quick Start & Running Locally

Because Segment 3 uses modern standard web standards (WebGL Three.js, ES Modules, Web Audio API), it can be run with zero build step:

```powershell
python -m http.server 3000
```
Then open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔗 Shared Contract Integration (Section 1.4)

```javascript
import { sendSiteSelected, sendBaseIssueRaised, onChallengeSelected, onBaseIssueFixed } from './js/segment3Contract.js';

// Segment 2 -> Segment 3: User selected a landing site
sendSiteSelected('valles_marineris');

// Segment 4 -> Segment 3: Inject emergency malfunction
sendBaseIssueRaised('eclss_module', { title: 'Electrolyzer Membrane Tear' });

// Segment 3 -> Segment 4: Random challenge assigned on launch
onChallengeSelected((payload) => {
  console.log('Segment 4 received challenge:', payload.challengeType);
});

// Segment 3 -> Segment 4: Module repaired by astronaut in 3D
onBaseIssueFixed((payload) => {
  console.log('Segment 4 received repair confirmation for:', payload.locationId);
});
```
