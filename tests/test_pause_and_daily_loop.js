import fs from 'fs';
import { ParameterEngine } from '../js/engine/parameterEngine.js';
import { HazardManager } from '../js/engine/hazards/hazardManager.js';
import { SimulationLoop } from '../js/engine/simulationLoop.js';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`[PASS] ${msg}`);
    passed++;
  } else {
    console.error(`[FAIL] ${msg}`);
    failed++;
  }
}

console.log('--- TESTING PAUSE AND DAILY RETURN TO BASE LOOP ---\n');

// 1. Test Pause Toggle
{
  const engine = new ParameterEngine('valles_marineris');
  const hazards = new HazardManager(engine, null);
  const loop = new SimulationLoop(engine, hazards, null);

  loop.isRunning = true;
  assert(loop.isPaused === false, 'Initial state: isPaused is false');

  const p1 = loop.togglePause();
  assert(p1 === true && loop.isPaused === true, 'togglePause() toggles to paused (isPaused === true)');

  loop.pause();
  assert(loop.isPaused === true, 'Explicit loop.pause() keeps isPaused true');

  loop.resume();
  assert(loop.isPaused === false, 'Explicit loop.resume() clears isPaused to false');

  const p2 = loop.togglePause();
  assert(p2 === true && loop.isPaused === true, 'togglePause() toggles to paused again');

  const p3 = loop.togglePause();
  assert(p3 === false && loop.isPaused === false, 'togglePause() toggles back to running (isPaused === false)');
}

// 2. Test Sol Completion and Return to Base Hook
{
  const engine = new ParameterEngine('valles_marineris');
  const hazards = new HazardManager(engine, null);
  const loop = new SimulationLoop(engine, hazards, null);

  let completedPayload = null;
  loop.onSolCompleteCallbacks.push((data) => {
    completedPayload = data;
  });

  loop.startSol(1);
  assert(loop.currentSol === 1, 'Sol 1 started');

  // Advance clock to completion (60 seconds)
  loop.update(60.0);

  assert(completedPayload !== null, 'onSolCompleteCallbacks triggered upon reaching 60s');
  assert(completedPayload.completedSol === 1, 'completedSol is 1');
  assert(completedPayload.nextSol === 2, 'nextSol is 2');
  assert(loop.currentSol === 2, 'loop.currentSol advanced in memory to 2');
  assert(loop.isRunning === false, 'loop.isRunning stopped, ready for user to return to base and prepare next sol');

  // Verify memory retention: resources drained during Sol 1 are preserved, not reset!
  assert(engine.parameters.food < 75.0, `Food drained during Sol 1 is preserved (Food: ${engine.parameters.food.toFixed(1)}% < 75%)`);

  // Start Sol 2 from challenges
  loop.startSol(loop.currentSol);
  assert(loop.currentSol === 2, 'Sol 2 started from memory');
  assert(loop.isRunning === true, 'Sol 2 running');
  loop.reset();
}

// 3. Test CSS & HTML Pause Overlay Visibility Invariants
{
  const css = fs.readFileSync('css/styles.css', 'utf-8');
  assert(css.includes('.hidden {\n  display: none !important;\n}'), 'css/styles.css contains universal .hidden { display: none !important; }');
  assert(css.includes('.surface-pause-overlay.hidden'), 'css/styles.css contains .surface-pause-overlay.hidden rule');
  assert(css.includes('pointer-events: none !important;'), 'surface-pause-overlay.hidden suppresses pointer-events');

  const html = fs.readFileSync('index.html', 'utf-8');
  assert(html.includes('id="surfacePauseOverlay" class="surface-pause-overlay hidden" style="display: none; pointer-events: none;"'),
    'index.html initializes surfacePauseOverlay with hidden class and inline display: none guard');
  assert(html.includes('id="btnPauseSimulation"'), 'index.html contains top-right btnPauseSimulation button');
  assert(html.includes('id="btnResumeOverlay"'), 'index.html contains btnResumeOverlay button');
}

console.log(`\nTEST SUMMARY: ${passed} Passed, ${failed} Failed.`);
process.exit(failed > 0 ? 1 : 0);
