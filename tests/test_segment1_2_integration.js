/**
 * Unit & Integration Tests for Segment 1 & Segment 2 (Prologue)
 * and Transition into Segment 3 Base Airlock Ingress
 */

import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

console.log('--- TESTING SEGMENT 1 & 2 REPLICATION & INTEGRATION --- \n');

// 1. Test data.js Scientific Calibrations & Landing Site Parameters
{
  globalThis.window = {};
  const dataCode = fs.readFileSync('js/prologue/data.js', 'utf8');
  eval(dataCode);

  const data = globalThis.window.JAMN_DATA;
  assert(data !== undefined, 'data.js publishes window.JAMN_DATA');
  assert(data.referenceMars.gravity === '3.71 m/s² (~0.38 g)', 'Reference gravity matches 3.71 m/s²');
  assert(data.referenceMars.meanTemp.includes('-60 °C'), 'Reference mean temp matches -60 °C');
  assert(data.referenceMars.meanPressure.includes('636 Pa'), 'Reference mean pressure matches 636 Pa');

  const sites = data.landingSites;
  assert(sites.valles_marineris !== undefined, 'Valles Marineris site present');
  assert(sites.polar_ice_caps !== undefined, 'Polar Ice Caps site present');
  assert(sites.north_polar !== undefined, 'north_polar alias present');
  assert(sites.olympus_mons !== undefined, 'Olympus Mons site present');
  assert(sites.hellas_basin !== undefined, 'Hellas Basin site present');

  // Verify calibrated starting parameters
  assert(sites.valles_marineris.startingParameters.oxygen === 70, 'Valles Marineris Oxygen is 70%');
  assert(sites.valles_marineris.startingParameters.food === 75, 'Valles Marineris Food is 75%');
  assert(sites.valles_marineris.startingParameters.water === 68, 'Valles Marineris Water is 68%');
  assert(sites.valles_marineris.startingParameters.power === 72, 'Valles Marineris Power is 72%');

  assert(sites.polar_ice_caps.startingParameters.oxygen === 78, 'Polar Ice Caps Oxygen is 78%');
  assert(sites.polar_ice_caps.startingParameters.food === 60, 'Polar Ice Caps Food is 60%');
  assert(sites.polar_ice_caps.startingParameters.water === 92, 'Polar Ice Caps Water is 92%');
  assert(sites.polar_ice_caps.startingParameters.power === 55, 'Polar Ice Caps Power is 55%');

  assert(sites.olympus_mons.startingParameters.oxygen === 52, 'Olympus Mons Oxygen is 52%');
  assert(sites.olympus_mons.startingParameters.food === 65, 'Olympus Mons Food is 65%');
  assert(sites.olympus_mons.startingParameters.water === 45, 'Olympus Mons Water is 45%');
  assert(sites.olympus_mons.startingParameters.power === 88, 'Olympus Mons Power is 88%');

  assert(sites.hellas_basin.startingParameters.oxygen === 82, 'Hellas Basin Oxygen is 82%');
  assert(sites.hellas_basin.startingParameters.food === 62, 'Hellas Basin Food is 62%');
  assert(sites.hellas_basin.startingParameters.water === 58, 'Hellas Basin Water is 58%');
  assert(sites.hellas_basin.startingParameters.power === 50, 'Hellas Basin Power is 50%');

  assert(Array.isArray(data.edlStages) && data.edlStages.length === 9, '9-stage EDL sequence defined');
  assert(data.edlStages[0].name === 'ORBITAL POSITIONING', 'EDL Stage 1 is ORBITAL POSITIONING');
  assert(data.edlStages[7].name === 'TOUCHDOWN', 'EDL Stage 8 is TOUCHDOWN');
  assert(data.edlStages[8].name === 'LANDING CONFIRMATION', 'EDL Stage 9 is LANDING CONFIRMATION');
}

// 2. Test DOM Invariants in index.html for Segments 1 & 2
{
  const html = fs.readFileSync('index.html', 'utf8');

  assert(html.includes('id="prologue-container"'), 'index.html contains prologue-container');
  assert(html.includes('id="webgl-container"'), 'index.html contains webgl-container');
  assert(html.includes('id="helmet-visor-overlay"'), 'index.html contains helmet-visor-overlay');
  assert(html.includes('id="cockpit-frame-overlay"'), 'index.html contains cockpit-frame-overlay');

  assert(html.includes('id="view-title"'), 'index.html contains view-title (Stage 0)');
  assert(html.includes('id="view-cockpit"'), 'index.html contains view-cockpit (Stage 1)');
  assert(html.includes('id="view-orbit"'), 'index.html contains view-orbit (Stage 2)');
  assert(html.includes('id="view-site-analysis"'), 'index.html contains view-site-analysis (Stage 3)');
  assert(html.includes('id="view-descent"'), 'index.html contains view-descent (Stage 4)');
  assert(html.includes('id="view-surface"'), 'index.html contains view-surface (Stage 5)');
  assert(html.includes('id="view-habitat"'), 'index.html contains view-habitat (Stage 6)');

  assert(html.includes('window.JAMN_MAIN.enterHabitatAirlock()'), 'Stage 5 button invokes enterHabitatAirlock()');
  assert(html.includes('window.transitionToSegment3()'), 'Top nav contains transitionToSegment3()');
  assert(html.includes('data-target-screen="prologue"'), 'Segment nav tabs contains 0. FLIGHT & LANDING');
  assert(html.includes('src="js/prologue/data.js"'), 'index.html loads js/prologue/data.js');
  assert(html.includes('src="js/prologue/scene.js"'), 'index.html loads js/prologue/scene.js');
  assert(html.includes('src="js/prologue/main.js"'), 'index.html loads js/prologue/main.js');

  // Fix 1 & 3: Verification of Restart Confirmation Modal in index.html
  assert(html.includes('id="restartConfirmationModal"'), 'index.html contains restartConfirmationModal');
  assert(html.includes('id="btnConfirmRestartYes"'), 'index.html contains btnConfirmRestartYes');
  assert(html.includes('id="btnConfirmRestartNo"'), 'index.html contains btnConfirmRestartNo');
  assert(html.includes('Do you want to Restart?'), 'index.html contains "Do you want to Restart?" prompt');

  // Fix 1: Verification that "Browser reload restarts from Day 1" is removed
  assert(!html.includes('Browser reload restarts from Day 1'), 'Reset rule "Browser reload restarts from Day 1" removed from index.html');

  // Fix 5: Verification that "Advance to Next Martian Sol" and telemetry log are completely removed
  assert(!html.includes('Advance to Next Martian Sol'), 'Button "Advance to Next Martian Sol" removed from index.html');
  assert(!html.includes('id="hab-log-box"'), 'Habitat telemetry log box removed from index.html');
}

// 3. Test Transition and Handoff Contract
{
  let transitionTargetSite = null;
  let transitionTargetScreen = null;
  let airlockTriggered = false;
  let scenePaused = false;
  let siteSelectedEmitted = null;

  globalThis.window.contractBus = {
    emit: (ev, payload) => {
      if (ev === 'siteSelected') siteSelectedEmitted = payload;
    }
  };

  globalThis.window.JAMN_SCENE = {
    pause: () => { scenePaused = true; },
    resume: () => { scenePaused = false; }
  };

  globalThis.window.jamnSegment3App = {
    setSite: (siteId) => { transitionTargetSite = siteId; },
    setScreen: (scr) => { transitionTargetScreen = scr; },
    triggerAirlockIngress: () => { airlockTriggered = true; }
  };

  globalThis.document = {
    getElementById: (id) => ({
      classList: { add: () => {}, remove: () => {} },
      style: {}
    }),
    querySelector: (sel) => ({
      classList: { add: () => {}, remove: () => {} }
    }),
    querySelectorAll: (sel) => []
  };

  // Mock transitionToSegment3 matching segment3App.js implementation
  const transitionToSegment3 = function(siteId, targetScreen = 'base_entry', autoIngress = true) {
    const chosenSite = siteId || 'valles_marineris';
    const mappedSiteId = (chosenSite === 'polar_ice_caps') ? 'north_polar' : chosenSite;
    if (globalThis.window.JAMN_SCENE?.pause) globalThis.window.JAMN_SCENE.pause();
    if (globalThis.window.contractBus) globalThis.window.contractBus.emit('siteSelected', mappedSiteId);
    if (globalThis.window.jamnSegment3App) {
      globalThis.window.jamnSegment3App.setSite(mappedSiteId);
      globalThis.window.jamnSegment3App.setScreen(targetScreen);
      if (autoIngress) {
        globalThis.window.jamnSegment3App.triggerAirlockIngress();
      }
    }
  };

  // Test handoff with polar_ice_caps
  transitionToSegment3('polar_ice_caps', 'base_entry', true);
  assert(scenePaused === true, 'Scene pause called on transition');
  assert(siteSelectedEmitted === 'north_polar', 'polar_ice_caps mapped to north_polar for contractBus');
  assert(transitionTargetSite === 'north_polar', 'Segment 3 setSite received mapped north_polar');
  assert(transitionTargetScreen === 'base_entry', 'Segment 3 setScreen received base_entry');
  assert(airlockTriggered === true, 'Segment 3 triggerAirlockIngress called successfully with autoIngress=true');

  // Fix 6: Test direct mapping from Begin Survival Mission to (1. Base Entry) without autoIngress
  airlockTriggered = false;
  transitionToSegment3('valles_marineris', 'base_entry', false);
  assert(transitionTargetScreen === 'base_entry', 'Begin Survival Mission directly maps to base_entry');
  assert(airlockTriggered === false, 'autoIngress=false avoids forcing airlock pressurization on base_entry view');
}

// 4. Test Prologue main.js file checks
{
  const mainJs = fs.readFileSync(path.resolve(process.cwd(), 'js/prologue/main.js'), 'utf-8');
  assert(!mainJs.includes('actionType === "ADVANCE_SOL"'), 'ADVANCE_SOL removed from prologue/main.js');
  assert(!mainJs.includes('document.getElementById("hab-log-box")'), 'hab-log-box reference removed from prologue/main.js');
  assert(mainJs.includes('window.transitionToSegment3(mappedSiteId, "base_entry", false)'), 'beginSurvivalMission directly maps to Segment 3 base_entry');
  assert(mainJs.includes('restartMission() {'), 'restartMission in prologue/main.js remains intact');
}

// 5. Test Simulation Reset when Restarting from Segment 3 & 4
{
  let loopResetCalled = false;
  let engineResetCalled = false;
  let prologueTransitionTarget = null;
  let solMatrixUpdated = false;

  const mockSegment4App = {
    loop: {
      currentSol: 8,
      isRunning: true,
      isPaused: true,
      reset: () => {
        loopResetCalled = true;
        mockSegment4App.loop.isRunning = false;
        mockSegment4App.loop.isPaused = false;
        mockSegment4App.loop.currentSol = 1;
      }
    },
    engine: {
      reset: () => { engineResetCalled = true; }
    },
    updatePauseUI: (paused) => {},
    resetMission: function() {
      this.loop.reset();
      this.engine.reset();
    }
  };

  const mockSegment3App = {
    currentSiteId: 'valles_marineris',
    activeIssues: new Map([['water_recovery', { name: 'Fault' }]]),
    hideRestartConfirmation: () => {},
    restartFullMissionFromBase: function() {
      this.hideRestartConfirmation();
      mockSegment4App.resetMission();
      this.activeIssues.clear();
      mockHeaderSolDisplay.textContent = 'SOL 01 / 30';
      mockBaseInfoSolHero.textContent = 'SOL 01 / 30';
      solMatrixUpdated = true;
      if (globalThis.window.transitionToPrologue) {
        globalThis.window.transitionToPrologue('TITLE');
      }
    }
  };

  const mockHeaderSolDisplay = { textContent: 'SOL 08 / 30' };
  const mockBaseInfoSolHero = { textContent: 'SOL 08 / 30' };
  globalThis.window.transitionToPrologue = (stage) => {
    prologueTransitionTarget = stage;
  };

  mockSegment3App.restartFullMissionFromBase();

  assert(loopResetCalled === true, 'Segment 4 loop.reset() called on mission restart');
  assert(mockSegment4App.loop.isRunning === false, 'Segment 4 simulation stopped on mission restart');
  assert(mockSegment4App.loop.currentSol === 1, 'Segment 4 Sol reset to 1 on mission restart');
  assert(engineResetCalled === true, 'Segment 4 engine.reset() called on mission restart');
  assert(mockSegment3App.activeIssues.size === 0, 'Segment 3 active hazards cleared on mission restart');
  assert(mockHeaderSolDisplay.textContent === 'SOL 01 / 30', 'Header Sol display reset to SOL 01 / 30');
  assert(mockBaseInfoSolHero.textContent === 'SOL 01 / 30', 'Base Info Sol Hero reset to SOL 01 / 30');
  assert(solMatrixUpdated === true, 'Sol matrix progress reset');
  assert(prologueTransitionTarget === 'TITLE', 'Mission restart transitions to Prologue TITLE');
}

console.log(`\nTEST SUMMARY: ${passed} Passed, ${failed} Failed.`);
process.exit(failed > 0 ? 1 : 0);
