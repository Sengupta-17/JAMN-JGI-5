/**
 * Automated Acceptance Test Suite
 * Segment 5 — Mars Field Notes & Segment 6 — Terminal Messages
 */

import fs from 'fs';
import path from 'path';
import { MARS_FIELD_NOTES, MARS_SOURCES, getMarsFieldNote } from '../js/engine/marsFieldNotesData.js';
import { MISSION_FAILURE_MESSAGES, MISSION_SUCCESS_MESSAGES, getTerminalMessage } from '../js/engine/missionEndMessages.js';
import { SimulationLoop } from '../js/engine/simulationLoop.js';
import { ParameterEngine } from '../js/engine/parameterEngine.js';
import { HazardManager } from '../js/engine/hazards/hazardManager.js';

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

console.log('--- TESTING SEGMENT 5 (MARS FIELD NOTES) & SEGMENT 6 (TERMINAL MESSAGES) ---\n');

// 1. Validate 30 Mars Field Notes Dataset & Source Register
{
  assert(MARS_FIELD_NOTES.length === 30, 'Exactly 30 Mars Field Notes defined');
  assert(Object.keys(MARS_SOURCES).length >= 24, 'At least 24 verified institutional sources registered');

  for (let s = 1; s <= 30; s++) {
    const note = getMarsFieldNote(s);
    assert(note && note.sol === s, `Sol ${s} mapped strictly to Fact ${s}`);
    assert(note.title && note.title.length > 5, `Sol ${s} has valid bold title ("${note.title}")`);
    assert(note.body && note.body.length > 30, `Sol ${s} has valid non-empty fact body`);
    assert(note.sourceUrl && note.sourceUrl.startsWith('https://'), `Sol ${s} has verified HTTPS source URL`);
  }

  // Sol 30 fact verification
  const note30 = getMarsFieldNote(30);
  assert(note30.title.includes('MOXIE'), 'Sol 30 fact title highlights MOXIE oxygen generation');
  assert(note30.body.includes('122 grams in total'), 'Sol 30 fact body documents 122 grams oxygen production');
}

// 2. Validate Resource-Specific Red Failure Messages (§9)
{
  // 9.1 Oxygen
  const o2Msg = getTerminalMessage('failure', 'oxygen_depleted', 14);
  assert(o2Msg.heading === 'OXYGEN RESERVE DEPLETED', 'Oxygen failure heading is "OXYGEN RESERVE DEPLETED"');
  assert(o2Msg.badge === 'Life Support Failure', 'Oxygen failure badge is "Life Support Failure"');
  assert(o2Msg.body.includes("breathable oxygen reserve has been exhausted"), 'Oxygen failure body explains breathable reserve exhaustion');
  assert(o2Msg.body.includes("terminated on Sol 14"), 'Oxygen failure interpolates actual sol number (Sol 14)');

  // 9.2 Food
  const foodMsg = getTerminalMessage('failure', 'food_depleted', 21);
  assert(foodMsg.heading === 'FOOD RESERVES EXHAUSTED', 'Food failure heading is "FOOD RESERVES EXHAUSTED"');
  assert(foodMsg.badge === 'Caloric Supply Failure', 'Food failure badge is "Caloric Supply Failure"');
  assert(foodMsg.body.includes("stored food reserve and available crop production have been exhausted"), 'Food failure body explains stored food vs crop supplement');
  assert(foodMsg.body.includes("terminated on Sol 21"), 'Food failure interpolates actual sol number (Sol 21)');

  // 9.3 Water
  const waterMsg = getTerminalMessage('failure', 'water_depleted', 18);
  assert(waterMsg.heading === 'WATER RESERVE DEPLETED', 'Water failure heading is "WATER RESERVE DEPLETED"');
  assert(waterMsg.badge === 'Hydrologic Loop Failure', 'Water failure badge is "Hydrologic Loop Failure"');
  assert(waterMsg.body.includes("usable make-up-water reserve has reached zero"), 'Water failure body distinguishes make-up reserve from recycling loop');
  assert(waterMsg.body.includes("terminated on Sol 18"), 'Water failure interpolates actual sol number (Sol 18)');

  // 9.4 Power
  const pwrMsg = getTerminalMessage('failure', 'power_depleted', 9);
  assert(pwrMsg.heading === 'POWER GRID BLACKOUT', 'Power failure heading is "POWER GRID BLACKOUT"');
  assert(pwrMsg.badge === 'Total Electrical Blackout', 'Power failure badge is "Total Electrical Blackout"');
  assert(pwrMsg.body.includes("emergency response window has expired without recovery"), 'Power failure body mentions emergency response window expiration');
  assert(pwrMsg.body.includes("terminated on Sol 9"), 'Power failure interpolates actual sol number (Sol 9)');
}

// 3. Validate Green Terminal Success Messages (§10)
{
  // 10.1 Full Handover Ready
  const fullMsg = getTerminalMessage('success', 'full_handover', 30);
  assert(fullMsg.heading === 'MISSION SUCCESS — BASE READY FOR HANDOVER', 'Full success heading is "MISSION SUCCESS — BASE READY FOR HANDOVER"');
  assert(fullMsg.badge === 'Certified Handover Ready', 'Full success badge is "Certified Handover Ready"');
  assert(fullMsg.body.includes("base is ready for the next astronaut team. Excellent work, Commander."), 'Full success body includes congratulations to Commander');

  // 10.2 Marginal Completion
  const marginalMsg = getTerminalMessage('success', 'marginal_handover', 30);
  assert(marginalMsg.heading === 'MISSION COMPLETED — HANDOVER NEEDS ATTENTION', 'Marginal success heading is "MISSION COMPLETED — HANDOVER NEEDS ATTENTION"');
  assert(marginalMsg.badge === 'Handover Needs Attention', 'Marginal success badge is "Handover Needs Attention"');
  assert(marginalMsg.body.includes("Mission complete — handover condition: marginal."), 'Marginal success body indicates handover condition: marginal');
}

// 4. Validate SimulationLoop Event Emission & Sol 30 Flow (§5, §1.2)
{
  const mockBus = {
    events: [],
    listeners: {},
    emit(event, payload) {
      this.events.push({ event, payload });
      if (this.listeners[event]) {
        this.listeners[event].forEach(fn => fn(payload));
      }
    },
    on(event, fn) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(fn);
    }
  };

  const engine = new ParameterEngine('valles_marineris');
  const hazards = new HazardManager(engine, mockBus);
  const loop = new SimulationLoop(engine, hazards, mockBus);

  // Complete Sol 1 normally
  loop.currentSol = 1;
  loop.completeSol();

  const solCompletedEvent = mockBus.events.find(e => e.event === 'solCompleted');
  assert(solCompletedEvent !== undefined, 'solCompleted contract event emitted on sol completion');
  assert(solCompletedEvent.payload.day === 1, 'solCompleted payload contains completed sol (1)');
  assert(solCompletedEvent.payload.nextSol === 2, 'solCompleted payload contains next sol (2)');
  assert(solCompletedEvent.payload.parameters !== undefined, 'solCompleted payload contains four-resource parameters');

  // Complete Sol 30
  mockBus.events = [];
  loop.currentSol = 30;
  loop.completeSol();

  const sol30CompletedEvent = mockBus.events.find(e => e.event === 'solCompleted');
  assert(sol30CompletedEvent !== undefined, 'solCompleted emitted for Sol 30 (Fact 30 displayed)');
  assert(sol30CompletedEvent.payload.isMissionComplete === true, 'Sol 30 completion flags isMissionComplete=true');

  // Evaluate Handover
  mockBus.events = [];
  engine.parameters = { oxygen: 40, food: 35, water: 30, power: 50 }; // All >= 25%
  loop.evaluateMissionHandover();

  const gameEndedEvent = mockBus.events.find(e => e.event === 'gameEnded');
  assert(gameEndedEvent !== undefined, 'gameEnded emitted upon handover evaluation');
  assert(gameEndedEvent.payload.status === 'success', 'Mission marked success');
  assert(gameEndedEvent.payload.endReason === 'full_handover', 'Full handover reason key set');
}

// 5. Validate HTML & CSS Components
{
  const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
  assert(html.includes('id="marsFieldNoteCard"'), 'index.html contains marsFieldNoteCard');
  assert(html.includes('id="fieldNoteTitle"'), 'index.html contains fieldNoteTitle');
  assert(html.includes('id="fieldNoteBody"'), 'index.html contains fieldNoteBody');
  assert(html.includes('id="fieldNoteSourceLink"'), 'index.html contains fieldNoteSourceLink');
  assert(html.includes('id="btnSkipFieldNoteAnimation"'), 'index.html contains btnSkipFieldNoteAnimation');
  assert(html.includes('id="btnSkipTerminalAnimation"'), 'index.html contains btnSkipTerminalAnimation');

  const css = fs.readFileSync(path.resolve(process.cwd(), 'css/styles.css'), 'utf-8');
  assert(css.includes('.mars-field-note-card'), 'css/styles.css contains .mars-field-note-card rules');
  assert(css.includes('.typewriter-cursor'), 'css/styles.css contains .typewriter-cursor rules');
  assert(css.includes('.handover-dialog.failure'), 'css/styles.css contains .handover-dialog.failure red theme');
  assert(css.includes('.handover-dialog.success'), 'css/styles.css contains .handover-dialog.success green theme');
}

console.log(`\nTEST SUMMARY: ${passed} Passed, ${failed} Failed.`);
process.exit(failed > 0 ? 1 : 0);
