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
    if (this.loop) {
      this.loop.reset();
    }
    if (this.engine) {
      this.engine.reset(this.siteId);
    }
    if (this.surfaceSim) {
      this.surfaceSim.resetInputKeys();
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
        this.surfaceSim.update(dt, data.solProgress, this.engine.stormOpacityTau);
      }
    });

    this.loop.onSolChangeCallbacks.push((data) => {
      this.showMorningBriefing(data);
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
    const modal = document.getElementById('solCompletedModal');
    if (!modal) return;

    const solNumEl = document.getElementById('completedSolNumber');
    if (solNumEl) solNumEl.textContent = String(data.completedSol).padStart(2, '0');

    const nextSolNumEl = document.getElementById('nextSolNumber');
    if (nextSolNumEl) nextSolNumEl.textContent = String(data.nextSol).padStart(2, '0');

    const statsEl = document.getElementById('completedSolStats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="completed-stat-box"><span>OXYGEN</span><strong>${data.parameters.oxygen.toFixed(1)}%</strong></div>
        <div class="completed-stat-box"><span>FOOD</span><strong>${data.parameters.food.toFixed(1)}%</strong></div>
        <div class="completed-stat-box"><span>WATER</span><strong>${data.parameters.water.toFixed(1)}%</strong></div>
        <div class="completed-stat-box"><span>POWER</span><strong>${data.parameters.power.toFixed(1)}%</strong></div>
      `;
    }

    modal.classList.remove('hidden');

    const btnReturn = document.getElementById('btnReturnToBaseAfterSol');
    if (btnReturn) {
      btnReturn.onclick = () => {
        modal.classList.add('hidden');
        if (window.jamnSegment3App) {
          window.jamnSegment3App.syncParameters(data.parameters);
          window.jamnSegment3App.setScreen('base_info');
        }
      };
    }
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

    const titleEl = document.getElementById('handoverTitle');
    const badgeEl = document.getElementById('handoverGradeBadge');
    const reasonEl = document.getElementById('handoverReasonText');
    const statsEl = document.getElementById('handoverStatsGrid');

    if (titleEl) {
      titleEl.textContent = (data.status === 'success') ? 'MISSION COMPLETED' : 'MISSION TERMINATED';
      titleEl.style.color = (data.status === 'success') ? 'var(--green-nominal)' : 'var(--red-critical)';
    }

    if (badgeEl) {
      badgeEl.textContent = data.handoverGrade;
      badgeEl.className = `handover-badge ${data.status === 'success' ? 'success' : 'failure'}`;
    }

    if (reasonEl) {
      reasonEl.textContent = data.endReason;
    }

    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-box"><span>SOL REACHED:</span><strong>${data.solReached} / 30</strong></div>
        <div class="stat-box"><span>OXYGEN:</span><strong>${data.parameters.oxygen.toFixed(1)}%</strong></div>
        <div class="stat-box"><span>FOOD:</span><strong>${data.parameters.food.toFixed(1)}%</strong></div>
        <div class="stat-box"><span>WATER:</span><strong>${data.parameters.water.toFixed(1)}%</strong></div>
        <div class="stat-box"><span>POWER:</span><strong>${data.parameters.power.toFixed(1)}%</strong></div>
        <div class="stat-box"><span>RADIATION DOSE:</span><strong>${data.radiationDose_mSv.toFixed(1)} mSv</strong></div>
      `;
    }

    modal.classList.remove('hidden');
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
