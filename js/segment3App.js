/**
 * Segment 3 Main Application Controller
 * Handles habitat entry, HUD telemetry, 3D first-person navigation,
 * subsystem diagnostic inspection & repair, and mission launch handoff.
 */

import { LANDING_SITES, BASE_MODULES, CHALLENGE_TYPES } from './baseData.js';
import { sound } from './audio.js';
import { ExteriorVisualizer, InteriorBlueprintVisualizer } from './baseVisualizer.js';
import { GazeboPhysicsEngine } from './gazeboPhysics.js';
import { ThreeBaseRenderer } from './threeBaseRenderer.js';
import { contractBus } from './contract.js';
import { Segment4App } from './engine/segment4App.js';

export class Segment3App {
  constructor() {
    this.currentSiteId = 'valles_marineris';
    this.currentScreen = 'base_entry'; // 'base_entry' | 'base_info' | 'base_nav' | 'challenge_select' | 'mission_launched'
    this.selectedModuleId = 'eclss_module';
    this.assignedChallenge = null;
    
    // Active issues map: moduleId -> issue object
    this.activeIssues = new Map();
    this.eventLogs = [];
    
    // Base parameters (Strictly 4: Oxygen, Food, Water, Power)
    this.baseParams = { ...LANDING_SITES[this.currentSiteId].startingParameters };

    this.exteriorVis = null;
    this.interiorVis = null;
    this.gazeboPhysics = null;
    this.threeRenderer = null;
    this.repairInProgress = false;
    this.activeViewMode = '3d'; // '3d' | '2d'
  }

  init() {
    // 1. Initialize DOM bindings, listeners, and HUD FIRST to guarantee zero lockups
    try {
      this.bindDOMEvents();
      this.setupContractListeners();
      this.render();
    } catch (e) {
      console.error('DOM setup error:', e);
    }

    // 2. Exterior 2D Canvas Visualizer
    try {
      this.exteriorVis = new ExteriorVisualizer('exteriorCanvas');
      this.exteriorVis.setSite(this.currentSiteId);
    } catch (e) {
      console.warn('Exterior visualizer failed to initialize:', e);
    }

    // 3. Interior 2D Blueprint Visualizer
    try {
      this.interiorVis = new InteriorBlueprintVisualizer('interiorCanvas');
      this.interiorVis.selectedModuleId = this.selectedModuleId;
      this.interiorVis.onModuleSelect((modId) => {
        this.selectModule(modId);
      });
    } catch (e) {
      console.warn('Interior visualizer failed to initialize:', e);
    }

    // 4. Contact Physics & Three.js 3D Viewport
    try {
      this.gazeboPhysics = new GazeboPhysicsEngine();
      this.threeRenderer = new ThreeBaseRenderer('threeViewportContainer', this.gazeboPhysics);
      
      this.threeRenderer.onInteract((modId) => {
        sound.playBeep(1200, 0.08);
        this.openSidePopup(modId);
      });

      this.threeRenderer.onMenuToggle(() => {
        this.exitFullscreen3D();
      });

      this.threeRenderer.onEscape(() => {
        this.closeSidePopup();
      });

    } catch (e) {
      console.warn('3D Three.js renderer failed to initialize:', e);
    }

    // 5. Segment 4 Game Engine & 3D Surface Simulation
    try {
      window.jamnSegment4App = new Segment4App();
      window.jamnSegment4App.init();
    } catch (e) {
      console.warn('Segment 4 engine failed to initialize:', e);
    }

    this.logEvent('SYSTEM', `Segment 3 initialized. Site: ${this.currentSiteId} // Gazebo 0.38g solid physics active`);
  }

  setupContractListeners() {
    // Input: siteSelected from Segment 2
    contractBus.on('siteSelected', (payload) => {
      const siteId = typeof payload === 'string' ? payload : payload?.siteId;
      if (siteId && LANDING_SITES[siteId]) {
        this.setSite(siteId);
        this.logEvent('EVENT_RECV', `siteSelected: ${siteId}`);
      }
    });

    // Input: baseIssueRaised from Segment 4
    contractBus.on('baseIssueRaised', (payload) => {
      const locId = payload?.locationId || payload;
      const issue = this.generateIssueForModule(locId, payload?.issueDetails);
      if (issue) {
        this.raiseIssue(locId, issue);
        this.logEvent('EVENT_RECV', `baseIssueRaised at ${locId}: ${issue.title}`);
      }
    });

    // Input: retryRequested from Segment 6
    contractBus.on('retryRequested', (payload) => {
      const siteId = payload?.siteId || this.currentSiteId;
      this.setSite(siteId);
      this.setScreen('base_entry');
      this.logEvent('EVENT_RECV', `retryRequested. Reset to Base Entry`);
    });
  }

  setSite(siteId) {
    if (!LANDING_SITES[siteId]) return;
    this.currentSiteId = siteId;
    this.baseParams = { ...LANDING_SITES[siteId].startingParameters };
    if (this.exteriorVis) this.exteriorVis.setSite(this.currentSiteId);
    this.render();
  }

  setScreen(screen) {
    this.currentScreen = screen;
    sound.playClick();

    // Fullscreen 3D Mode handling:
    // When base_nav is selected, the 3D viewport takes over the whole screen
    if (screen === 'base_nav') {
      document.body.classList.add('fullscreen-3d-active');
      if (this.threeRenderer) {
        setTimeout(() => this.threeRenderer.onResize(), 60);
      }
      if (this.interiorVis) {
        setTimeout(() => this.interiorVis.resize(), 60);
      }
    } else {
      document.body.classList.remove('fullscreen-3d-active');
      this.closeSidePopup();
      if (screen === 'base_entry' && this.exteriorVis) {
        setTimeout(() => this.exteriorVis.resize(), 60);
      }
    }

    this.render();
  }

  exitFullscreen3D() {
    sound.playClick();
    this.closeSidePopup();
    this.setScreen('base_info');
  }

  selectModule(moduleId) {
    this.selectedModuleId = moduleId;
    if (this.interiorVis) this.interiorVis.selectedModuleId = moduleId;
    sound.playClick();
    this.renderModuleList();
    this.renderModuleDetails();
  }

  // Subsystem side panel
  openSidePopup(moduleId) {
    this.selectedModuleId = moduleId;
    const mod = BASE_MODULES.find(m => m.id === moduleId);
    if (!mod) return;

    const popupPanel = document.getElementById('sidePopupPanel');
    const popupTitle = document.getElementById('sidePopupTitle');
    const popupContent = document.getElementById('sidePopupContent');

    if (popupPanel && popupContent) {
      if (popupTitle) {
        popupTitle.textContent = `${mod.name.toUpperCase()} // TERMINAL`;
      }
      this.renderModuleDetailsToContainer(mod, popupContent);
      popupPanel.classList.remove('hidden');
    }
  }

  closeSidePopup() {
    const popupPanel = document.getElementById('sidePopupPanel');
    if (popupPanel) {
      popupPanel.classList.add('hidden');
    }
  }

  // Airlock ingress sequence
  triggerAirlockIngress() {
    const airlockModal = document.getElementById('airlockModal');
    if (!airlockModal) {
      this.setScreen('base_nav');
      return;
    }

    sound.playAirlockCycle(3.0);
    airlockModal.classList.remove('hidden');

    const progressFill = document.getElementById('airlockProgressFill');
    const statusText = document.getElementById('airlockStatusText');
    const pressureText = document.getElementById('airlockPressureText');

    let step = 0;
    const stages = [
      { pct: 15, msg: 'EXTERIOR HATCH SEALED // CHECKING PERCHLORATE CONTAMINATION', pres: '0.62 kPa' },
      { pct: 40, msg: 'ELECTROSTATIC CLEANING ENGAGED // VACUUMING BASALT DUST', pres: '25.4 kPa' },
      { pct: 75, msg: 'PRESSURIZING CHAMBER // N2/O2 BUFFER GAS INJECTION', pres: '78.2 kPa' },
      { pct: 95, msg: 'PRESSURE EQUALIZED TO 101.3 kPa // ATMOSPHERE SAFE', pres: '101.3 kPa' },
      { pct: 100, msg: 'INNER BULKHEAD UNLOCKED // INGRESS AUTHORIZED', pres: '101.3 kPa' }
    ];

    const timer = setInterval(() => {
      if (step < stages.length) {
        const s = stages[step];
        if (progressFill) progressFill.style.width = `${s.pct}%`;
        if (statusText) statusText.textContent = s.msg;
        if (pressureText) pressureText.textContent = `CHAMBER: ${s.pres}`;
        sound.playBeep(800 + step * 150, 0.05);
        step++;
      } else {
        clearInterval(timer);
        sound.playSuccess();
        setTimeout(() => {
          airlockModal.classList.add('hidden');
          sound.startAmbientHum();
          this.setScreen('base_nav'); // Enter directly into the 3D first-person base!
        }, 500);
      }
    }, 500);

    // Optional click to fast-forward / skip countdown
    airlockModal.onclick = () => {
      clearInterval(timer);
      airlockModal.classList.add('hidden');
      sound.startAmbientHum();
      this.setScreen('base_nav');
    };
  }

  // Fault injection and repair handlers
  generateIssueForModule(moduleId, customDetails = null) {
    const mod = BASE_MODULES.find(m => m.id === moduleId);
    if (!mod) return null;

    if (customDetails) return customDetails;

    const failures = mod.possibleFailures;
    if (failures && failures.length > 0) {
      return failures[Math.floor(Math.random() * failures.length)];
    }
    return {
      id: `${moduleId}_generic_fault`,
      title: `${mod.name} Telemetry Variance`,
      severity: 'critical',
      description: 'Sensor loop telemetry variance exceeding safety tolerance by 35%. Manual recalibration required.',
      repairAction: 'Execute Diagnostics & Reset System Controller',
      targetParameter: mod.primaryParameter,
      penaltyRate: 1.0
    };
  }

  raiseIssue(moduleId, issue) {
    this.activeIssues.set(moduleId, issue);
    const issuesArray = Array.from(this.activeIssues.keys());
    if (this.interiorVis) this.interiorVis.setActiveIssues(issuesArray);
    if (this.threeRenderer) this.threeRenderer.setActiveIssues(issuesArray);

    sound.startAlarm();
    this.render();

    // If already in 3D base, open side popup for the malfunctioning module
    if (this.currentScreen === 'base_nav') {
      this.openSidePopup(moduleId);
    }
  }

  executeRepair(moduleId) {
    const issue = this.activeIssues.get(moduleId);
    if (!issue || this.repairInProgress) return;

    this.repairInProgress = true;
    sound.playBeep(900, 0.1);

    const repairBtn = document.getElementById('btnExecuteRepair');
    const repairStatus = document.getElementById('repairStatus');
    if (repairBtn) repairBtn.disabled = true;

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      if (repairStatus) {
        repairStatus.textContent = `REPAIR SEQUENCE IN PROGRESS: ${p}% // EXECUTING ${issue.repairAction.toUpperCase()}`;
      }
      sound.playBeep(600 + p * 8, 0.04);

      if (p >= 100) {
        clearInterval(interval);
        this.activeIssues.delete(moduleId);
        const issuesArray = Array.from(this.activeIssues.keys());
        if (this.interiorVis) this.interiorVis.setActiveIssues(issuesArray);
        if (this.threeRenderer) this.threeRenderer.setActiveIssues(issuesArray);
        
        if (this.activeIssues.size === 0) {
          sound.stopAlarm();
        }
        sound.playSuccess();

        // Emit cross-segment contract event: baseIssueFixed(locationId)
        contractBus.emit('baseIssueFixed', { locationId: moduleId, fixedAt: Date.now() });
        this.logEvent('EVENT_SENT', `baseIssueFixed: ${moduleId}`);

        this.repairInProgress = false;
        
        // Refresh open side popup
        const mod = BASE_MODULES.find(m => m.id === moduleId);
        const popupContent = document.getElementById('sidePopupContent');
        if (mod && popupContent) {
          this.renderModuleDetailsToContainer(mod, popupContent);
        }

        this.render();
      }
    }, 400);
  }

  // Mission launch and challenge dispatch
  launchChallenge() {
    sound.playSuccess();
    
    const randomChallenge = CHALLENGE_TYPES[Math.floor(Math.random() * CHALLENGE_TYPES.length)];
    this.assignedChallenge = randomChallenge;

    const payload = {
      siteId: this.currentSiteId,
      challengeType: randomChallenge.id,
      challengeTitle: randomChallenge.title,
      startingParameters: { ...this.baseParams },
      timestamp: Date.now()
    };

    contractBus.emit('challengeSelected', payload);
    this.logEvent('EVENT_SENT', `challengeSelected: site=${this.currentSiteId}, challenge=${randomChallenge.id}`);

    // Populate randomized challenge reveal box
    const revealBox = document.getElementById('randomChallengeRevealBox');
    if (revealBox) {
      revealBox.innerHTML = `
        <div class="reveal-badge">MISSION SCENARIO ENCRYPTED ALLOCATION</div>
        <h3 class="reveal-title">ASSIGNED CHALLENGE: ${randomChallenge.title.toUpperCase()}</h3>
        <div class="reveal-diff">DIFFICULTY: ${randomChallenge.difficulty.toUpperCase()}</div>
        <p class="reveal-brief">${randomChallenge.briefing}</p>
        <div class="reveal-hazards">
          <strong>ACTIVE HAZARD PROFILE:</strong>
          <ul>
            ${randomChallenge.hazardsFocus.map(h => `<li>${h}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    this.setScreen('mission_launched');
  }

  logEvent(source, text) {
    const time = new Date().toLocaleTimeString();
    this.eventLogs.unshift(`[${time}] [${source}] ${text}`);
    if (this.eventLogs.length > 25) this.eventLogs.pop();
    this.renderEventLogs();
  }

  renderEventLogs() {
    const logContainer = document.getElementById('eventLogStream');
    if (!logContainer) return;
    logContainer.innerHTML = this.eventLogs.map(l => `<div class="log-line">${l}</div>`).join('');
  }

  // --- DOM BINDINGS ---
  bindDOMEvents() {
    // Sound mute button
    const muteBtn = document.getElementById('btnMuteAudio');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = sound.toggleMute();
        muteBtn.textContent = isMuted ? '🔇 AUDIO: MUTED' : '🔊 AUDIO: ACTIVE';
        muteBtn.classList.toggle('muted', isMuted);
      });
    }

    // Site Selector in Dev/Simulation Bar
    const siteSelect = document.getElementById('devSiteSelect');
    if (siteSelect) {
      siteSelect.addEventListener('change', (e) => {
        this.setSite(e.target.value);
        this.logEvent('MANUAL', `Site changed to ${e.target.value}`);
      });
    }

    // Inject Hazard button
    const btnSimIssue = document.getElementById('btnSimulateIssue');
    if (btnSimIssue) {
      btnSimIssue.addEventListener('click', () => {
        const randomMod = BASE_MODULES[Math.floor(Math.random() * BASE_MODULES.length)].id;
        const issue = this.generateIssueForModule(randomMod);
        this.raiseIssue(randomMod, issue);
        this.logEvent('SIMULATION', `Triggered fault on ${randomMod}`);
      });
    }

    // Clear Issues button
    const btnClearIssues = document.getElementById('btnClearIssues');
    if (btnClearIssues) {
      btnClearIssues.addEventListener('click', () => {
        this.activeIssues.clear();
        if (this.interiorVis) this.interiorVis.setActiveIssues([]);
        if (this.threeRenderer) this.threeRenderer.setActiveIssues([]);
        sound.stopAlarm();
        this.render();
        this.logEvent('SIMULATION', 'Cleared all active base faults');
      });
    }

    // Close Side Popup Button
    const btnClosePopup = document.getElementById('btnCloseSidePopup');
    if (btnClosePopup) {
      btnClosePopup.addEventListener('click', () => {
        this.closeSidePopup();
      });
    }

    // Exit Fullscreen 3D Button
    const btnExit3D = document.getElementById('btnExitFullscreen3D');
    if (btnExit3D) {
      btnExit3D.addEventListener('click', () => {
        this.exitFullscreen3D();
      });
    }

    // Sol Briefing Button
    const btnOpenBriefing = document.getElementById('btnOpenBriefingModal');
    if (btnOpenBriefing) {
      btnOpenBriefing.addEventListener('click', () => {
        document.getElementById('morningBriefingModal')?.classList.remove('hidden');
      });
    }

    // Navigation Tabs & Action Buttons via global delegation
    document.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('[data-target-screen]');
      if (targetBtn) {
        const targetScreen = targetBtn.getAttribute('data-target-screen');
        if (targetScreen) {
          e.preventDefault();
          this.setScreen(targetScreen);
        }
      }
    });

    // Enter Base button
    const btnEnter = document.getElementById('btnEnterBase');
    if (btnEnter) {
      btnEnter.addEventListener('click', (e) => {
        e.preventDefault();
        this.triggerAirlockIngress();
      });
    }

    // Launch Simulation button
    const btnLaunch = document.getElementById('btnLaunchMission');
    if (btnLaunch) {
      btnLaunch.addEventListener('click', () => this.launchChallenge());
    }

    // Toggle 3D vs 2D View
    const btn3D = document.getElementById('btnView3D');
    const btn2D = document.getElementById('btnView2D');
    const threeWrap = document.getElementById('threeViewportContainer');
    const canvasWrap = document.getElementById('canvasBlueprintWrap');

    if (btn3D && btn2D) {
      btn3D.addEventListener('click', () => {
        this.activeViewMode = '3d';
        btn3D.classList.add('active');
        btn2D.classList.remove('active');
        if (threeWrap) threeWrap.style.display = 'block';
        if (canvasWrap) canvasWrap.style.display = 'none';
        if (this.threeRenderer) this.threeRenderer.onResize();
      });

      btn2D.addEventListener('click', () => {
        this.activeViewMode = '2d';
        btn2D.classList.add('active');
        btn3D.classList.remove('active');
        if (threeWrap) threeWrap.style.display = 'none';
        if (canvasWrap) canvasWrap.style.display = 'block';
        if (this.interiorVis) this.interiorVis.resize();
      });
    }
  }

  render() {
    const site = LANDING_SITES[this.currentSiteId];

    // Update Header
    const siteNameEl = document.getElementById('headerSiteName');
    if (siteNameEl) siteNameEl.textContent = site.name;

    const siteCoordsEl = document.getElementById('headerCoordinates');
    if (siteCoordsEl) siteCoordsEl.textContent = site.coordinates;

    const siteTempEl = document.getElementById('headerSurfaceTemp');
    if (siteTempEl) siteTempEl.textContent = site.surfaceTemp;

    const siteAtmEl = document.getElementById('headerAtmosphere');
    if (siteAtmEl) siteAtmEl.textContent = site.atmosphereDensity;

    // Update Screen Visibility
    const screens = ['base_entry', 'base_info', 'base_nav', 'challenge_select', 'mission_launched', 'game_engine'];
    for (const sc of screens) {
      const el = document.getElementById(`screen_${sc}`);
      if (el) el.classList.toggle('active-screen', this.currentScreen === sc);
    }

    // Update Nav Tab highlights
    document.querySelectorAll('[data-target-screen]').forEach(tab => {
      const sc = tab.getAttribute('data-target-screen');
      tab.classList.toggle('active-tab', this.currentScreen === sc);
    });

    // Update Dev Site Selector value
    const siteSelect = document.getElementById('devSiteSelect');
    if (siteSelect) siteSelect.value = this.currentSiteId;

    // Render Components for current screen
    this.renderBaseParametersHUD();
    this.renderModuleList();
    this.renderModuleDetails();
    this.renderChallengeList();
    this.renderAlarmBanner();
  }

  // Base resource parameters HUD
  renderBaseParametersHUD() {
    const params = [
      { key: 'oxygen', label: 'Oxygen', icon: '💨', color: '#06b6d4', unit: '%', desc: 'Breathable Supply' },
      { key: 'food', label: 'Food', icon: '🌱', color: '#22c55e', unit: '%', desc: 'Caloric Stock' },
      { key: 'water', label: 'Water', icon: '💧', color: '#3b82f6', unit: '%', desc: 'H2O Reserves' },
      { key: 'power', label: 'Power', icon: '⚡', color: '#eab308', unit: '%', desc: 'Microgrid Energy' }
    ];

    const container = document.getElementById('baseParametersHUD');
    if (container) {
      container.innerHTML = params.map(p => {
        const val = this.baseParams[p.key];
        let statusColor = p.color;
        let statusText = 'NOMINAL';
        if (val < 40) {
          statusColor = '#ef4444';
          statusText = 'CRITICAL';
        } else if (val < 65) {
          statusColor = '#f59e0b';
          statusText = 'DEFICIT';
        }

        return `
          <div class="param-card" style="border-top: 3px solid ${p.color};">
            <div class="param-header">
              <span class="param-icon">${p.icon}</span>
              <span class="param-name">${p.label.toUpperCase()}</span>
              <span class="param-status" style="color: ${statusColor};">${statusText}</span>
            </div>
            <div class="param-value-row">
              <span class="param-value" style="color: ${p.color};">${val}${p.unit}</span>
              <span class="param-desc">${p.desc}</span>
            </div>
            <div class="param-bar-bg">
              <div class="param-bar-fill" style="width: ${val}%; background-color: ${p.color};"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Mini Parameter HUD overlay on top-left of the 3D viewport
    const miniOxy = document.querySelector('#miniHudOxygen .mini-val');
    if (miniOxy) miniOxy.textContent = `${this.baseParams.oxygen}%`;
    const miniFood = document.querySelector('#miniHudFood .mini-val');
    if (miniFood) miniFood.textContent = `${this.baseParams.food}%`;
    const miniWater = document.querySelector('#miniHudWater .mini-val');
    if (miniWater) miniWater.textContent = `${this.baseParams.water}%`;
    const miniPower = document.querySelector('#miniHudPower .mini-val');
    if (miniPower) miniPower.textContent = `${this.baseParams.power}%`;

    // Detailed breakdown on the Base Info screen
    const infoContainer = document.getElementById('baseInfoDetailedHUD');
    if (infoContainer) {
      infoContainer.innerHTML = params.map(p => {
        const val = this.baseParams[p.key];
        return `
          <div class="info-param-detail-card">
            <div class="info-param-top">
              <span class="info-param-title">${p.icon} ${p.label}</span>
              <span class="info-param-pct" style="color: ${p.color};">${val}%</span>
            </div>
            <div class="param-bar-bg">
              <div class="param-bar-fill" style="width: ${val}%; background-color: ${p.color};"></div>
            </div>
            <div class="info-param-meta">
              <span>Site Calibrated Baseline: <strong>${val}%</strong></span>
              <span>Primary Subsystem: <strong>${p.desc}</strong></span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Module navigation & diagnostics
  renderModuleList() {
    const listEl = document.getElementById('moduleNavList');
    if (!listEl) return;

    listEl.innerHTML = BASE_MODULES.map(mod => {
      const hasIssue = this.activeIssues.has(mod.id);
      const isSelected = this.selectedModuleId === mod.id;

      return `
        <div class="module-nav-item ${isSelected ? 'selected' : ''} ${hasIssue ? 'has-issue' : ''}" 
             data-module-id="${mod.id}">
          <div class="module-nav-item-top">
            <span class="module-nav-code">${mod.code}</span>
            ${hasIssue ? '<span class="badge-alert">ALERT</span>' : '<span class="badge-nominal">NOMINAL</span>'}
          </div>
          <div class="module-nav-title">${mod.name}</div>
          <div class="module-nav-param">Affiliated: <strong>${mod.primaryParameter.toUpperCase()}</strong></div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.module-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-module-id');
        this.selectModule(id);
      });
    });
  }

  renderModuleDetails() {
    const mod = BASE_MODULES.find(m => m.id === this.selectedModuleId);
    if (!mod) return;

    const detailsEl = document.getElementById('moduleInspectorContent');
    if (detailsEl) {
      this.renderModuleDetailsToContainer(mod, detailsEl);
    }
  }

  renderModuleDetailsToContainer(mod, container) {
    const issue = this.activeIssues.get(mod.id);

    let repairSectionHtml = '';
    if (issue) {
      repairSectionHtml = `
        <div class="emergency-repair-panel">
          <div class="repair-header">
            <span class="repair-alert-icon">⚠️</span>
            <div class="repair-title-wrap">
              <h4>ACTIVE MALFUNCTION: ${issue.title.toUpperCase()}</h4>
              <p>${issue.description}</p>
            </div>
          </div>
          <div class="repair-action-box">
            <div class="repair-target">TARGET SYSTEM: <strong>${issue.targetParameter.toUpperCase()}</strong></div>
            <div id="repairStatus" class="repair-status-text">SYSTEM STANDBY // READY FOR INTERVENTION</div>
            <button id="btnExecuteRepair" class="btn-repair-execute">
              🔧 REPAIR & RESTORE: ${issue.repairAction.toUpperCase()}
            </button>
          </div>
        </div>
      `;
    }

    const componentsHtml = mod.components.map(comp => `
      <div class="component-card">
        <div class="comp-top">
          <span class="comp-tag">${comp.tag}</span>
          <span class="comp-health">INTEGRITY: ${comp.health}%</span>
        </div>
        <div class="comp-name">${comp.name}</div>
        <div class="comp-type">${comp.type}</div>
        <div class="comp-specs">${comp.specs}</div>
        <div class="comp-desc">${comp.description}</div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="module-detail-header">
        <div class="mod-meta">
          <span class="mod-code-pill">${mod.code}</span>
          <span class="mod-cat-pill">${mod.category}</span>
        </div>
        <h3 class="mod-title">${mod.name}</h3>
        <p class="mod-summary">${mod.summary}</p>
      </div>

      ${repairSectionHtml}

      <div class="components-section">
        <h4 class="section-subheading">REAL-WORLD NASA SUBSYSTEMS & HARDWARE:</h4>
        <div class="components-grid">
          ${componentsHtml}
        </div>
      </div>
    `;

    // Bind repair button if present
    const repairBtn = container.querySelector('#btnExecuteRepair');
    if (repairBtn) {
      repairBtn.addEventListener('click', () => this.executeRepair(mod.id));
    }
  }

  // Mission challenges briefing list
  renderChallengeList() {
    const listEl = document.getElementById('challengeListGrid');
    if (!listEl) return;

    listEl.innerHTML = CHALLENGE_TYPES.map(ch => {
      return `
        <div class="challenge-card descriptive-only" data-challenge-id="${ch.id}">
          <div class="challenge-top">
            <span class="challenge-badge">${ch.badge}</span>
            <span class="challenge-diff diff-${ch.difficulty.toLowerCase()}">${ch.difficulty.toUpperCase()}</span>
          </div>
          <h3 class="challenge-title">${ch.title}</h3>
          <div class="challenge-tag">${ch.tag}</div>
          <p class="challenge-brief">${ch.briefing}</p>

          <div class="challenge-hazards-block">
            <strong>HAZARD PROFILE:</strong>
            <ul>
              ${ch.hazardsFocus.map(h => `<li>${h}</li>`).join('')}
            </ul>
          </div>

          <div class="challenge-strategy">
            <strong>RECOMMENDED SURVIVAL STRATEGY:</strong> ${ch.recommendedStrategy}
          </div>
        </div>
      `;
    }).join('');
  }

  renderAlarmBanner() {
    const banner = document.getElementById('globalAlarmBanner');
    if (!banner) return;

    if (this.activeIssues.size > 0) {
      banner.classList.remove('hidden');
      const count = this.activeIssues.size;
      const names = Array.from(this.activeIssues.keys()).map(id => {
        const m = BASE_MODULES.find(mod => mod.id === id);
        return m ? m.name : id;
      }).join(', ');
      banner.innerHTML = `
        <div class="alarm-banner-content">
          <span class="alarm-siren">🚨</span>
          <span><strong>BASE EMERGENCY DETECTED:</strong> ${count} active malfunction(s) in [${names}]. Walk to the module in 3D view or inspect terminal to repair!</span>
          <button id="btnAlarmJumpNav" class="btn-alarm-jump">OPEN 3D BASE</button>
        </div>
      `;
      const jumpBtn = document.getElementById('btnAlarmJumpNav');
      if (jumpBtn) {
        jumpBtn.addEventListener('click', () => {
          this.setScreen('base_nav');
        });
      }
    } else {
      banner.classList.add('hidden');
    }
  }
}

// Auto-instantiate upon DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.jamnSegment3App = new Segment3App();
  window.jamnSegment3App.init();
});
