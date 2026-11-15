// ============================================================================
// JAMN GAME – MARS SURVIVAL MISSION TRAINER (MILESTONE 2)
// File: main.js
// Purpose: Mission stage state machine, UI/HUD synchronization, NASA image
//          loader with procedural fallback canvas, EDL sequence timer,
//          surface EVA environmental monitoring, and habitat resource manager.
// ============================================================================

window.JAMN_MAIN = (function () {
  // Ordered Mission Stages
  const STAGE_ORDER = [
    "TITLE",
    "COCKPIT",
    "ORBIT",
    "SITE_ANALYSIS",
    "DESCENT",
    "SURFACE",
    "HABITAT"
  ];

  const state = {
    currentStage: "TITLE",
    selectedSiteId: "olympus_mons",
    confirmedSiteId: null,
    lowSpecMode: false,
    audioMuted: false,

    // Stage 1: Spacecraft Cockpit Journey Telemetry
    cockpitProgress: 0.0,
    cockpitWarp: false,
    cockpitTimer: null,

    // Stage 4: Descent & Landing Sequence
    edlTimer: null,
    edlProgress: 0.0, // 0 to 100
    edlStageIndex: 0,
    edlPaused: false,

    // Stage 5: Astronaut Surface Exploration & Suit Telemetry
    surfaceTimer: null,
    suitO2: 98.4,
    suitBattery: 96.0,
    suitWater: 100.0,
    samplesCollected: 0,
    commsLog: [
      "[SOL 1 - 08:00] Touchdown confirmed. Spacecraft structural integrity nominal.",
      "[SOL 1 - 08:02] EVA Spacesuit pressurized to 29.6 kPa pure O₂. Helmet HUD online.",
      "[SOL 1 - 08:04] Objective: Explore local Martian regolith and proceed North to Outpost Ares-1 Airlock."
    ],

    // Stage 6: Mars Habitat & Survival Mission State
    survivalMissionStarted: false,
    solCount: 1,
    habPower: 92,
    habOxygen: 96,
    habWater: 88,
    habFood: 94,
    habTemp: 21.5,
    dustFactor: 12,
    habLog: [
      "[HAB-CTRL] Pressurized airlock cycle complete. Welcome to Outpost Ares-1.",
      "[HAB-CTRL] MOXIE atmospheric CO₂-to-O₂ electrolysis running at 98% efficiency."
    ]
  };

  function init() {
    window.JAMN_SCENE.init("webgl-container");
    populateBaselineModal();
    renderOrbitSiteButtons();
    updateUIForStage("TITLE");

    // Start background telemetry updater for Surface stage
    state.surfaceTimer = setInterval(tickSurfaceTelemetry, 500);
  }

  function clearActiveIntervals() {
    if (state.cockpitTimer) {
      clearInterval(state.cockpitTimer);
      state.cockpitTimer = null;
    }
    if (state.edlTimer) {
      clearInterval(state.edlTimer);
      state.edlTimer = null;
    }
  }

  function showToast(msg) {
    const toast = document.getElementById("stage-toast");
    const text = document.getElementById("stage-toast-text");
    if (!toast || !text) return;
    text.textContent = msg;
    toast.classList.remove("opacity-0", "translate-y-2");
    toast.classList.add("opacity-100", "translate-y-0");
    setTimeout(() => {
      toast.classList.remove("opacity-100", "translate-y-0");
      toast.classList.add("opacity-0", "translate-y-2");
    }, 2800);
  }

  // --------------------------------------------------------------------------
  // Stage Navigation & Transitions
  // --------------------------------------------------------------------------
  function goToStage(stageName) {
    if (!STAGE_ORDER.includes(stageName)) return;
    clearActiveIntervals();
    state.currentStage = stageName;

    window.JAMN_SCENE.setStage(stageName, state.selectedSiteId);
    updateUIForStage(stageName);

    if (stageName === "COCKPIT") {
      startCockpitJourney();
      showToast("STAGE 1 // TRANS-MARS INJECTION & COCKPIT APPROACH");
    } else if (stageName === "ORBIT") {
      showToast("STAGE 2 // MARS ORBITAL INSERTION COMPLETE – SELECT LANDING SITE");
    } else if (stageName === "SITE_ANALYSIS") {
      renderSiteAnalysisPanel(state.selectedSiteId);
      showToast("STAGE 3 // LANDING SITE ENVIRONMENTAL & RISK ANALYSIS");
    } else if (stageName === "DESCENT") {
      startDescentSequence();
      showToast("STAGE 4 // ENTRY, DESCENT & LANDING (EDL) SEQUENCE INITIATED");
    } else if (stageName === "SURFACE") {
      populateSurfaceEnvironmentHUD();
      showToast("STAGE 5 // SURFACE EVA – WALK TO MARS HABITAT AIRLOCK");
    } else if (stageName === "HABITAT") {
      updateHabitatUI();
      showToast("STAGE 6 // ENTERED MARS HABITAT – SURVIVAL OPERATIONS");
    }
  }

  function stepStage(delta) {
    const idx = STAGE_ORDER.indexOf(state.currentStage);
    const nextIdx = Math.max(0, Math.min(STAGE_ORDER.length - 1, idx + delta));
    if (nextIdx !== idx) {
      goToStage(STAGE_ORDER[nextIdx]);
    }
  }

  function updateUIForStage(stageName) {
    // Toggle Stage Views
    const viewIds = {
      TITLE: "view-title",
      COCKPIT: "view-cockpit",
      ORBIT: "view-orbit",
      SITE_ANALYSIS: "view-site-analysis",
      DESCENT: "view-descent",
      SURFACE: "view-surface",
      HABITAT: "view-habitat"
    };

    Object.keys(viewIds).forEach((k) => {
      const el = document.getElementById(viewIds[k]);
      if (el) {
        if (k === stageName) {
          el.classList.remove("hidden");
        } else {
          el.classList.add("hidden");
        }
      }
    });

    // Top Navigation Bar visibility
    const topNav = document.getElementById("top-mission-bar");
    if (topNav) {
      if (stageName === "TITLE") {
        topNav.classList.add("hidden");
      } else {
        topNav.classList.remove("hidden");
      }
    }

    // Update Stage Breadcrumb Pills
    STAGE_ORDER.forEach((st) => {
      const pill = document.getElementById("nav-pill-" + st);
      if (pill) {
        if (st === stageName) {
          pill.className =
            "px-2.5 py-1 rounded text-xs font-semibold bg-orange-600 text-white border border-orange-400 cursor-pointer";
        } else {
          pill.className =
            "px-2.5 py-1 rounded text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-orange-500/60 cursor-pointer";
        }
      }
    });

    // Helmet & Cockpit Overlays
    const helmetOverlay = document.getElementById("helmet-visor-overlay");
    if (helmetOverlay) {
      const showVisor =
        stageName === "SURFACE" &&
        window.JAMN_SCENE.getSurfaceCameraMode() === "FIRST_PERSON";
      helmetOverlay.style.opacity = showVisor ? "1" : "0";
    }

    const cockpitOverlay = document.getElementById("cockpit-frame-overlay");
    if (cockpitOverlay) {
      cockpitOverlay.classList.toggle("hidden", stageName !== "COCKPIT");
    }
  }

  // --------------------------------------------------------------------------
  // Stage 1: Spacecraft Cockpit & Journey Towards Mars (Requirement #3)
  // --------------------------------------------------------------------------
  function startCockpitJourney() {
    state.cockpitProgress = 0.0;
    state.cockpitWarp = false;
    updateCockpitTelemetryDOM();

    state.cockpitTimer = setInterval(() => {
      const step = state.cockpitWarp ? 0.026 : 0.007;
      state.cockpitProgress = Math.min(1.0, state.cockpitProgress + step);
      window.JAMN_SCENE.setCockpitProgress(state.cockpitProgress, state.cockpitWarp);
      updateCockpitTelemetryDOM();

      if (state.cockpitProgress >= 1.0) {
        clearInterval(state.cockpitTimer);
        state.cockpitTimer = null;
      }
    }, 80);
  }

  function toggleCockpitWarp() {
    state.cockpitWarp = !state.cockpitWarp;
    window.JAMN_SCENE.playTone(state.cockpitWarp ? 740 : 420, "sawtooth", 0.15, 0.05);
    const btn = document.getElementById("btn-cockpit-warp");
    if (btn) {
      btn.textContent = state.cockpitWarp
        ? "THRUST BOOST: ACTIVE (3.5x)"
        : "ENGAGE APPROACH THRUST BOOST";
    }
  }

  function updateCockpitTelemetryDOM() {
    const pct = Math.round(state.cockpitProgress * 100);
    const distKm = Math.max(420, Math.round((1 - state.cockpitProgress) * 48500 + 420));
    const speedKms = (21.4 - state.cockpitProgress * 17.8 + (state.cockpitWarp ? 1.2 : 0)).toFixed(2);

    const elDist = document.getElementById("cockpit-dist");
    const elSpeed = document.getElementById("cockpit-speed");
    const elBar = document.getElementById("cockpit-progress-bar");
    const elStatus = document.getElementById("cockpit-status-text");
    const btnOrbit = document.getElementById("btn-enter-orbit");

    if (elDist) elDist.textContent = distKm.toLocaleString() + " km";
    if (elSpeed) elSpeed.textContent = speedKms + " km/s";
    if (elBar) elBar.style.width = pct + "%";

    if (elStatus) {
      if (pct < 35) {
        elStatus.textContent = "DEEP SPACE APPROACH // OPTICAL NAVIGATION LOCK ON MARS";
      } else if (pct < 75) {
        elStatus.textContent = "MARS GRAVITY WELL CAPTURE // ATMOSPHERIC LIMB VISIBLE";
      } else if (pct < 100) {
        elStatus.textContent = "DECELERATION BURN // PREPARING FOR ORBITAL INSERTION";
      } else {
        elStatus.textContent = "ORBITAL INSERTION WINDOW REACHED // READY TO ENTER ORBIT";
      }
    }

    if (btnOrbit) {
      if (pct >= 100) {
        btnOrbit.classList.add("animate-pulse");
      } else {
        btnOrbit.classList.remove("animate-pulse");
      }
    }
  }

  // --------------------------------------------------------------------------
  // Stage 2 & 3: Mars Orbital Exploration & 4 Landing Locations (Req #4, #5, #6)
  // --------------------------------------------------------------------------
  function renderOrbitSiteButtons() {
    const listContainer = document.getElementById("orbit-site-list");
    if (!listContainer) return;

    const sites = window.JAMN_DATA.landingSites;
    listContainer.innerHTML = "";
    const siteKeys = ["olympus_mons", "polar_ice_caps", "valles_marineris", "hellas_basin"];

    siteKeys.forEach((key) => {
      const site = sites[key];
      if (!site) return;
      const card = document.createElement("button");
      card.type = "button";
      card.id = "orbit-card-" + site.id;
      card.className =
        "w-full text-left p-3 rounded-lg border transition-all duration-150 bg-slate-900/80 border-slate-700/80 hover:border-orange-500/80 group";
      card.addEventListener("click", () => selectLandingSite(site.id));

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-mono text-orange-400">${site.code}</span>
          <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            RISK: ${site.difficulty}
          </span>
        </div>
        <div class="text-sm font-bold text-white mt-0.5 group-hover:text-orange-300">${site.name}</div>
        <div class="text-xs text-slate-400 mt-0.5">${site.coordsDisplay} • Elev: ${site.elevationDisplay.split(" ")[0]}</div>
      `;
      listContainer.appendChild(card);
    });
  }

  function selectLandingSite(siteId) {
    if (!window.JAMN_DATA.landingSites[siteId]) return;
    state.selectedSiteId = siteId;
    window.JAMN_SCENE.focusOnSite(siteId);

    const site = window.JAMN_DATA.landingSites[siteId];
    if (site && site.startingParameters) {
      state.habOxygen = site.startingParameters.oxygen;
      state.habFood = site.startingParameters.food;
      state.habWater = site.startingParameters.water;
      state.habPower = site.startingParameters.power;
    }

    const mappedSiteId = (siteId === 'polar_ice_caps') ? 'north_polar' : siteId;
    if (window.contractBus) {
      window.contractBus.emit('siteSelected', mappedSiteId);
    }
    if (window.jamnSegment3App) {
      window.jamnSegment3App.setSite(mappedSiteId);
    }

    const siteKeys = ["olympus_mons", "polar_ice_caps", "valles_marineris", "hellas_basin"];
    siteKeys.forEach((k) => {
      const el = document.getElementById("orbit-card-" + k);
      if (el) {
        if (k === siteId || (k === 'polar_ice_caps' && siteId === 'north_polar')) {
          el.className =
            "w-full text-left p-3 rounded-lg border transition-all duration-150 bg-orange-950/45 border-orange-500 shadow-lg";
        } else {
          el.className =
            "w-full text-left p-3 rounded-lg border transition-all duration-150 bg-slate-900/80 border-slate-700/80 hover:border-orange-500/80 group";
        }
      }
    });

    // Open Site Analysis Panel smoothly
    goToStage("SITE_ANALYSIS");
  }

  // Fallback Procedural Scientific Topo Map if user is offline or NASA image fails
  function renderFallbackSiteImage(site, imgEl, statusEl) {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 380;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, 640, 380);
    grad.addColorStop(0, "#3b170b");
    grad.addColorStop(0.5, "#8a3619");
    grad.addColorStop(1, "#1e0c06");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 380);

    // Topographic contour rings
    ctx.strokeStyle = "rgba(251, 146, 60, 0.35)";
    ctx.lineWidth = 1.5;
    for (let r = 20; r < 260; r += 26) {
      ctx.beginPath();
      ctx.ellipse(320, 190, r * 1.35, r * 0.85, 0.15, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Grid overlay
    ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
    for (let x = 0; x < 640; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 380);
      ctx.stroke();
    }
    for (let y = 0; y < 380; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 18px Inter, monospace";
    ctx.fillText("OFFLINE PROCEDURAL MOLA TOPOGRAPHY // " + site.name.toUpperCase(), 24, 42);
    ctx.fillStyle = "#fdba74";
    ctx.font = "13px monospace";
    ctx.fillText("COORDINATES: " + site.coordsDisplay + " | ELEVATION: " + site.elevationDisplay, 24, 68);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText("External NASA server unreachable offline – displaying fallback radar telemetry chart.", 24, 352);

    imgEl.src = canvas.toDataURL("image/png");
    if (statusEl) {
      statusEl.textContent = "OFFLINE FALLBACK RADAR MAP ACTIVE (NASA source link verified below)";
      statusEl.className = "text-[11px] font-mono text-amber-400";
    }
  }

  function renderSiteAnalysisPanel(siteId) {
    const site = window.JAMN_DATA.landingSites[siteId];
    if (!site) return;

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setText("site-code", site.code);
    setText("site-title", site.name);
    setText("site-subtitle", site.subtitle);
    setText("site-coords", site.coordsDisplay);
    setText("site-elevation", site.elevationDisplay);
    setText("site-temp", site.localTemp);
    setText("site-pressure", site.localPressure);
    setText("site-summary", site.scientificSummary);
    setText("site-terrain", site.slopeDescription);
    setText("site-atmosphere", site.atmosphericConditions);
    setText("site-risks", site.landingRisks);
    setText("site-advantages", site.missionAdvantages);
    setText("site-image-credit", site.imageCredit);

    const linkPrimary = document.getElementById("site-source-link");
    if (linkPrimary) linkPrimary.href = site.sourceUrl;

    const linkSecondary = document.getElementById("site-secondary-link");
    if (linkSecondary) linkSecondary.href = site.secondarySourceUrl;

    // Load Official NASA Image with Verified Fallback Handler
    const imgEl = document.getElementById("site-nasa-img");
    const statusEl = document.getElementById("site-img-status");
    if (imgEl) {
      if (statusEl) {
        statusEl.textContent = "LOADING OFFICIAL NASA RECONNAISSANCE IMAGERY...";
        statusEl.className = "text-[11px] font-mono text-sky-400";
      }
      imgEl.onload = function () {
        if (imgEl.src.startsWith("http") && statusEl) {
          statusEl.textContent = "VERIFIED NASA / JPL ORBITAL IMAGERY LOADED";
          statusEl.className = "text-[11px] font-mono text-emerald-400";
        }
      };
      imgEl.onerror = function () {
        imgEl.onerror = null;
        renderFallbackSiteImage(site, imgEl, statusEl);
      };
      imgEl.src = site.imageUrl;
    }

    // Highlight quick switcher buttons inside Site Analysis
    Object.keys(window.JAMN_DATA.landingSites).forEach((k) => {
      const btn = document.getElementById("analysis-switch-" + k);
      if (btn) {
        btn.className =
          k === siteId
            ? "btn-secondary active-btn text-xs py-1 px-2.5"
            : "btn-secondary text-xs py-1 px-2.5";
      }
    });
  }

  function confirmLandingSite() {
    state.confirmedSiteId = state.selectedSiteId;
    const mappedSiteId = (state.selectedSiteId === 'polar_ice_caps') ? 'north_polar' : state.selectedSiteId;
    if (window.contractBus) {
      window.contractBus.emit('siteSelected', mappedSiteId);
    }
    if (window.jamnSegment3App) {
      window.jamnSegment3App.setSite(mappedSiteId);
    }
    const site = window.JAMN_DATA.landingSites[state.selectedSiteId];
    if (site && site.startingParameters) {
      state.habOxygen = site.startingParameters.oxygen;
      state.habFood = site.startingParameters.food;
      state.habWater = site.startingParameters.water;
      state.habPower = site.startingParameters.power;
    }
    goToStage("DESCENT");
  }

  function enterHabitatAirlock() {
    const chosenSite = state.confirmedSiteId || state.selectedSiteId || 'valles_marineris';
    const mappedSiteId = (chosenSite === 'polar_ice_caps') ? 'north_polar' : chosenSite;

    if (window.contractBus) {
      window.contractBus.emit('siteSelected', mappedSiteId);
    }

    if (typeof window.transitionToSegment3 === 'function') {
      window.transitionToSegment3(mappedSiteId);
    } else if (window.jamnSegment3App) {
      window.jamnSegment3App.setSite(mappedSiteId);
      window.jamnSegment3App.setScreen('base_entry');
      window.jamnSegment3App.triggerAirlockIngress();
    } else {
      goToStage('HABITAT');
    }
  }

  // --------------------------------------------------------------------------
  // Stage 4: Spacecraft Descent & Landing Sequence (Requirement #7)
  // --------------------------------------------------------------------------
  function startDescentSequence() {
    const site = window.JAMN_DATA.landingSites[state.selectedSiteId];
    state.edlProgress = 0;
    state.edlStageIndex = 0;
    state.edlPaused = false;

    const siteBanner = document.getElementById("edl-target-name");
    const siteNote = document.getElementById("edl-site-note");
    const btnProceedSurface = document.getElementById("btn-deploy-astronaut");

    if (siteBanner && site) siteBanner.textContent = site.name.toUpperCase() + " (" + site.coordsDisplay + ")";
    if (siteNote && site) siteNote.textContent = site.edlNote;
    if (btnProceedSurface) btnProceedSurface.disabled = true;

    renderEdlChecklist(0);
    updateDescentTelemetryDOM();

    state.edlTimer = setInterval(() => {
      if (state.edlPaused) return;
      state.edlProgress = Math.min(100, state.edlProgress + 0.9);

      const stages = window.JAMN_DATA.edlStages;
      const newIdx = Math.min(
        stages.length - 1,
        Math.floor((state.edlProgress / 100) * (stages.length - 1))
      );

      if (newIdx !== state.edlStageIndex) {
        state.edlStageIndex = newIdx;
        window.JAMN_SCENE.playTone(320 + newIdx * 45, "triangle", 0.12, 0.05);
        renderEdlChecklist(newIdx);
      }

      const ratio = 1.0 - state.edlProgress / 100;
      window.JAMN_SCENE.setDescentProgress(
        ratio,
        state.edlStageIndex,
        site ? site.parachuteSupported : true
      );
      updateDescentTelemetryDOM();

      if (state.edlProgress >= 100) {
        clearInterval(state.edlTimer);
        state.edlTimer = null;
        if (btnProceedSurface) {
          btnProceedSurface.disabled = false;
          btnProceedSurface.classList.add("animate-pulse");
        }
        showToast("TOUCHDOWN CONFIRMED ON MARS // READY FOR FIRST-PERSON EVA");
      }
    }, 90);
  }

  function renderEdlChecklist(activeIndex) {
    const container = document.getElementById("edl-stage-list");
    if (!container) return;
    const site = window.JAMN_DATA.landingSites[state.selectedSiteId];
    const stages = window.JAMN_DATA.edlStages;

    container.innerHTML = "";
    stages.forEach((st, idx) => {
      const isDone = idx < activeIndex || state.edlProgress >= 100;
      const isCurrent = idx === activeIndex && state.edlProgress < 100;

      let label = st.name;
      if (idx === 4 && site && !site.parachuteSupported) {
        label = "HIGH-ALTITUDE SUPERSONIC RETRO-DECEL (NO CHUTE)";
      }

      const row = document.createElement("div");
      row.className = isCurrent
        ? "flex items-center justify-between px-2.5 py-1.5 rounded bg-orange-950/60 border border-orange-500 text-xs font-semibold text-white"
        : isDone
        ? "flex items-center justify-between px-2.5 py-1 rounded bg-slate-900/50 text-xs text-emerald-400"
        : "flex items-center justify-between px-2.5 py-1 rounded text-xs text-slate-500";

      row.innerHTML = `
        <span>${idx + 1}. ${label}</span>
        <span class="font-mono text-[10px]">${isDone ? "COMPLETE" : isCurrent ? "ACTIVE" : "STANDBY"}</span>
      `;
      container.appendChild(row);
    });
  }

  function updateDescentTelemetryDOM() {
    const stages = window.JAMN_DATA.edlStages;
    const current = stages[state.edlStageIndex] || stages[0];
    const next = stages[Math.min(stages.length - 1, state.edlStageIndex + 1)];
    const localFrac = ((state.edlProgress / 100) * (stages.length - 1)) % 1;

    const alt = Math.max(
      0,
      current.altitudeKm + (next.altitudeKm - current.altitudeKm) * localFrac
    );
    const spd = Math.max(
      0,
      Math.round(current.speedMs + (next.speedMs - current.speedMs) * localFrac)
    );

    const setEl = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };

    setEl("edl-altitude", alt.toFixed(2) + " km");
    setEl("edl-speed", spd.toLocaleString() + " m/s");
    setEl("edl-heat", current.heatFlux);
    setEl("edl-gload", current.gLoad);
    setEl("edl-status-msg", current.status);

    const bar = document.getElementById("edl-progress-bar");
    if (bar) bar.style.width = Math.round(state.edlProgress) + "%";
  }

  function skipToTouchdown() {
    state.edlProgress = 100;
    state.edlStageIndex = window.JAMN_DATA.edlStages.length - 1;
    const site = window.JAMN_DATA.landingSites[state.selectedSiteId];
    window.JAMN_SCENE.setDescentProgress(0, state.edlStageIndex, site ? site.parachuteSupported : true);
    renderEdlChecklist(state.edlStageIndex);
    updateDescentTelemetryDOM();
    if (state.edlTimer) {
      clearInterval(state.edlTimer);
      state.edlTimer = null;
    }
    const btnProceedSurface = document.getElementById("btn-deploy-astronaut");
    if (btnProceedSurface) {
      btnProceedSurface.disabled = false;
      btnProceedSurface.classList.add("animate-pulse");
    }
  }

  // --------------------------------------------------------------------------
  // Stage 5: First-Person / 3D Astronaut Experience & Mars Env Monitoring (#8, #9)
  // --------------------------------------------------------------------------
  function populateSurfaceEnvironmentHUD() {
    const site = window.JAMN_DATA.landingSites[state.selectedSiteId];
    const ref = window.JAMN_DATA.referenceMars;
    if (!site) return;

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl("env-site-name", site.name);
    setEl("env-temp", site.localTemp.split(" ")[0] + " °C (Ref Mean: " + ref.meanTemp + ")");
    setEl("env-pressure", site.localPressure.split("(")[0].trim() + " (Ref: " + ref.meanPressure.split("(")[0].trim() + ")");
    setEl("env-comp", ref.atmosphere);
    setEl("env-gravity", ref.gravity);
    setEl("env-radiation", ref.solarRadiation);
    setEl("env-dust", site.dustCondition);
    setEl("env-water", site.waterAvailability);

    // Load NASA Perseverance surface reference thumbnail
    const refImg = document.getElementById("surface-nasa-ref-img");
    if (refImg) {
      refImg.onerror = function () {
        refImg.style.display = "none";
      };
      refImg.src = window.JAMN_DATA.surfaceReferencePhoto.url;
    }

    renderCommsLog();
  }

  function toggleAstronautPov(mode) {
    window.JAMN_SCENE.setSurfaceCameraMode(mode);
    const current = window.JAMN_SCENE.getSurfaceCameraMode();

    const btnFirst = document.getElementById("btn-pov-first");
    const btnThird = document.getElementById("btn-pov-third");
    const helmetOverlay = document.getElementById("helmet-visor-overlay");

    if (btnFirst) {
      btnFirst.className =
        current === "FIRST_PERSON"
          ? "btn-secondary active-btn text-xs py-1.5 px-3"
          : "btn-secondary text-xs py-1.5 px-3";
    }
    if (btnThird) {
      btnThird.className =
        current === "THIRD_PERSON"
          ? "btn-secondary active-btn text-xs py-1.5 px-3"
          : "btn-secondary text-xs py-1.5 px-3";
    }
    if (helmetOverlay && state.currentStage === "SURFACE") {
      helmetOverlay.style.opacity = current === "FIRST_PERSON" ? "1" : "0";
    }
  }

  function collectRegolithSample() {
    state.samplesCollected += 1;
    window.JAMN_SCENE.playTone(780, "sine", 0.18, 0.06);
    const site = window.JAMN_DATA.landingSites[state.selectedSiteId];
    state.commsLog.unshift(
      `[EVA SAMPLE #${state.samplesCollected}] Core sample sealed at ${site.name} (${site.coordsDisplay}).`
    );
    renderCommsLog();
    showToast(`GEOLOGICAL SAMPLE #${state.samplesCollected} LOGGED & SEALED`);
  }

  function renderCommsLog() {
    const box = document.getElementById("surface-comms-log");
    if (!box) return;
    box.innerHTML = state.commsLog
      .slice(0, 6)
      .map((line) => `<div class="py-0.5 border-b border-slate-800/80">${line}</div>`)
      .join("");
  }

  function tickSurfaceTelemetry() {
    if (state.currentStage !== "SURFACE") return;

    state.suitO2 = Math.max(15, state.suitO2 - 0.02);
    state.suitBattery = Math.max(10, state.suitBattery - 0.015);

    const tele = window.JAMN_SCENE.getAstronautTelemetry();
    const elDist = document.getElementById("surface-hab-dist");
    const elO2 = document.getElementById("env-suit-o2");
    const elBatt = document.getElementById("env-suit-battery");
    const elEnterPrompt = document.getElementById("surface-airlock-prompt");

    if (elDist) elDist.textContent = tele.distToHabitatMeters + " m to Habitat Airlock";
    if (elO2) elO2.textContent = state.suitO2.toFixed(1) + "% (Pure O₂ @ 29.6 kPa)";
    if (elBatt) elBatt.textContent = state.suitBattery.toFixed(1) + "% PLSS Reserve";

    if (elEnterPrompt) {
      if (tele.nearHabitat) {
        elEnterPrompt.classList.remove("hidden");
      } else {
        elEnterPrompt.classList.add("hidden");
      }
    }
  }

  // --------------------------------------------------------------------------
  // Stage 6: Mars Habitat & Survival Mission Interface (Requirement #10)
  // --------------------------------------------------------------------------
  function beginSurvivalMission() {
    state.survivalMissionStarted = true;
    window.JAMN_SCENE.playTone(620, "triangle", 0.22, 0.07);
    const chosenSite = state.confirmedSiteId || "valles_marineris";
    const mappedSiteId = (chosenSite === "polar_ice_caps") ? "north_polar" : chosenSite;
    if (typeof window.transitionToSegment3 === "function") {
      window.transitionToSegment3(mappedSiteId, "base_entry", false);
    } else {
      showToast("MARS SURVIVAL MISSION PROTOCOL ACTIVE // INGRESS READY");
    }
  }

  function performHabitatAction(actionType) {
    window.JAMN_SCENE.playTone(540, "sine", 0.15, 0.06);
    const site = window.JAMN_DATA.landingSites[state.selectedSiteId];

    if (actionType === "SCRUB_DUST") {
      state.dustFactor = Math.max(2, state.dustFactor - 15);
      state.habPower = Math.min(100, state.habPower + 12);
      state.habLog.unshift(
        `[SOL ${state.solCount}] Electrostatic dust clearing completed on solar arrays (+12% Power).`
      );
    } else if (actionType === "MOXIE_BOOST") {
      if (state.habPower >= 10) {
        state.habPower -= 8;
        state.habOxygen = Math.min(100, state.habOxygen + 14);
        state.habLog.unshift(
          `[SOL ${state.solCount}] MOXIE atmospheric CO₂ electrolysis boost (+14% O₂, -8% Power).`
        );
      }
    } else if (actionType === "ICE_EXTRACTION") {
      const waterGain = site && site.id === "polar_ice_caps" ? 22 : 12;
      state.habPower = Math.max(5, state.habPower - 7);
      state.habWater = Math.min(100, state.habWater + waterGain);
      state.habLog.unshift(
        `[SOL ${state.solCount}] Subsurface regolith/ice thermal extractor cycled (+${waterGain}% H₂O).`
      );
    } else if (actionType === "HYDROPONICS_HARVEST") {
      if (state.habWater >= 10) {
        state.habWater -= 6;
        state.habFood = Math.min(100, state.habFood + 15);
        state.habLog.unshift(
          `[SOL ${state.solCount}] Hydroponic aeroponics bay harvested (+15% Caloric Reserve).`
        );
      }
    }

    updateHabitatUI();
  }

  function updateHabitatUI() {
    const site = window.JAMN_DATA.landingSites[state.selectedSiteId];
    const setEl = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    const setBar = (id, pct) => {
      const el = document.getElementById(id);
      if (el) el.style.width = Math.max(0, Math.min(100, pct)) + "%";
    };

    setEl("hab-site-label", site ? site.name : "Olympus Mons");
    setEl("hab-sol-counter", "SOL " + state.solCount);
    setEl("hab-power-val", state.habPower + "%");
    setEl("hab-o2-val", state.habOxygen + "%");
    setEl("hab-water-val", state.habWater + "%");
    setEl("hab-food-val", state.habFood + "%");
    setEl("hab-temp-val", "+" + state.habTemp.toFixed(1) + " °C (Regulated)");
    setEl("hab-comms-val", "DSN LINK NOMINAL (14.2 min OWLT)");

    setBar("hab-power-bar", state.habPower);
    setBar("hab-o2-bar", state.habOxygen);
    setBar("hab-water-bar", state.habWater);
    setBar("hab-food-bar", state.habFood);

    const statusBadge = document.getElementById("hab-mission-badge");
    if (statusBadge) {
      statusBadge.textContent = state.survivalMissionStarted
        ? "SURVIVAL PROTOCOL: ACTIVE"
        : "HABITAT STANDBY – CLICK 'BEGIN SURVIVAL MISSION'";
      statusBadge.className = state.survivalMissionStarted
        ? "px-2.5 py-1 rounded text-xs font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-500/60"
        : "px-2.5 py-1 rounded text-xs font-mono bg-amber-950/80 text-amber-300 border border-amber-500/60";
    }
  }

  // --------------------------------------------------------------------------
  // Global Settings, Baseline Reference Modal & Mission Restart
  // --------------------------------------------------------------------------
  function togglePerformanceMode() {
    state.lowSpecMode = !state.lowSpecMode;
    window.JAMN_SCENE.setPerformanceMode(state.lowSpecMode);
    const btn1 = document.getElementById("btn-perf-title");
    const btn2 = document.getElementById("btn-perf-nav");
    const label = state.lowSpecMode ? "PERF: LOW-SPEC LAPTOP" : "PERF: STANDARD 3D";
    if (btn1) btn1.textContent = label;
    if (btn2) btn2.textContent = label;
    showToast(
      state.lowSpecMode
        ? "LOW-SPEC LAPTOP MODE ENABLED (1.0x Pixel Ratio)"
        : "STANDARD 3D QUALITY ENABLED"
    );
  }

  function toggleAudioMute() {
    state.audioMuted = !state.audioMuted;
    window.JAMN_SCENE.setMuted(state.audioMuted);
    const btn = document.getElementById("btn-audio-mute");
    if (btn) btn.textContent = state.audioMuted ? "AUDIO: MUTED" : "AUDIO: ON";
  }

  function populateBaselineModal() {
    const ref = window.JAMN_DATA.referenceMars;
    const setEl = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    setEl("modal-ref-gravity", ref.gravity);
    setEl("modal-ref-temp", ref.meanTemp);
    setEl("modal-ref-pressure", ref.meanPressure);
    setEl("modal-ref-atmo", ref.atmosphere);
    setEl("modal-ref-sol", ref.solDuration);
    setEl("modal-ref-disclaimer", ref.disclaimer);
  }

  function toggleReferenceModal(show) {
    const modal = document.getElementById("nasa-reference-modal");
    if (!modal) return;
    if (show) {
      modal.classList.remove("hidden");
    } else {
      modal.classList.add("hidden");
    }
  }

  function restartMission() {
    state.confirmedSiteId = null;
    state.survivalMissionStarted = false;
    state.solCount = 1;
    state.habPower = 92;
    state.habOxygen = 96;
    state.habWater = 88;
    state.habFood = 94;
    state.suitO2 = 98.4;
    state.suitBattery = 96.0;
    state.samplesCollected = 0;
    goToStage("TITLE");
    showToast("MISSION RESET // READY FOR LAUNCH");
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(init, 50);
  } else {
    window.addEventListener("load", init);
  }

  return {
    init,
    goToStage,
    stepStage,
    getCurrentStage: () => state.currentStage,
    getConfirmedSiteId: () => state.confirmedSiteId || state.selectedSiteId,
    toggleCockpitWarp,
    selectLandingSite,
    confirmLandingSite,
    skipToTouchdown,
    toggleAstronautPov,
    collectRegolithSample,
    enterHabitatAirlock,
    beginSurvivalMission,
    performHabitatAction,
    togglePerformanceMode,
    toggleAudioMute,
    toggleReferenceModal,
    restartMission
  };
})();
