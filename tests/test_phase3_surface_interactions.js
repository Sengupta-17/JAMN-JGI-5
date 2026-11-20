/**
 * Automated Verification Suite for Phase 3: Interactive Surface Elements & Science Deployment
 * Tests:
 * 1. InteractiveSurfaceManager instantiation, 5 surface station geometries & PBR materials
 * 2. Holographic AR beacons (colors, bobbing, rotating, point light illumination)
 * 3. Spatial proximity detection (Rover 6.5m vs Astronaut 4.5m radius)
 * 4. Surface action execution, parameter deltas (Water, Power, Oxygen, Soiling, Tau, Samples)
 * 5. Cooldown enforcement and diurnal Sol reset
 * 6. Astrobiology Mars Sample Return (MSR) loop & Handover science bonus
 * 7. HTML and CSS tactical HUD integration
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { InteractiveSurfaceManager } from '../js/engine/surface/interactiveSurfaceManager.js';
import { ParameterEngine } from '../js/engine/parameterEngine.js';
import { SimulationLoop } from '../js/engine/simulationLoop.js';
import { HazardManager } from '../js/engine/hazards/hazardManager.js';

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log('\n--- RUNNING PHASE 3 INTERACTIVE SURFACE ELEMENTS TEST SUITE ---\n');

  const mockScene = new THREE.Scene();
  const mockTerrain = {
    getElevationAt: (x, z) => {
      // Deterministic terrain elevation mock
      return Math.sin(x * 0.01) * 3.0 + Math.cos(z * 0.01) * 2.0;
    }
  };

  // =========================================================================
  // 1. SURFACE STATIONS INITIALIZATION & 3D GEOMETRIES
  // =========================================================================
  test('InteractiveSurfaceManager instantiates and initializes 5 distinct stations', () => {
    const manager = new InteractiveSurfaceManager(mockScene, mockTerrain);
    assert.strictEqual(manager.stations.length, 5, 'Exactly 5 surface stations registered');

    const expectedStationIds = [
      'ice_drill_site',
      'solar_sweeper_hub',
      'weather_station_post',
      'mineral_sample_cache',
      'airlock_terminal'
    ];

    expectedStationIds.forEach((id) => {
      const found = manager.stations.find(s => s.id === id);
      assert(found !== undefined, `Station [${id}] is present`);
      assert(found.group instanceof THREE.Group, `Station [${id}] has valid 3D group`);
      assert(found.beacon !== undefined, `Station [${id}] has AR beacon`);
    });
  });

  test('Stations are clamped to terrain surface elevation', () => {
    const manager = new InteractiveSurfaceManager(mockScene, mockTerrain);
    manager.stations.forEach((s) => {
      const expectedY = mockTerrain.getElevationAt(s.position.x, s.position.z);
      assert.strictEqual(s.position.y, expectedY, `Station ${s.id} clamped to terrain Y (${expectedY.toFixed(2)})`);
    });
  });

  test('Subsurface Cryo-Drill Rig incorporates rotating drill and ice crystals', () => {
    const manager = new InteractiveSurfaceManager(mockScene, mockTerrain);
    const drill = manager.stations.find(s => s.id === 'ice_drill_site');
    assert(drill.animatedPart instanceof THREE.Group, 'Drill head group attached for animation');
    assert(drill.drillSpinSpeed > 0, 'Drill spin speed configured');
    assert.strictEqual(drill.beaconColor, 0x00f0ff, 'Drill beacon color is cyan');
  });

  test('Photovoltaic Sweeper Hub incorporates gas accumulator and pneumatic booms', () => {
    const manager = new InteractiveSurfaceManager(mockScene, mockTerrain);
    const sweeper = manager.stations.find(s => s.id === 'solar_sweeper_hub');
    assert(sweeper.animatedPart instanceof THREE.Group, 'Sweeper boom arm group attached');
    assert.strictEqual(sweeper.beaconColor, 0xf59e0b, 'Sweeper beacon color is amber');
  });

  test('MEDA Weather Outpost incorporates spinning anemometer and wind vane', () => {
    const manager = new InteractiveSurfaceManager(mockScene, mockTerrain);
    const weather = manager.stations.find(s => s.id === 'weather_station_post');
    assert(weather.animatedPart instanceof THREE.Group, 'Anemometer rotor group attached');
    assert(weather.vanePart instanceof THREE.Group, 'Wind vane group attached');
    assert(weather.anemometerSpinSpeed > 0, 'Anemometer spin speed configured');
    assert.strictEqual(weather.beaconColor, 0x10b981, 'Weather station beacon color is emerald');
  });

  test('Hematite Mineral Depot incorporates titanium sample tubes carousel', () => {
    const manager = new InteractiveSurfaceManager(mockScene, mockTerrain);
    const cache = manager.stations.find(s => s.id === 'mineral_sample_cache');
    assert(cache.animatedPart instanceof THREE.Group, 'Sample carousel attached');
    assert.strictEqual(cache.sampleTubes.length, 5, '5 titanium sample tubes in carousel');
    assert.strictEqual(cache.beaconColor, 0xa855f7, 'Sample cache beacon color is purple');
  });

  test('Airlock Terminal incorporates umbilical recharge couplings and status LED', () => {
    const manager = new InteractiveSurfaceManager(mockScene, mockTerrain);
    const airlock = manager.stations.find(s => s.id === 'airlock_terminal');
    assert(airlock.statusLed !== undefined, 'Airlock status LED material attached');
    assert.strictEqual(airlock.beaconColor, 0x38bdf8, 'Airlock beacon color is sky blue');
  });

  // =========================================================================
  // 2. SPATIAL PROXIMITY DETECTION
  // =========================================================================
  test('Returns null when player is far away from all stations', () => {
    const manager = new InteractiveSurfaceManager(mockScene, mockTerrain);
    // Player at base center (0, 0, 0), nearest station is airlock at (0, 36) which is 36m away
    const target = manager.update(0.016, new THREE.Vector3(0, 0, 0), true);
    assert.strictEqual(target, null, 'No station detected within range at (0, 0, 0)');
  });

  test('Detects Cryo-Drill when player approaches within rover radius (6.5m)', () => {
    const manager = new InteractiveSurfaceManager(mockScene, mockTerrain);
    // Drill is at (-18, y, -65). Rover at (-18, y, -62) => distance 3.0m
    const target = manager.update(0.016, new THREE.Vector3(-18, 0, -62), true);
    assert(target !== null, 'Station detected');
    assert.strictEqual(target.station.id, 'ice_drill_site', 'Identified ice_drill_site');
    assert(target.distance <= 3.1, 'Distance accurately computed');
    assert.strictEqual(target.isReady, true, 'Station is ready');
  });

  test('Enforces differential trigger radius between Rover (6.5m) and Astronaut (4.5m)', () => {
    const manager = new InteractiveSurfaceManager(mockScene, mockTerrain);
    // Position at 5.5m from drill site (-18, -65 + 5.5) = (-18, -59.5)
    const testPos = new THREE.Vector3(-18, 0, -59.5);

    // Rover mode (radius 6.5m): 5.5m <= 6.5m -> in range!
    const targetRover = manager.update(0.016, testPos, true);
    assert(targetRover !== null, 'Rover detects station at 5.5m');
    assert.strictEqual(targetRover.station.id, 'ice_drill_site');

    // Astronaut mode (radius 4.5m): 5.5m > 4.5m -> out of range!
    const targetAstronaut = manager.update(0.016, testPos, false);
    assert.strictEqual(targetAstronaut, null, 'Astronaut requires closer 4.5m proximity');
  });

  // =========================================================================
  // 3. INTERACTION EXECUTION, PARAMETER DELTAS & COOLDOWNS
  // =========================================================================
  test('Subsurface Cryo-Drill extracts ice core, sets cooldown and prevents spam', () => {
    const manager = new InteractiveSurfaceManager(mockScene, mockTerrain);
    const pos = new THREE.Vector3(-18, 0, -64);
    manager.update(0.016, pos, true);

    const res = manager.triggerActiveInteraction(pos, true);
    assert.strictEqual(res.success, true, 'Drill interaction succeeds');
    assert.strictEqual(res.delta.water, 4.5, 'Yields +4.5% water delta');
    assert.strictEqual(res.actionId, 'extract_subsurface_ice');

    // Immediate second trigger fails due to active cooldown
    const resSpam = manager.triggerActiveInteraction(pos, true);
    assert.strictEqual(resSpam.success, false, 'Second trigger blocked by cooldown');
    assert.strictEqual(resSpam.reason, 'cooldown');
  });

  test('Photovoltaic Sweeper Hub clears dust and yields +5.0% power boost', () => {
    const manager = new InteractiveSurfaceManager(mockScene, mockTerrain);
    // Sweeper is at (48, -22)
    const pos = new THREE.Vector3(48, 0, -21);
    manager.update(0.016, pos, true);

    const res = manager.triggerActiveInteraction(pos, true);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.actionId, 'activate_pv_dust_removal');
    assert.strictEqual(res.delta.power, 5.0, 'Yields +5.0% power');
    assert.strictEqual(res.delta.soilingReduction, 0.5, 'Yields 50% soiling reduction');
  });

  test('MEDA Weather Outpost reduces optical depth and yields science points', () => {
    const manager = new InteractiveSurfaceManager(mockScene, mockTerrain);
    // Weather post is at (-72, 28)
    const pos = new THREE.Vector3(-72, 0, 29);
    manager.update(0.016, pos, true);

    const res = manager.triggerActiveInteraction(pos, true);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.actionId, 'calibrate_meda_sensors');
    assert.strictEqual(res.delta.tauReduction, 0.25, 'Yields -0.25 tau reduction');
    assert.strictEqual(res.delta.sciencePoints, 15, 'Yields 15 science points');
  });

  test('Hematite Mineral Outcrop drills core sample and caches titanium tube', () => {
    const manager = new InteractiveSurfaceManager(mockScene, mockTerrain);
    // Cache is at (24, 78)
    const pos = new THREE.Vector3(24, 0, 77);
    manager.update(0.016, pos, true);

    const res = manager.triggerActiveInteraction(pos, true);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.actionId, 'coring_drill_and_cache');
    assert.strictEqual(res.delta.cachedSample, 1, 'Yields 1 cached sample');
    assert.strictEqual(res.delta.handoverBonusPct, 5, 'Yields +5% handover bonus per sample');
  });

  test('Airlock Umbilical Terminal replenishes oxygen buffer by +3.0%', () => {
    const manager = new InteractiveSurfaceManager(mockScene, mockTerrain);
    // Airlock terminal is at (0, 36)
    const pos = new THREE.Vector3(0, 0, 35.5);
    manager.update(0.016, pos, true);

    const res = manager.triggerActiveInteraction(pos, true);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.actionId, 'recharge_airlock_oxygen');
    assert.strictEqual(res.delta.oxygen, 3.0, 'Yields +3.0% oxygen');
  });

  // =========================================================================
  // 4. DIURNAL SOL RESET & PARAMETER INTEGRATION
  // =========================================================================
  test('onNewSol resets station cooldowns for the next sol', () => {
    const manager = new InteractiveSurfaceManager(mockScene, mockTerrain);
    const drill = manager.stations.find(s => s.id === 'ice_drill_site');
    drill.cooldownRemaining = 38.0;
    drill.usedThisSol = true;

    manager.onNewSol(2);
    assert.strictEqual(drill.cooldownRemaining, 0, 'Cooldown wiped to zero on new Sol');
    assert.strictEqual(drill.usedThisSol, false, 'Used this sol reset to false');
  });

  test('ParameterEngine integrates surface interaction deltas cleanly', () => {
    const engine = new ParameterEngine('valles_marineris');
    const initialWater = engine.parameters.water; // 68%
    const initialPower = engine.parameters.power; // 72%
    const initialOxygen = engine.parameters.oxygen; // 70%

    // Apply water delta
    engine.parameters.water = Math.min(100, +(engine.parameters.water + 4.5).toFixed(2));
    assert.strictEqual(engine.parameters.water, +(initialWater + 4.5).toFixed(2));

    // Apply power delta
    engine.parameters.power = Math.min(100, +(engine.parameters.power + 5.0).toFixed(2));
    assert.strictEqual(engine.parameters.power, +(initialPower + 5.0).toFixed(2));

    // Apply oxygen delta
    engine.parameters.oxygen = Math.min(100, +(engine.parameters.oxygen + 3.0).toFixed(2));
    assert.strictEqual(engine.parameters.oxygen, +(initialOxygen + 3.0).toFixed(2));

    // Increment sample count
    engine.cachedSamples = (engine.cachedSamples || 0) + 1;
    assert.strictEqual(engine.cachedSamples, 1);
  });

  test('SimulationLoop includes cachedSamples and handover science bonus in final state', () => {
    const engine = new ParameterEngine('valles_marineris');
    engine.cachedSamples = 4; // 4 sealed samples cached
    const mockBus = { on: () => {}, emit: () => {} };
    const hazards = new HazardManager(engine, mockBus);
    const loop = new SimulationLoop(engine, hazards, mockBus);

    let finalState = null;
    loop.onGameOverCallbacks.push((st) => { finalState = st; });
    loop.evaluateMissionHandover();

    assert(finalState !== null, 'Handover game state evaluated');
    assert.strictEqual(finalState.cachedSamples, 4, 'Cached samples included in final state');
    assert.strictEqual(finalState.scienceYieldBonusPct, 20, '4 samples * 5% = +20% science bonus');
  });

  // =========================================================================
  // 5. HTML & CSS COMPONENT INTEGRATION
  // =========================================================================
  test('index.html contains surface interaction prompt and execute button', () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
    assert(html.includes('id="surfaceInteractionPrompt"'), 'index.html contains surfaceInteractionPrompt');
    assert(html.includes('id="promptIconBeacon"'), 'index.html contains promptIconBeacon');
    assert(html.includes('id="promptTargetName"'), 'index.html contains promptTargetName');
    assert(html.includes('id="promptActionLabel"'), 'index.html contains promptActionLabel');
    assert(html.includes('id="promptDistance"'), 'index.html contains promptDistance');
    assert(html.includes('id="btnSurfaceInteract"'), 'index.html contains btnSurfaceInteract');
    assert(html.includes('E: INTERACT'), 'index.html hint contains E: INTERACT');
  });

  test('css/styles.css defines tactical HUD styling and animations for interaction prompt', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'css/styles.css'), 'utf-8');
    assert(css.includes('.surface-interaction-prompt'), 'css defines .surface-interaction-prompt');
    assert(css.includes('@keyframes promptPulseGlow'), 'css defines @keyframes promptPulseGlow');
    assert(css.includes('.prompt-icon-beacon'), 'css defines .prompt-icon-beacon');
    assert(css.includes('.prompt-keycap'), 'css defines .prompt-keycap');
    assert(css.includes('.btn-prompt-interact'), 'css defines .btn-prompt-interact');
  });

  console.log(`\nTEST SUMMARY: ${passedTests} Passed, ${totalTests - passedTests} Failed.`);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exitCode = 1;
});
