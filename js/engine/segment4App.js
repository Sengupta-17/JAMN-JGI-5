/**
 * Segment 4 Application Controller
 * Coordinates the scientific parameter engine, 30-sol simulation loop,
 * modular hazard manager, and 3D Mars surface exploration.
 */

import { contractBus } from '../contract.js';
import { ParameterEngine, SITE_MODIFIERS, SITE_STARTING_PARAMETERS } from './parameterEngine.js';
import { HazardManager } from './hazards/hazardManager.js';
import { SimulationLoop } from './simulationLoop.js';
import { MarsSurfaceSimulator } from './surfaceSimulator.js';
import { getMarsFieldNote } from './marsFieldNotesData.js';
import { getTerminalMessage } from './missionEndMessages.js';
import { sound } from '../audio.js';

class TypewriterController {
  constructor(textElement, cursorElement, onComplete) {
    this.textElement = textElement;
    this.cursorElement = cursorElement;
    this.onComplete = onComplete;
    this.timer = null;
    this.fullText = '';
    this.currentIndex = 0;
    this.isFinished = false;
  }

  start(text, speedMs = 35) {
    this.cancel();
    this.fullText = text || '';
    this.currentIndex = 0;
    this.isFinished = false;

    if (this.textElement) this.textElement.textContent = '';
    if (this.cursorElement) this.cursorElement.classList.remove('hidden');

    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.skip();
      return;
    }

    const typeNext = () => {
      if (this.currentIndex < this.fullText.length) {
        if (this.textElement) this.textElement.textContent += this.fullText.charAt(this.currentIndex);
        this.currentIndex++;
        this.timer = setTimeout(typeNext, speedMs);
      } else {
        this.finish();
      }
    };

    typeNext();
  }

  skip() {
    this.cancel();
    if (this.textElement) this.textElement.textContent = this.fullText;
    this.finish();
  }

  finish() {
    this.isFinished = true;
    if (this.cursorElement) this.cursorElement.classList.add('hidden');
    if (typeof this.onComplete === 'function') {
      this.onComplete();
    }
  }

  cancel() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export class Segment4App {
  constructor() {
    this.siteId = 'valles_marineris';
    this.challengeType = 'standard';

    // Core engines
    this.engine = new ParameterEngine(this.siteId);
    this.hazards = new HazardManager(this.engine, contractBus);
    this.loop = new SimulationLoop(this.engine, this.hazards, contractBus);
    this.surfaceSim = null;

    this.isAttached = false;
    this.lastRenderTimestamp = performance.now();

    this.fieldNoteTypewriter = null;
    this.terminalTypewriter = null;
  }

  init() {
    this.setupDOM();
    this.setupContractEvents();
    this.setupLoopCallbacks();
  }

  setupDOM() {
    // Action Deck button handlers
    const actionMap = [
      { id: 'btnActBrine', action: 'brine_cycle' },
      { id: 'btnActDrill', action: 'drill_well' },
      { id: 'btnActTend', action: 'tend_crops' },
      { id: 'btnActExercise', action: 'exercise' },
      { id: 'btnActPulse', action: 'pulse_arrays' },
      { id: 'btnActEVAArray', action: 'eva_arrays' },
      { id: 'btnActBerm', action: 'regolith_berm' },
      { id: 'btnActIsolate', action: 'isolate_leak' }
    ];

    actionMap.forEach(({ id, action }) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', () => {
          const res = this.loop.executeAction(action);
          this.showActionNotice(res.message, res.success);
        });
      }
    });

    // Skip typewriter buttons
    const btnSkipFieldNote = document.getElementById('btnSkipFieldNoteAnimation');
    if (btnSkipFieldNote) {
      btnSkipFieldNote.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.fieldNoteTypewriter) this.fieldNoteTypewriter.skip();
      });
    }

    const btnSkipTerminal = document.getElementById('btnSkipTerminalAnimation');
    if (btnSkipTerminal) {
      btnSkipTerminal.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.terminalTypewriter) this.terminalTypewriter.skip();
      });
    }

    // Typewriter instances
    this.fieldNoteTypewriter = new TypewriterController(
      document.getElementById('fieldNoteBody'),
      document.getElementById('fieldNoteCursor')
    );
    this.terminalTypewriter = new TypewriterController(
      document.getElementById('handoverReasonText'),
      document.getElementById('terminalCursor')
    );

    // Conservation mode toggles
    const modeBtns = document.querySelectorAll('.btn-conserve-mode');
    modeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (this.engine.setConservationMode(mode)) {
          modeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.showActionNotice(`Operating policy updated to ${mode.toUpperCase()}.`, true);
        }
      });
    });

    // Camera view toggle button
    const btnToggleCamera = document.getElementById('btnToggleSurfaceCamera');
    if (btnToggleCamera) {
      btnToggleCamera.addEventListener('click', () => {
        if (this.surfaceSim) {
          this.surfaceSim.toggleCameraMode();
          btnToggleCamera.textContent = `VIEW: ${this.surfaceSim.cameraMode.toUpperCase()} (V)`;
        }
      });
    }

    // Surface Station Proximity Interact Button
    const btnSurfaceInteract = document.getElementById('btnSurfaceInteract');
    if (btnSurfaceInteract) {
      btnSurfaceInteract.addEventListener('click', () => {
        if (this.surfaceSim) {
          this.surfaceSim.triggerActiveInteraction();
        }
      });
    }

    // Morning briefing modal close
    const btnCloseBriefing = document.getElementById('btnCloseBriefingModal');
    if (btnCloseBriefing) {
      btnCloseBriefing.addEventListener('click', () => {
        document.getElementById('morningBriefingModal')?.classList.add('hidden');
      });
    }

    // Game over / Handover modal retry button
    const btnRetryMission = document.getElementById('btnRetryMission');
    if (btnRetryMission) {
      btnRetryMission.addEventListener('click', () => {
        document.getElementById('handoverModal')?.classList.add('hidden');
        contractBus.emit('retryRequested', { siteId: this.siteId, challengeType: this.challengeType });
      });
    }

    // Simulation Pause / Resume handlers
    const btnPause = document.getElementById('btnPauseSimulation');
    if (btnPause) {
      btnPause.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePause();
      });
    }

    const btnResumeOverlay = document.getElementById('btnResumeOverlay');
    if (btnResumeOverlay) {
      btnResumeOverlay.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resume();
      });
    }

    window.addEventListener('keydown', (e) => {
      const engineScreen = document.getElementById('screen_game_engine');
      if (!engineScreen || !engineScreen.classList.contains('active-screen')) return;

      if (e.code === 'KeyP') {
        e.preventDefault();
        this.togglePause();
      } else if (e.code === 'Escape' && this.loop.isPaused) {
        e.preventDefault();
        this.resume();
      }
    });

    // Ensure pause UI is strictly hidden upon initialization
    this.updatePauseUI(false);
  }

  setupContractEvents() {
    contractBus.on('siteSelected', (payload) => {
      if (payload?.siteId) {
        this.siteId = payload.siteId;
        this.engine.reset(this.siteId);
      }
    });

    contractBus.on('challengeSelected', (payload) => {
      this.siteId = payload.siteId || this.siteId;
      this.challengeType = payload.challengeType || 'standard';
      if (this.surfaceSim && this.surfaceSim.rover) {
        this.surfaceSim.rover.setNightLight(false);
      }
      this.startMission();
    });

    contractBus.on('retryRequested', () => {
      this.engine.reset(this.siteId);
      this.hazards.setChallenge(this.challengeType);
      this.loop.reset();
      this.loop.start();
      this.showActionNotice('Simulation reset to Sol 1. All modules nominal.', true);
    });
  }

  resetMission() {
    if (this.fieldNoteTypewriter) {
      this.fieldNoteTypewriter.cancel();
    }
    if (this.terminalTypewriter) {
      this.terminalTypewriter.cancel();
    }
    if (this.loop) {
      this.loop.reset();
    }
    if (this.engine) {
      this.engine.reset(this.siteId);
    }
    if (this.surfaceSim) {
      this.surfaceSim.resetInputKeys();
      this.surfaceSim.resetAllInteractions();
      if (this.surfaceSim.rover) {
        this.surfaceSim.rover.setNightLight(false);
      }
    }
    this.missionStarted = false;
    this.updatePauseUI(false);
    ['surfacePauseOverlay', 'solCompletedModal', 'morningBriefingModal', 'handoverModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('hidden');
        el.style.display = 'none';
      }
    });
  }

  setupLoopCallbacks() {
    this.loop.onTickCallbacks.push((data) => {
      this.updateHUD(data);

      // Render 3D surface
      if (this.surfaceSim) {
        const now = performance.now();
        const dt = Math.min(0.1, (now - this.lastRenderTimestamp) / 1000.0);
        this.lastRenderTimestamp = now;
        this.surfaceSim.update(dt, data.solProgress, this.engine.stormOpacityTau, data.phase);
      }
    });

    this.loop.onSolChangeCallbacks.push((data) => {
      this.showMorningBriefing(data);
      if (this.surfaceSim) {
        this.surfaceSim.onNewSol(data.sol);
      }
    });

    this.loop.onSolCompleteCallbacks.push((data) => {
      this.handleSolComplete(data);
    });

    this.loop.onGameOverCallbacks.push((data) => {
      this.showHandoverModal(data);
    });
  }

  pause() {
    if (this.loop.isRunning && !this.loop.isPaused && !this.loop.isGameOver) {
      this.loop.pause();
    }
    if (this.surfaceSim) {
      this.surfaceSim.resetInputKeys();
      this.surfaceSim.resetAllInteractions();
      if (this.surfaceSim.rover) {
        this.surfaceSim.rover.setNightLight(false);
      }
    }
    this.updatePauseUI(true);
    this.showActionNotice('Simulation paused.', false);
  }

  resume() {
    if (this.loop.isPaused && !this.loop.isGameOver) {
      this.loop.resume();
    }
    this.lastRenderTimestamp = performance.now();
    this.updatePauseUI(false);
    this.showActionNotice('Simulation resumed.', true);
  }

  togglePause() {
    if (this.loop.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  updatePauseUI(isPaused) {
    const btnPause = document.getElementById('btnPauseSimulation');
    const overlay = document.getElementById('surfacePauseOverlay');

    if (btnPause) {
      btnPause.textContent = isPaused ? '▶️ RESUME' : '⏸️ PAUSE';
      btnPause.classList.toggle('paused', isPaused);
      btnPause.setAttribute('aria-label', isPaused ? 'Resume Simulation' : 'Pause Simulation');
    }

    if (overlay) {
      if (isPaused) {
        const pauseSolEl = document.getElementById('pauseSolVal');
        if (pauseSolEl) pauseSolEl.textContent = String(this.loop.currentSol).padStart(2, '0');
        const pausePhaseEl = document.getElementById('pausePhaseVal');
        if (pausePhaseEl) pausePhaseEl.textContent = this.loop.currentPhase.toUpperCase();
        const pauseSecEl = document.getElementById('pauseSecondsVal');
        if (pauseSecEl) {
          const rem = Math.ceil(
            (this.loop.currentPhase === 'day')
              ? (this.loop.dayDurationSeconds - this.loop.solTimeElapsed)
              : (this.loop.solDurationSeconds - this.loop.solTimeElapsed)
          );
          pauseSecEl.textContent = `${rem}s`;
        }
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
        overlay.style.pointerEvents = 'auto';
      } else {
        overlay.classList.add('hidden');
        overlay.style.display = 'none';
        overlay.style.pointerEvents = 'none';
      }
    }
  }

  handleSolComplete(data) {
    if (this.loop.isGameOver) return; // Suppress field note if mission already failed

    const modal = document.getElementById('solCompletedModal');
    if (!modal) return;

    const solNumEl = document.getElementById('completedSolNumber');
    if (solNumEl) solNumEl.textContent = String(data.completedSol).padStart(2, '0');

    const nextSolNumEl = document.getElementById('nextSolNumber');
    if (nextSolNumEl) nextSolNumEl.textContent = String(Math.min(30, data.nextSol)).padStart(2, '0');

    const statsEl = document.getElementById('completedSolStats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="completed-stat-box"><span>OXYGEN</span><strong>${Math.max(0, data.parameters.oxygen).toFixed(1)}%</strong></div>
        <div class="completed-stat-box"><span>FOOD</span><strong>${Math.max(0, data.parameters.food).toFixed(1)}%</strong></div>
        <div class="completed-stat-box"><span>WATER</span><strong>${Math.max(0, data.parameters.water).toFixed(1)}%</strong></div>
        <div class="completed-stat-box"><span>POWER</span><strong>${Math.max(0, data.parameters.power).toFixed(1)}%</strong></div>
      `;
    }

    // Populate Segment 5 Mars Field Note Card (§1.1, §2.2)
    const note = getMarsFieldNote(data.completedSol);
    const solPad = String(data.completedSol).padStart(2, '0');
    const fieldNoteSolLabel = document.getElementById('fieldNoteSolLabel');
    if (fieldNoteSolLabel) fieldNoteSolLabel.textContent = `SOL ${solPad} • FIELD NOTE ${solPad}`;

    const fieldNoteTitle = document.getElementById('fieldNoteTitle');
    if (fieldNoteTitle) fieldNoteTitle.textContent = note.title;

    const fieldNoteSourceLabel = document.getElementById('fieldNoteSourceLabel');
    if (fieldNoteSourceLabel) fieldNoteSourceLabel.textContent = note.sourceLabel;

    const fieldNoteSourceLink = document.getElementById('fieldNoteSourceLink');
    if (fieldNoteSourceLink) {
      fieldNoteSourceLink.href = note.sourceUrl;
      fieldNoteSourceLink.textContent = 'Read source ↗';
    }

    if (this.fieldNoteTypewriter) {
      this.fieldNoteTypewriter.start(note.body, 35);
    }

    const promptEl = document.getElementById('completedSolNextPrompt');
    const btnReturn = document.getElementById('btnReturnToBaseAfterSol');

    if (data.completedSol >= 30) {
      // Sol 30 behaviour: Prompt final review (§1.2, §2.1)
      if (promptEl) {
        promptEl.textContent = 'All 30 Martian sols have been completed! Review final life-support telemetry and inspect the mission handover certification.';
      }
      if (btnReturn) {
        btnReturn.textContent = 'REVIEW FINAL MISSION OUTCOME →';
        btnReturn.onclick = () => {
          modal.classList.add('hidden');
          if (this.fieldNoteTypewriter) this.fieldNoteTypewriter.cancel();
          this.loop.evaluateMissionHandover();
        };
      }
    } else {
      if (promptEl) {
        promptEl.innerHTML = `Return to the base habitat to review updated Sol telemetry, inspect hardware modules, and launch <strong>Sol <span id="nextSolNumber">${String(data.nextSol).padStart(2, '0')}</span></strong> with a fresh daily operational challenge!`;
      }
      if (btnReturn) {
        btnReturn.textContent = '🚪 ENTER BASE HABITAT & PREPARE NEXT SOL →';
        btnReturn.onclick = () => {
          modal.classList.add('hidden');
          if (this.fieldNoteTypewriter) this.fieldNoteTypewriter.cancel();
          if (window.jamnSegment3App) {
            window.jamnSegment3App.syncParameters(data.parameters);
            window.jamnSegment3App.setScreen('base_info');
          }
        };
      }
    }

    modal.classList.remove('hidden');
  }

  startMission() {
    // Switch UI screen to Segment 4
    document.querySelectorAll('.screen-panel').forEach(s => s.classList.remove('active-screen'));
    const engineScreen = document.getElementById('screen_game_engine');
    if (engineScreen) engineScreen.classList.add('active-screen');

    // Update active nav tab
    document.querySelectorAll('.nav-tab-btn').forEach(t => t.classList.remove('active-tab'));
    const engineTab = document.querySelector('.nav-tab-btn[data-target-screen="game_engine"]');
    if (engineTab) engineTab.classList.add('active-tab');

    // Reset pause state and ensure pause overlay is hidden on sol launch
    if (this.loop.isPaused) {
      this.loop.resume();
    }
    this.updatePauseUI(false);

    // Initialize 3D Surface Simulator if not already created
    const surfaceContainer = document.getElementById('surfaceSimulatorContainer');
    if (surfaceContainer && !this.surfaceSim) {
      this.surfaceSim = new MarsSurfaceSimulator(surfaceContainer);
      this.surfaceSim.onInteractionTriggered = (actionResult) => {
        this.handleSurfaceInteraction(actionResult);
      };
    } else if (this.surfaceSim && !this.surfaceSim.onInteractionTriggered) {
      this.surfaceSim.onInteractionTriggered = (actionResult) => {
        this.handleSurfaceInteraction(actionResult);
      };
    }

    // Automatically extinguish rover night light on sol start (launching from challenge briefing)
    if (this.surfaceSim && this.surfaceSim.rover) {
      this.surfaceSim.rover.setNightLight(false);
    }

    // Configure challenge scenario for this sol
    this.hazards.setChallenge(this.challengeType);

    // If starting from Day 1 for the first time, initialize parameters from site baseline
    if (!this.missionStarted || this.loop.currentSol === 1) {
      this.missionStarted = true;
      this.engine.reset(this.siteId);
      this.loop.reset();
      this.loop.startSol(1);

      contractBus.emit('gameStarted', {
        siteId: this.siteId,
        challengeType: this.challengeType,
        day: 1,
        phase: 'day',
        parameters: { ...this.engine.parameters }
      });
    } else {
      // Continuing into next sol with preserved memory of resources and module health!
      this.loop.startSol(this.loop.currentSol);
    }

    this.showActionNotice(`Sol ${this.loop.currentSol} launched at ${SITE_MODIFIERS[this.siteId].name}. Scenario: ${this.challengeType.toUpperCase()}`, true);
  }

  updateHUD(data) {
    // 1. Sol & Timer Display
    const elSolNum = document.getElementById('hudSolNumber');
    if (elSolNum) elSolNum.textContent = String(data.sol).padStart(2, '0');

    const elPhasePill = document.getElementById('hudPhasePill');
    if (elPhasePill) {
      const isDay = (data.phase === 'day');
      elPhasePill.textContent = `${isDay ? '☀️ DAY' : '🌙 NIGHT'} (${Math.ceil(data.dayNightSeconds)}s)`;
      elPhasePill.className = `phase-pill ${isDay ? 'day' : 'night'}`;
    }

    const elProgressBar = document.getElementById('hudSolProgressFill');
    if (elProgressBar) {
      elProgressBar.style.width = `${(data.solProgress * 100).toFixed(1)}%`;
    }

    // 2. Core 4 Resource Meters (Oxygen, Food, Water, Power)
    this.updateMeter('oxygen', data.parameters.oxygen, data.rates.oxygen, 25, 10);
    this.updateMeter('food', data.parameters.food, data.rates.food, 25, 10);
    this.updateMeter('water', data.parameters.water, data.rates.water, 25, 10);
    this.updateMeter('power', data.parameters.power, data.rates.power, 40, 10);

    // 3. Crew & Operational State
    const elCH = document.getElementById('hudCrewHours');
    if (elCH) elCH.textContent = `${data.crewHoursRemaining} / 20 CH`;

    const elDebt = document.getElementById('hudConditioningDebt');
    if (elDebt) elDebt.textContent = `${data.conditioningDebt} pts`;

    const elDose = document.getElementById('hudRadiationDose');
    if (elDose) elDose.textContent = `${data.radiationDose_mSv.toFixed(2)} mSv`;

    const elTau = document.getElementById('hudStormTau');
    if (elTau) elTau.textContent = `Tau: ${this.engine.stormOpacityTau.toFixed(1)}`;

    // 4. Active Alarms / Hazards Banner
    const elAlarm = document.getElementById('hudHazardNotice');
    if (elAlarm) {
      if (data.activeHazards.length > 0) {
        elAlarm.textContent = `⚠️ ACTIVE HAZARD: ${data.activeHazards[0].title}`;
        elAlarm.classList.remove('hidden');
      } else if (data.activeIssues.length > 0) {
        const [loc, issue] = data.activeIssues[0];
        elAlarm.textContent = `🛠️ SUBSYSTEM FAULT: ${issue.faultName} (${loc})`;
        elAlarm.classList.remove('hidden');
      } else {
        elAlarm.classList.add('hidden');
      }
    }
  }

  updateMeter(key, val, rate, warnThreshold, critThreshold) {
    const valEl = document.getElementById(`meterVal_${key}`);
    const fillEl = document.getElementById(`meterFill_${key}`);
    const rateEl = document.getElementById(`meterRate_${key}`);
    const statusEl = document.getElementById(`meterStatus_${key}`);

    if (valEl) valEl.textContent = `${val.toFixed(1)}%`;
    if (fillEl) {
      fillEl.style.width = `${val.toFixed(1)}%`;
      fillEl.className = 'meter-fill ' + ((val <= critThreshold) ? 'critical' : (val <= warnThreshold ? 'warning' : 'nominal'));
    }
    if (rateEl) {
      const sign = (rate >= 0) ? '+' : '';
      rateEl.textContent = `${sign}${rate.toFixed(2)} pp/sol`;
      rateEl.className = 'meter-rate ' + ((rate < 0) ? 'negative' : 'positive');
    }
    if (statusEl) {
      if (val <= critThreshold) {
        statusEl.textContent = 'CRITICAL';
        statusEl.className = 'status-tag critical';
      } else if (val <= warnThreshold) {
        statusEl.textContent = 'WARNING';
        statusEl.className = 'status-tag warning';
      } else {
        statusEl.textContent = 'NOMINAL';
        statusEl.className = 'status-tag nominal';
      }
    }
  }

  showMorningBriefing({ sol, briefing, crewHoursRemaining }) {
    const modal = document.getElementById('morningBriefingModal');
    if (!modal) return;

    const solEl = document.getElementById('briefingSolNum');
    if (solEl) solEl.textContent = sol;

    const notesList = document.getElementById('briefingOvernightList');
    if (notesList) {
      notesList.innerHTML = briefing.overnightNotes.length > 0
        ? briefing.overnightNotes.map(n => `<li>${n}</li>`).join('')
        : '<li>Overnight closed-loop life support cycle completed with zero anomalies.</li>';
    }

    const forecastList = document.getElementById('briefingForecastList');
    if (forecastList) {
      forecastList.innerHTML = briefing.forecasts.length > 0
        ? briefing.forecasts.map(f => `<li>${f}</li>`).join('')
        : '<li>Meteorological conditions nominal. Solar transmission normal.</li>';
    }

    const chEl = document.getElementById('briefingCH');
    if (chEl) chEl.textContent = `${crewHoursRemaining} Crew-Hours`;

    modal.classList.remove('hidden');
  }

  showHandoverModal(data) {
    const modal = document.getElementById('handoverModal');
    if (!modal) return;

    // Suppress day completed modal if active
    document.getElementById('solCompletedModal')?.classList.add('hidden');
    if (this.fieldNoteTypewriter) this.fieldNoteTypewriter.cancel();

    const terminalMsg = getTerminalMessage(data.status, data.endReason, data.solReached);

    const dialogEl = document.getElementById('handoverDialog');
    if (dialogEl) {
      const variantClass = terminalMsg.isSuccess
        ? (data.handoverGrade === 'Certified Handover Ready' ? 'success' : 'success-marginal')
        : 'failure';
      dialogEl.className = `handover-dialog ${variantClass}`;
    }

    const iconEl = document.getElementById('handoverIcon');
    if (iconEl) iconEl.textContent = terminalMsg.icon;

    const titleEl = document.getElementById('handoverTitle');
    if (titleEl) {
      titleEl.textContent = terminalMsg.heading;
      titleEl.className = `handover-title ${terminalMsg.isSuccess ? 'success' : 'failure'}`;
    }

    const badgeEl = document.getElementById('handoverGradeBadge');
    if (badgeEl) {
      badgeEl.textContent = terminalMsg.badge;
      badgeEl.className = `handover-badge ${terminalMsg.isSuccess ? 'success' : 'failure'}`;
    }

    if (this.terminalTypewriter) {
      this.terminalTypewriter.start(terminalMsg.body, 35);
    } else {
      const reasonEl = document.getElementById('handoverReasonText');
      if (reasonEl) reasonEl.textContent = terminalMsg.body;
    }

    const statsEl = document.getElementById('handoverStatsGrid');
    if (statsEl) {
      const sampleBonus = (data.cachedSamples || 0) * 5;
      statsEl.innerHTML = `
        <div class="stat-box"><span>SOL REACHED:</span><strong>${data.solReached} / 30</strong></div>
        <div class="stat-box"><span>OXYGEN:</span><strong>${Math.max(0, data.parameters.oxygen).toFixed(1)}%</strong></div>
        <div class="stat-box"><span>FOOD:</span><strong>${Math.max(0, data.parameters.food).toFixed(1)}%</strong></div>
        <div class="stat-box"><span>WATER:</span><strong>${Math.max(0, data.parameters.water).toFixed(1)}%</strong></div>
        <div class="stat-box"><span>POWER:</span><strong>${Math.max(0, data.parameters.power).toFixed(1)}%</strong></div>
        <div class="stat-box"><span>CACHED SAMPLES:</span><strong>${data.cachedSamples || 0} / 5 (+${sampleBonus}% BONUS)</strong></div>
        <div class="stat-box"><span>RADIATION DOSE:</span><strong>${data.radiationDose_mSv.toFixed(1)} mSv</strong></div>
      `;
    }

    modal.classList.remove('hidden');
  }

  handleSurfaceInteraction(actionResult) {
    if (!actionResult || !actionResult.success) {
      if (actionResult?.message) this.showActionNotice(actionResult.message, false);
      return;
    }

    // 1. Apply simulation parameter updates
    if (actionResult.delta) {
      if (typeof actionResult.delta.water === 'number') {
        this.engine.parameters.water = Math.min(100, +(this.engine.parameters.water + actionResult.delta.water).toFixed(2));
      }
      if (typeof actionResult.delta.power === 'number') {
        this.engine.parameters.power = Math.min(100, +(this.engine.parameters.power + actionResult.delta.power).toFixed(2));
      }
      if (typeof actionResult.delta.oxygen === 'number') {
        this.engine.parameters.oxygen = Math.min(100, +(this.engine.parameters.oxygen + actionResult.delta.oxygen).toFixed(2));
      }
      if (typeof actionResult.delta.soilingReduction === 'number') {
        this.engine.arraySoiling = Math.max(0.01, +(this.engine.arraySoiling * (1 - actionResult.delta.soilingReduction)).toFixed(3));
      }
      if (typeof actionResult.delta.tauReduction === 'number') {
        this.engine.stormOpacityTau = Math.max(0.2, +(this.engine.stormOpacityTau - actionResult.delta.tauReduction).toFixed(2));
      }
      if (typeof actionResult.delta.cachedSample === 'number') {
        this.engine.cachedSamples = Math.min(5, (this.engine.cachedSamples || 0) + actionResult.delta.cachedSample);
      }
      this.engine.recomputeRates();
    }

    // 2. Trigger procedural audio feedback
    try {
      if (sound) {
        if (actionResult.stationId === 'ice_drill_site') {
          sound.playBeep(980, 0.15, 'triangle');
          setTimeout(() => sound.playSuccess(), 120);
        } else if (actionResult.stationId === 'solar_sweeper_hub') {
          sound.playAirRelease(0.6);
          setTimeout(() => sound.playSuccess(), 100);
        } else if (actionResult.stationId === 'weather_station_post') {
          sound.playBeep(1760, 0.08);
          setTimeout(() => sound.playBeep(2200, 0.1), 90);
          setTimeout(() => sound.playSuccess(), 220);
        } else if (actionResult.stationId === 'mineral_sample_cache') {
          sound.playClank();
          setTimeout(() => sound.playSuccess(), 140);
        } else if (actionResult.stationId === 'airlock_terminal') {
          sound.playAirRelease(0.7);
          setTimeout(() => sound.playSuccess(), 120);
        } else {
          sound.playSuccess();
        }
      }
    } catch (e) {
      // Audio optional in headless/restricted contexts
    }

    // 3. User feedback toast
    this.showActionNotice(actionResult.message, true);

    // 4. Contract event bus dispatch
    contractBus.emit('surfaceInteractionCompleted', {
      stationId: actionResult.stationId,
      actionId: actionResult.actionId,
      delta: actionResult.delta,
      sol: this.loop.currentSol,
      cachedSamples: this.engine.cachedSamples || 0
    });
  }

  showActionNotice(msg, isSuccess = true) {
    const banner = document.getElementById('actionNoticeToast');
    if (!banner) return;
    banner.textContent = msg;
    banner.className = `action-notice-toast ${isSuccess ? 'success' : 'error'}`;
    banner.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      banner.classList.add('hidden');
    }, 4500);
  }
}
