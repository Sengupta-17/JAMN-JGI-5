import { ParameterEngine } from '../js/engine/parameterEngine.js';
import { HazardManager } from '../js/engine/hazards/hazardManager.js';
import { SimulationLoop } from '../js/engine/simulationLoop.js';
import { contractBus } from '../js/contract.js';

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

console.log('--- TESTING BASE TELEMETRY SYNCHRONIZATION & REPAIR --- \n');

// 1. Parameter Synchronization Test
{
  const engine = new ParameterEngine('valles_marineris');
  const hazards = new HazardManager(engine, contractBus);
  const loop = new SimulationLoop(engine, hazards, contractBus);

  // Mock Segment3App parameters object
  const mockBaseState = {
    baseParams: { oxygen: 70, food: 75, water: 68, power: 72 },
    syncParameters(params) {
      if (!params) return;
      this.baseParams = {
        oxygen: Number(Number(params.oxygen ?? this.baseParams.oxygen).toFixed(1)),
        food: Number(Number(params.food ?? this.baseParams.food).toFixed(1)),
        water: Number(Number(params.water ?? this.baseParams.water).toFixed(1)),
        power: Number(Number(params.power ?? this.baseParams.power).toFixed(1))
      };
    }
  };

  assert(mockBaseState.baseParams.food === 75, 'Initial baseline Food is 75%');
  assert(mockBaseState.baseParams.water === 68, 'Initial baseline Water is 68%');

  loop.startSol(1);
  loop.update(60.0); // Complete Sol 1

  // Sync to base
  mockBaseState.syncParameters(engine.parameters);

  assert(mockBaseState.baseParams.food < 75.0, `Base Food successfully updated after Sol 1 (Food: ${mockBaseState.baseParams.food}%)`);
  assert(mockBaseState.baseParams.water < 68.0, `Base Water successfully updated after Sol 1 (Water: ${mockBaseState.baseParams.water}%)`);
  assert(typeof mockBaseState.baseParams.water === 'number', 'Updated Water parameter is a valid numeric value');
  assert(Number(mockBaseState.baseParams.food.toFixed(1)) === mockBaseState.baseParams.food, 'Food is cleanly calibrated to 1 decimal place');
}

// 2. Base Emergency Malfunction & Repair Test (Water Recovery)
{
  const engine = new ParameterEngine('valles_marineris');
  const hazards = new HazardManager(engine, contractBus);
  const loop = new SimulationLoop(engine, hazards, contractBus);

  // Inject a water recovery failure via HazardManager
  hazards.raiseModuleIssue('water_recovery_module', {
    faultName: 'VCD Distillation Centrifuge Fouling',
    severity: 'high',
    affectedResources: ['Water'],
    repairCostCH: 3,
    requiresEVA: false,
    description: 'Wastewater filtration membranes fouled. Recovery loop degraded.'
  });

  assert(hazards.activeIssues.has('water_recovery_module'), 'HazardManager registered active water recovery issue');
  assert(engine.moduleHealth.water_recovery_module < 1.0, 'Engine water recovery module health degraded');

  // Verify that repair event resolves the issue in both HazardManager and ParameterEngine
  let repairFired = false;
  contractBus.on('challengeResolved', (p) => {
    if (p.locationId === 'water_recovery_module') repairFired = true;
  });

  // Emulate physical repair action from 3D base
  contractBus.emit('baseIssueFixed', { locationId: 'water_recovery_module', fixedAt: Date.now() });

  assert(!hazards.activeIssues.has('water_recovery_module'), 'Water recovery issue successfully cleared from activeIssues upon base repair');
  assert(engine.moduleHealth.water_recovery_module === 1.0, 'Water recovery module restored to 1.0 (100% nominal health)');
  assert(repairFired === true, 'challengeResolved contract event emitted successfully');
}

console.log(`\nTEST SUMMARY: ${passed} Passed, ${failed} Failed.`);
process.exit(failed > 0 ? 1 : 0);
