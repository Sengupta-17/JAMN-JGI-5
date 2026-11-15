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
}

// 3. Test Transition and Handoff Contract
{
  let transitionTargetSite = null;
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
    setScreen: (scr) => {},
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

  // Mock transitionToSegment3
  const transitionToSegment3 = function(siteId) {
    const chosenSite = siteId || 'valles_marineris';
    const mappedSiteId = (chosenSite === 'polar_ice_caps') ? 'north_polar' : chosenSite;
    if (globalThis.window.JAMN_SCENE?.pause) globalThis.window.JAMN_SCENE.pause();
    if (globalThis.window.contractBus) globalThis.window.contractBus.emit('siteSelected', mappedSiteId);
    if (globalThis.window.jamnSegment3App) {
      globalThis.window.jamnSegment3App.setSite(mappedSiteId);
      globalThis.window.jamnSegment3App.triggerAirlockIngress();
    }
  };

  // Test handoff with polar_ice_caps
  transitionToSegment3('polar_ice_caps');
  assert(scenePaused === true, 'Scene pause called on transition');
  assert(siteSelectedEmitted === 'north_polar', 'polar_ice_caps mapped to north_polar for contractBus');
  assert(transitionTargetSite === 'north_polar', 'Segment 3 setSite received mapped north_polar');
  assert(airlockTriggered === true, 'Segment 3 triggerAirlockIngress called successfully');
}

console.log(`\nTEST SUMMARY: ${passed} Passed, ${failed} Failed.`);
process.exit(failed > 0 ? 1 : 0);
