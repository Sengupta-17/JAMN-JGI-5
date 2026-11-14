/**
 * Simulation Loop for Mars Surface Mission (Segment 4)
 * Orchestrates the 30-sol diurnal mission pacing (60s/sol: 42s Day / 18s Night),
 * resource integration, Crew-Hour management, and failure/handover evaluation.
 */

export class SimulationLoop {
  constructor(parameterEngine, hazardManager, eventBus) {
    this.engine = parameterEngine;
    this.hazards = hazardManager;
    this.bus = eventBus;

    // Simulation Clock
    this.currentSol = 1;
    this.solTimeElapsed = 0; // 0 to 60 seconds
    this.solDurationSeconds = 60.0;
    this.dayDurationSeconds = 42.0;
    this.nightDurationSeconds = 18.0;

    this.currentPhase = 'day'; // 'day' (0-42s) | 'night' (42-60s)
    this.isRunning = false;
    this.isPaused = false;
    this.isGameOver = false;

    // Crew-Hour Pool
    this.crewHoursRemaining = 20;

    // Blackout Sol Tracker
    this.blackoutEnteredAt = null;

    // Event listeners
    this.onTickCallbacks = [];
    this.onSolChangeCallbacks = [];
    this.onSolCompleteCallbacks = [];
    this.onGameOverCallbacks = [];

    // Internal ticker
    this.lastTimestamp = null;
    this.animationFrameId = null;

    this.setupContractHooks();
  }

  setupContractHooks() {
    if (!this.bus) return;

    // Listen for module repairs from Segment 3 3D navigation
    this.bus.on('baseIssueFixed', (payload) => {
      const locationId = payload?.locationId;
      if (locationId) {
        const issue = this.hazards.activeIssues.get(locationId);
        const cost = issue ? (issue.repairCostCH + this.hazards.getEVACostModifier()) : 2;
        if (this.crewHoursRemaining >= cost) {
          this.crewHoursRemaining -= cost;
          this.hazards.resolveModuleIssue(locationId);
        } else {
          // If not enough CH, keep issue active
          console.warn(`Insufficient Crew-Hours (${this.crewHoursRemaining} < ${cost}) to repair ${locationId}`);
        }
      }
    });

    this.bus.on('retryRequested', () => {
      this.reset();
      this.start();
    });
  }

  start() {
    this.startSol(this.currentSol);
  }

  startSol(sol) {
    if (sol !== undefined) {
      this.currentSol = sol;
    }
    this.solTimeElapsed = 0;
    this.currentPhase = 'day';
    this.isRunning = true;
    this.isPaused = false;
    this.isGameOver = false;
    this.lastTimestamp = performance.now();
    this.initSol(this.currentSol);
    this.loop();
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    if (this.isPaused && !this.isGameOver) {
      this.isPaused = false;
      this.lastTimestamp = performance.now();
      this.loop();
    }
  }

  togglePause() {
    if (this.isPaused) {
      this.resume();
      return false; // now unpaused
    } else if (this.isRunning && !this.isGameOver) {
      this.pause();
      return true; // now paused
    }
    return this.isPaused;
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.currentSol = 1;
    this.solTimeElapsed = 0;
    this.currentPhase = 'day';
    this.blackoutEnteredAt = null;

    this.engine.reset();
    this.hazards.conditioningDebt = 0;
    this.hazards.activeHazards = [];
    this.hazards.activeIssues.clear();
    this.hazards.solarEventCount = 0;
    this.hazards.initChallengeScript();

    this.crewHoursRemaining = 20;
    if (this.animationFrameId) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.animationFrameId);
      } else {
        clearTimeout(this.animationFrameId);
      }
      this.animationFrameId = null;
    }
  }

  initSol(sol) {
    const briefing = this.hazards.processSolStart(sol);
    this.crewHoursRemaining = this.hazards.getAvailableCrewHours();

    const { skippedExercise } = this.engine.onSolAdvance();
    if (sol > 1) {
      this.hazards.applyConditioningDebt(skippedExercise);
    }

    if (this.bus) {
      this.bus.emit('dayStarted', {
        sol: this.currentSol,
        phase: this.currentPhase,
        parameters: { ...this.engine.parameters },
        overnightNotes: briefing.overnightNotes,
        forecasts: briefing.forecasts,
        crewHoursRemaining: this.crewHoursRemaining
      });
    }

    for (const cb of this.onSolChangeCallbacks) {
      cb({
        sol: this.currentSol,
        phase: this.currentPhase,
        briefing,
        crewHoursRemaining: this.crewHoursRemaining
      });
    }
  }

  loop() {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;

    const now = performance.now();
    const dtSeconds = Math.min(0.2, (now - this.lastTimestamp) / 1000.0);
    this.lastTimestamp = now;

    this.update(dtSeconds);

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animationFrameId = requestAnimationFrame(() => this.loop());
    } else {
      this.animationFrameId = setTimeout(() => this.loop(), 16);
    }
  }

  update(dtSeconds) {
    this.solTimeElapsed += dtSeconds;

    // Update phase
    const previousPhase = this.currentPhase;
    this.currentPhase = (this.solTimeElapsed < this.dayDurationSeconds) ? 'day' : 'night';

    // Integrate resource equations
    const dtInSols = dtSeconds / this.solDurationSeconds;
    this.engine.integrate(dtInSols);

    // Check for Power blackout timer
    if (this.engine.parameters.power <= 0) {
      if (this.blackoutEnteredAt === null) {
        this.blackoutEnteredAt = this.currentSol;
      }
    } else {
      this.blackoutEnteredAt = null;
    }

    // Check failure conditions (§4.5.7)
    this.checkFailureConditions();

    // Trigger tick callbacks
    for (const cb of this.onTickCallbacks) {
      cb({
        sol: this.currentSol,
        phase: this.currentPhase,
        solProgress: this.solTimeElapsed / this.solDurationSeconds,
        dayNightSeconds: (this.currentPhase === 'day') ? (this.dayDurationSeconds - this.solTimeElapsed) : (this.solDurationSeconds - this.solTimeElapsed),
        parameters: { ...this.engine.parameters },
        rates: { ...this.engine.rates },
        crewHoursRemaining: this.crewHoursRemaining,
        activeHazards: this.hazards.activeHazards,
        activeIssues: Array.from(this.hazards.activeIssues.entries()),
        conditioningDebt: this.hazards.conditioningDebt,
        radiationDose_mSv: this.engine.radiationDose_mSv
      });
    }

    // Check for Sol completion (60 seconds)
    if (this.solTimeElapsed >= this.solDurationSeconds) {
      this.solTimeElapsed = 0;
      const completedSol = this.currentSol;

      if (completedSol >= 30) {
        // Mission successfully reached Sol 30! Evaluate handover
        this.evaluateMissionHandover();
      } else {
        // Daily cycle completed! Stop surface run, advance sol counter, and trigger return to base
        this.isRunning = false;
        this.currentSol++;

        const summary = {
          completedSol,
          nextSol: this.currentSol,
          parameters: { ...this.engine.parameters },
          radiationDose_mSv: this.engine.radiationDose_mSv
        };

        if (this.bus) {
          this.bus.emit('dayCompleted', summary);
        }

        for (const cb of this.onSolCompleteCallbacks) {
          cb(summary);
        }
      }
    }
  }

  checkFailureConditions() {
    if (this.isGameOver) return;

    let failed = false;
    let reason = '';

    if (this.engine.parameters.oxygen <= 0) {
      failed = true;
      reason = 'Crew Asphyxiation: Habitat life support oxygen reserve fully depleted.';
    } else if (this.engine.parameters.food <= 0) {
      failed = true;
      reason = 'Crew Starvation: Stored food and hydroponic biomass completely exhausted.';
    } else if (this.engine.parameters.water <= 0) {
      failed = true;
      reason = 'Dehydration: Water recovery loops dry. Make-up reserve exhausted.';
    } else if (this.blackoutEnteredAt !== null && this.currentSol > this.blackoutEnteredAt) {
      // Power reached 0 and was not restored before the end of the sol
      failed = true;
      reason = 'Grid Blackout: Total electrical failure unrecovered through sol transition. Life support halted.';
    }

    if (failed) {
      this.endGame('failure', reason, 'Failed Mission');
    }
  }

  evaluateMissionHandover() {
    this.currentSol = 30;
    const P = this.engine.parameters;
    const allAboveZero = P.oxygen > 0 && P.food > 0 && P.water > 0 && P.power > 0;
    const allHandoverTarget = P.oxygen >= 25 && P.food >= 25 && P.water >= 25 && P.power >= 25;
    const hasCriticalFault = this.hazards.activeIssues.size > 0 || this.engine.activeSealLeak;

    let grade = 'Marginal Completion';
    let status = 'success';
    let reason = 'Mission survived 30 sols. Base sustained with narrow reserve margins.';

    if (!allAboveZero) {
      status = 'failure';
      grade = 'Failed Mission';
      reason = 'Base resource reserves depleted at mission conclusion.';
    } else if (allHandoverTarget && !hasCriticalFault) {
      grade = 'Certified Handover Ready';
      reason = 'Exemplary command: All resource buffers >= 25%, no critical faults. Habitat primed for incoming crew!';
    }

    this.endGame(status, reason, grade);
  }

  endGame(status, reason, grade) {
    this.isGameOver = true;
    this.isRunning = false;

    const finalGameState = {
      status,
      endReason: reason,
      handoverGrade: grade,
      solReached: Math.min(30, this.currentSol),
      parameters: { ...this.engine.parameters },
      radiationDose_mSv: this.engine.radiationDose_mSv,
      siteId: this.engine.siteId,
      challengeType: this.hazards.challengeType
    };

    if (this.bus) {
      this.bus.emit('gameEnded', finalGameState);
    }

    for (const cb of this.onGameOverCallbacks) {
      cb(finalGameState);
    }
  }

  // Action dispatcher with Crew-Hour validation
  executeAction(actionKey) {
    if (this.isGameOver) return { success: false, message: 'Simulation ended.' };

    const actionCosts = {
      brine_cycle: 2,
      drill_well: 3,
      tend_crops: 2,
      exercise: 5,
      pulse_arrays: 1,
      eva_arrays: 4 + this.hazards.getEVACostModifier(),
      regolith_berm: 4,
      isolate_leak: 0
    };

    const cost = actionCosts[actionKey] ?? 0;
    if (this.crewHoursRemaining < cost) {
      return { success: false, message: `Insufficient Crew-Hours. Required: ${cost} CH, Available: ${this.crewHoursRemaining} CH.` };
    }

    // Safety checks for EVA
    if (['eva_arrays', 'regolith_berm'].includes(actionKey)) {
      if (this.engine.isSheltered) {
        return { success: false, message: 'ACTION BLOCKED: Active Solar Particle Event shelter directive prohibits exterior EVA.' };
      }
      if (this.engine.stormOpacityTau >= 6.0) {
        return { success: false, message: 'ACTION BLOCKED: Zero-visibility dust storm gale renders surface EVA unsafe.' };
      }
    }

    let result = { success: false, message: 'Unknown action.' };
    switch (actionKey) {
      case 'brine_cycle':
        result = this.engine.runBrineCycle();
        break;
      case 'drill_well':
        result = this.engine.drillIceWell();
        break;
      case 'tend_crops':
        result = this.engine.tendCrops();
        break;
      case 'exercise':
        result = this.engine.exerciseBlock();
        break;
      case 'pulse_arrays':
        result = this.engine.cleanArraysPulse();
        break;
      case 'eva_arrays':
        result = this.engine.cleanArraysEVA();
        break;
      case 'regolith_berm':
        result = this.engine.buildRegolithBerm();
        break;
      case 'isolate_leak':
        result = this.engine.isolateSealLeak();
        break;
    }

    if (result.success) {
      this.crewHoursRemaining -= cost;
    }
    return result;
  }
}
