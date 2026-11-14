# Shared Contract Specifications — Segment 3 Integration

## 1. Overview
This document defines the interface boundaries, event payload schemas, and integration contracts governing **Segment 3 (Mars Base Operations)** and its interactions with other segments (Segment 2: Landing Site Selection, Segment 4: Survival Game Engine, Segment 6: Game Ending & Retry).

All event transport is executed via the `BroadcastChannel` API (`jamn_mission_bus`), with automatic fallback to DOM CustomEvents for environments where BroadcastChannel is restricted.

---

## 2. Inbound Contract Events

### 2.1 `siteSelected` (From Segment 2)
Triggered when the player confirms their chosen Martian landing site in Segment 2.

* **Event Name:** `siteSelected`
* **Payload Structure:**
```json
{
  "siteId": "valles_marineris",
  "coordinates": "14.0°S, 301.0°E",
  "elevationKm": -7.0,
  "atmosphereKPa": 0.95,
  "surfaceTempRange": "-70°C to +5°C",
  "startingParameters": {
    "oxygen": 80,
    "food": 80,
    "water": 80,
    "power": 80
  }
}
```
* **Segment 3 Handling:** Calibrates starting resource levels for Oxygen, Food, Water, and Power; updates the 2D exterior landscape visualizer; refreshes telemetry labels.

---

### 2.2 `baseIssueRaised` (From Segment 4)
Triggered during the 30-sol survival simulation when an emergency hazard damages a habitat subsystem.

* **Event Name:** `baseIssueRaised`
* **Payload Structure:**
```json
{
  "locationId": "eclss_module",
  "issueDetails": {
    "id": "eclss_electrolyzer_failure",
    "title": "Electrolyzer Proton Membrane Tear",
    "severity": "critical",
    "description": "High pressure spike ruptured PEM Nafion cell #3.",
    "repairAction": "Isolate Cell Stack & Bypass to Secondary Loop",
    "targetParameter": "oxygen",
    "penaltyRate": 1.4
  }
}
```
* **Segment 3 Handling:** Triggers audible siren; flags 3D beacon to flashing red; marks module in diagnostic panel; opens slide-in popup if player is proximate in 3D.

---

### 2.3 `retryRequested` (From Segment 6)
Triggered when the player finishes a mission (success or failure) and elects to retry.

* **Event Name:** `retryRequested`
* **Payload Structure:**
```json
{
  "siteId": "valles_marineris",
  "timestamp": 1794655000000
}
```
* **Segment 3 Handling:** Clears all active base faults, resets resource parameters, and transitions screen state back to Base Entry (`base_entry`).

---

## 3. Outbound Contract Events

### 3.1 `challengeSelected` (To Segment 4)
Dispatched upon clicking **"LAUNCH MISSION"** on the Challenge Briefing screen. As required, challenge selection is strictly randomized by Segment 3.

* **Event Name:** `challengeSelected`
* **Payload Structure:**
```json
{
  "siteId": "valles_marineris",
  "challengeType": "dust_storm",
  "challengeTitle": "Global Dust Storm & Power Crisis",
  "startingParameters": {
    "oxygen": 80,
    "food": 80,
    "water": 80,
    "power": 80
  },
  "timestamp": 1794655100000
}
```
* **Segment 4 Handling:** Segment 4 initializes the 30-sol simulation loop calibrated to this specific site and active hazard profile.

---

### 3.2 `baseIssueFixed` (To Segment 4)
Dispatched when the astronaut completes the physical or diagnostic repair sequence for an afflicted module.

* **Event Name:** `baseIssueFixed`
* **Payload Structure:**
```json
{
  "locationId": "eclss_module",
  "fixedAt": 1794655200000
}
```
* **Segment 4 Handling:** Halts resource drain penalty on the target parameter and restores subsystem integrity to nominal status.

---

## 4. Helper Utilities (`js/segment3Contract.js`)

Typed utility functions are exported for cross-segment developers:

```javascript
import {
  sendSiteSelected,
  sendBaseIssueRaised,
  sendRetryRequested,
  onChallengeSelected,
  onBaseIssueFixed
} from './js/segment3Contract.js';

// Send a test site selection
sendSiteSelected('olympus_mons');

// Listen for mission launch in Segment 4
onChallengeSelected((payload) => {
  console.log('Launch parameters:', payload.startingParameters);
});
```
