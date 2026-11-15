# Segment 1 & Segment 2 Replication and Integration Specification

## 1. Overview and Scope

This document details the replication of **Segment 1** (Trans-Mars Injection, Cockpit Flight Deck, Orbital Reconnaissance, Landing Site Analysis) and **Segment 2** (Entry, Descent, and Landing [EDL], Surface EVA Regolith Traversal) from `jamn-game-milestone-2`, and their integration into **Segment 3** (Base Habitat Airlock Ingress, 3D Exploration & Repair) and **Segment 4** (30-Sol Diurnal Surface Simulation).

The simulator now forms a continuous mission arc:
1. **Title Briefing (Stage 0):** Rotating procedural 3D Mars globe with MOLA topography, albedo markings, and atmospheric scattering.
2. **Cockpit Approach (Stage 1):** First-person flight deck with canopy frame, glare shield, three angled MFDs, throttle quadrant, flight stick, warp boost, and approach telemetry.
3. **Orbital Reconnaissance (Stage 2):** Orbital craft and 4 interactive landing markers on the rotating globe.
4. **Site Analysis Dossier (Stage 3):** Scientific environmental profiles, NASA/JPL reconnaissance photos, procedural radar fallback, and verified life-support parameters.
5. **EDL Sequence (Stage 4):** 9-stage hypersonic entry, compression plasma, supersonic deceleration, methalox retro-propulsion plumes, regolith dust dispersal, and touchdown.
6. **Surface EVA (Stage 5):** First-person helmet visor and third-person articulated 3D spacesuit walking across Martian terrain, regolith sampling, environmental sensor HUD, and approach to Outpost Ares-1.
7. **Base Airlock Ingress (Segment 3):** Reaching the airlock hatch directly transitions into Segment 3's chamber pressurization sequence (0.62 kPa to 101.3 kPa) and unlocks the 3D base habitat.
8. **Base Habitat Operations (Segment 3):** First-person habitat navigation, module inspection, Gazebo contact physics, and emergency repairs.
9. **Surface Mission Simulation (Segment 4):** Diurnal day/night cycle, rocker-bogie rover kinematics, procedural LOD terrain, and resource budget management.

---

## 2. Calibrated Landing Site Baseline Parameters

All landing sites in Segment 1 and Segment 2 are calibrated to match the scientific models defined in Segments 3 and 4 (grounded in NASA BVAD Rev. 2 and CHAPEA 4-person baseline):

| Landing Site | Coordinates | Elevation | Oxygen (%) | Food (%) | Water (%) | Power (%) | Environmental Profile |
|---|---|---|---|---|---|---|---|
| **Valles Marineris** (`valles_marineris`) | 14.0°S, 301.0°E | -7.0 km | 70% | 75% | 68% | 72% | Balanced baseline, deep canyon floor (0.95–1.05 kPa), canyon wall wind shear. |
| **North Polar Ice Cap** (`polar_ice_caps` / `north_polar`) | 83.5°N, 15.0°E | -2.0 km | 78% | 60% | 92% | 55% | Water-ice rich (Planum Boreum), extreme cryogenic cold (-110°C to -125°C), low solar flux. |
| **Olympus Mons** (`olympus_mons`) | 18.65°N, 226.2°E | +21.9 km | 52% | 65% | 45% | 88% | Summit altitude, ultra-thin atmosphere (30–72 Pa), superior solar flux, dry basalt. |
| **Hellas Basin** (`hellas_basin`) | 42.4°S, 70.5°E | -7.15 km | 82% | 62% | 58% | 50% | Peak surface pressure (1.15–1.24 kPa), buried glacial deposits, high dust opacity. |

Both `polar_ice_caps` and `north_polar` are aliased across `data.js`, `baseData.js`, and `parameterEngine.js`.

---

## 3. Transition and Handoff Architecture

### 3.1 Transition from Surface EVA to Base Ingress
When the player approaches the habitat airlock in Stage 5 or clicks **Enter Mars Habitat Airlock →** (`#btn-enter-habitat`):
```javascript
window.JAMN_MAIN.enterHabitatAirlock();
```
1. Captures selected landing site ID (`state.confirmedSiteId || state.selectedSiteId`).
2. Emits `contractBus.emit('siteSelected', mappedSiteId)` to sync cross-segment state.
3. Pauses the Segment 1/2 Three.js animation loop via `JAMN_SCENE.pause()`.
4. Hides `#prologue-container`.
5. Unhides Segment 3's header, HUD, nav tabs, and main stage container.
6. Calls `window.jamnSegment3App.setSite(mappedSiteId)` to update environmental readouts and starting reserves.
7. Calls `window.jamnSegment3App.triggerAirlockIngress()`, launching the atmospheric purge and pressurization sequence.

### 3.2 Mission Restart & Reset Confirmation Protocol
- Selecting **0. FLIGHT & LANDING** (`#tabBtnPrologue`) from Segments 3 and 4 triggers a high-visibility tactical warning modal (`#restartConfirmationModal`) inquiring: *"Do you want to Restart?"*
  - **Cancel (No):** Dismisses the dialog, maintaining active simulation state without interruption.
  - **Confirm (Yes):**
    - Terminates and resets active Segment 4 rover simulation (`window.jamnSegment4App.resetMission()`), stopping the animation ticker, resetting Sol back to 1, and clearing pause/handover overlays.
    - Resets Segment 3 base Sol UI, radial Sol progress gauge, matrix cells, and clears active base hazards.
    - Invokes `window.JAMN_MAIN.restartMission()` to clear mission telemetry and resets back to Stage 0 (Title Briefing).
- In Segments 1 and 2, the dedicated restart buttons in the top navigation bar and Stage 6 operate without interruption or unnecessary confirmation prompts.
- The legacy "Browser reload restarts from Day 1" label and rules have been eliminated, establishing the "Flight & Landing" navigation workflow as the single authoritative reset mechanism.

### 3.3 Direct Survival Mission Ingress Mapping
- In Stage 6 (Habitat View), clicking **Begin Survival Mission** directly invokes:
  ```javascript
  window.transitionToSegment3(mappedSiteId, "base_entry", false);
  ```
  This immediately navigates the astronaut to the **1. BASE ENTRY** screen (`#screen_base_entry`), presenting the exterior habitat visualizer and the **INITIATE AIRLOCK INGRESS** action without forcing an automatic airlock cycle.

### 3.4 Habitat Lifecycle Corrections
- Removed the manual "Advance to Next Martian Sol (24h 37m)" control and the local "Habitat Telemetry Log" from Stage 6. Daily Martian Sol progression is exclusively governed by the calibrated 60-second diurnal cycle in Segment 4, with telemetry synchronized to Base Alpha-1 upon Sol completion.

---

## 4. File Structure and Asset Map

- `js/prologue/data.js`: Scientific constants, 4 calibrated landing site dossiers, 9-stage EDL sequence parameters, and official NASA image references.
- `js/prologue/scene.js`: Three.js rendering engine, procedural Mars surface albedo texture generator, 3D cockpit, orbital craft, EDL lander, articulated astronaut, and Web Audio API synthesized tones.
- `js/prologue/main.js`: State machine controller for stages 0 through 6, DOM telemetry bindings, and handoff triggers.
- `css/prologue.css`: Styling for `#prologue-container`, cockpit frame vignette, astronaut helmet visor, and telemetry panels.
- `tests/test_segment1_2_integration.js`: Automated acceptance test suite verifying data structures, starting percentages, DOM elements, and transition contracts.
