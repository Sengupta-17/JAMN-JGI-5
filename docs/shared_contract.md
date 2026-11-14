# Shared Contract Interface Specification

## 1. Overview
This document specifies the event communication contract between Segments 2, 3, 4, and 6 of the Junior Astronaut Mission Trainer, maintaining Section 1.4 architectural compliance.

---

## 2. Event Registry & Payloads

### 2.1 `siteSelected` (Segment 2 $\to$ Segment 3/4)
Dispatched when the player confirms a Martian landing site on the orbital map.
```javascript
{
  siteId: "valles_marineris" // 'north_polar' | 'olympus_mons' | 'valles_marineris' | 'hellas_basin'
}
```

### 2.2 `challengeSelected` (Segment 3 $\to$ Segment 4)
Dispatched when the player launches the mission from Segment 3. Assigns the mission challenge scenario and triggers Segment 4 initialization.
```javascript
{
  siteId: "valles_marineris",
  challengeType: "standard", // 'standard' | 'global_dust' | 'eclss_decomp' | 'hydrologic_fail'
  challengeTitle: "Standard Mission Operations",
  startingParameters: {
    oxygen: 70,
    food: 75,
    water: 68,
    power: 72
  },
  timestamp: 1731610000000
}
```

### 2.3 `gameStarted` (Segment 4 $\to$ System / HUD)
Emitted at the initiation of the 30-sol simulation run.
```javascript
{
  siteId: "valles_marineris",
  challengeType: "standard",
  day: 1,
  phase: "day",
  parameters: { oxygen: 70, food: 75, water: 68, power: 72 }
}
```

### 2.4 `dayStarted` (Segment 4 $\to$ System / UI)
Emitted at the start of each Sol (every 60 seconds).
```javascript
{
  sol: 2,
  phase: "day",
  parameters: { oxygen: 69.8, food: 73.3, water: 66.6, power: 73.6 },
  overnightNotes: ["Overnight closed-loop life support cycle completed."],
  forecasts: ["Clear sky conditions predicted over landing zone."],
  crewHoursRemaining: 20
}
```

### 2.5 `baseIssueRaised` (Segment 4 $\to$ Segment 3)
Emitted when a physical subsystem failure or environmental hazard occurs.
```javascript
{
  locationId: "airlock_module", // matches BASE_MODULES ID
  issueDetails: {
    faultName: "Airlock SuitPort Seal Rupture",
    severity: "critical", // 'medium' | 'high' | 'critical'
    affectedResources: ["Oxygen", "Power"],
    repairCostCH: 3,
    requiresEVA: true,
    description: "Cabin atmosphere decompressing. Primary hatch seals compromised."
  }
}
```

### 2.6 `baseIssueFixed` (Segment 3 $\to$ Segment 4)
Emitted when the astronaut navigates to the physical hardware in 3D view and completes the technician repair sequence.
```javascript
{
  locationId: "airlock_module",
  fixedAt: 1731610120000
}
```
*Segment 4 consumes this event, deducts the stored Crew-Hour cost once, restores module health to 1.0, and stabilizes affected resource rates.*

### 2.7 `challengeResolved` (Segment 4 $\to$ System)
Emitted when an active hazard or module fault is cleared.
```javascript
{
  locationId: "airlock_module",
  status: "resolved"
}
```

### 2.8 `gameEnded` (Segment 4 $\to$ Segment 6 / Summary)
Emitted when a terminal condition occurs (depletion of any resource) or at the conclusion of Sol 30.
```javascript
{
  status: "success", // 'success' | 'failure'
  endReason: "Exemplary command: All resource buffers >= 25%, no critical faults. Habitat primed for incoming crew!",
  handoverGrade: "Certified Handover Ready", // 'Certified Handover Ready' | 'Marginal Completion' | 'Failed Mission'
  solReached: 30,
  parameters: { oxygen: 48.2, food: 32.5, water: 54.1, power: 65.0 },
  radiationDose_mSv: 19.8,
  siteId: "valles_marineris",
  challengeType: "standard"
}
```

### 2.9 `retryRequested` (Segment 6 / Summary $\to$ Segment 3 / 4)
Emitted when the player requests a mission reset. Reinitializes all state to Sol 1 while preserving the selected site and challenge.
```javascript
{
  siteId: "valles_marineris",
  challengeType: "standard"
}
```

---

## 3. Bus Implementation
The shared contract is implemented by `SegmentContractBus` (`js/contract.js`) supporting:
1. In-memory EventEmitter callbacks for synchronous local module dispatch.
2. Window CustomEvent broadcasting (`jamn_event`) for DOM listeners.
3. Cross-window / iframe `BroadcastChannel` synchronization (`jamn_mission_trainer_bus`).
