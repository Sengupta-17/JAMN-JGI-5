# Junior Astronaut Mission Trainer — Segments 3 & 4

Production implementation of **Segment 3** (Base Operations, 3D First-Person Ingress & Hardware Diagnostics) and **Segment 4** (Game Engine: NASA BVAD Rev. 2 Parameter Physics, 30-Sol Diurnal Cycle, 7 Modular Hazards, and 3D Mars Surface Simulation) for the *Junior Astronaut Mission Trainer*.

---

## 🚀 Overview

### Segment 3: Mars Base Operations & Diagnostics
* **Base Ingress & Site Profiles:** 4 authentic landing sites (North Polar Ice Cap, Olympus Mons, Valles Marineris, Hellas Basin) with localized elevation, atmospheric density, and diurnal thermal swings.
* **5-Stage Hyperbaric Airlock Equalization:** Equalizes pressure from ambient Mars ($0.62\text{ kPa}$) to habitat exploration pressure with audio feedback.
* **Fullscreen First-Person 3D Viewport:** Interactive interior habitat rendering with an icosahedron greenhouse glass dome, external Martian landscape, and animated airlock blast door.
* **Gazebo Contact Physics:** Implements Gazebo ODE contact projection ($0.38g = 3.72\text{ m/s}^2$, $\mu=0.82$) with solid capsule colliders preventing object phasing.
* **Slide-in Diagnostics & Repairs:** Walk up to any of the 7 hardware modules in first-person and press `[E]` to diagnose and repair faults.

### Segment 4: 30-Sol Martian Surface Game Engine
* **NASA BVAD Rev. 2 Scientific Calibration:**
  - **Oxygen ($100\% = 42.96\text{ kg}$):** 12 crew-days metabolic reserve for 4 crew ($D_O = 8.333\text{ pp/sol}$). Healthy Oxygen Generation Assembly (OGA) electrolyzes water to match crew demand; rates scale with ECLSS module health, available power, water feed, and airlock seal tightness.
  - **Food ($100\% = 144.0\text{ kg}$):** 45 crew-days dry food solids ($D_F = 2.222\text{ pp/sol}$). Staggered hydroponics supply up to a $22\%$ caloric harvest credit ($0.489\text{ pp/sol}$) under nominal lighting, temperature, and tending.
  - **Water ($100\% = 21.504\text{ kg}$):** 20 sols of net make-up water reserve for a $94\%$-efficient recovery loop ($D_W = 5.00\text{ pp/sol}$ make-up loss). Under high-recovery brine processing ($98\%$), loss drops to $1.67\text{ pp/sol}$. Local ice extraction adds $(2.00 + 1.50\sqrt{i_{\text{site}}})\cdot h_{\text{water}}\cdot\text{isruWater}\text{ pp/sol}$.
  - **Power ($100\% = 2,400\text{ kWh}$):** 5 sols of continuous $20\text{ kWe}$ nominal habitat load ($20\text{ pp/sol}$ consumption). Powered by a $10\text{ kWe}$ Kilopower fission reactor ($0.50$ supply, unaffected by dust) and photovoltaic arrays ($0.60$ supply, attenuated by atmospheric opacity $T_\tau = \exp(-0.45\cdot\max(0, \tau - 0.5))$ and array soiling).
* **Automatic Load Shedding Cascades:** Realistic degradation across 40%, 25%, 10%, and 0% blackout thresholds.
* **30-Sol Diurnal Simulation Clock:** 60 seconds real-time per sol (42s Day / 18s Night, ~30 minutes total play) with continuous sub-tick integration.
* **Crew Economy & Conditioning Debt:** 20 discretionary Crew-Hours (CH) pool per sol. Skipping the daily 5 CH exercise countermeasure accumulates conditioning debt, reducing future CH and increasing external EVA repair costs.
* **Simulation Pause Option:** Dedicated Pause button (`#btnPauseSimulation`) and keyboard shortcut (`P`). Halts surface physics, rover dynamics, and resource consumption without penalty.
* **Daily Return to Base & Re-launch Loop:**
  - Upon completing a 60-second sol, the surface simulation concludes and displays the End-of-Sol summary modal.
  - The astronaut is returned to the base habitat (`Base Info`), where the new **30-Sol Expedition Timeline & Sol Tracker Graphic** illuminates the current sol and progress.
  - Hardware modules can be inspected and repaired in 3D first-person navigation (`Base Exploration`).
  - Advancing to the next day is done through the **Challenges Section**, where a **fresh random challenge scenario is rolled for each new day**, keeping gameplay dynamic across all 30 sols.
* **In-Memory Expedition Persistence:**
  - Active resource reserves, module health, conditioning debt, and cumulative radiation dose persist seamlessly in browser memory across daily transitions.
  - Reloading the browser page restarts the expedition from Day 1.
* **7 Modular Environmental Hazards:** Water scarcity, food production failure, subzero cold snaps, chronic/SPE radiation, low gravity, regional/global dust storms, and thin atmosphere seal decompression.
* **3D Mars Surface Simulation:**
  - Multi-chunk procedural terrain streaming with continuous Level of Detail (LOD) and gap-free skirts.
  - 6-wheel rocker-bogie exploration rover vehicle dynamics with terrain slope pitch/roll adaptation and chase camera.
  - 0.38g surface astronaut EVA locomotion and low-gravity leaps.
  - Diurnal Martian sky shader and dynamic sun light tracking the sol clock.
  - GPU dust storm particle system scaling with atmospheric optical depth ($\tau$).
* **Handover Evaluation at Sol 30:** Grades mission as *Certified Handover Ready*, *Marginal Completion*, or *Failed Mission*.

---

## 🎮 Controls

### Interior Base Operations (Segment 3)
| Control | Action |
|---------|--------|
| **W / A / S / D** or **Arrows** | Walk forward, left, backward, right |
| **Mouse Look (Click viewport)** | Rotate head / look around (Pointer Lock) |
| **Spacebar** | Low-gravity jump ($0.38g$ Martian leap) |
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

The project includes an automated test runner validating the 12 scientific acceptance criteria from Section 6.5 of the Mission Specifications:

```bash
npm test
```

Test coverage includes:
* **T-01:** Baseline resource consumption rates at Valles Marineris.
* **T-02:** North Polar Ice Cap ice access advantage and heating loads.
* **T-03:** Olympus Mons water deficit and 98% brine processor recovery.
* **T-04:** Global dust storm solar collapse and Kilopower fission persistence.
* **T-06:** Airlock seal decompression, bulkhead isolation, and repair.
* **T-09:** Musculoskeletal conditioning debt accumulation and CH penalty.
* **T-10:** Automatic electrical load shedding cascades (40%, 25%, 10%, 0%).
* **T-11 / T-12:** Sol 30 mission handover grading.

---

## 🛠️ Running the Application

Serve the application locally with any standard static HTTP server:

```bash
# Option 1: Python
python -m http.server 3000

# Option 2: Node.js serve
npx serve .
```

Open `http://localhost:3000` in any modern WebGL-compatible browser.
