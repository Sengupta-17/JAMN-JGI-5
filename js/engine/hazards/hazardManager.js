/**
 * Hazard Management System for Mars Surface Simulation (Segment 4)
 * Compliant with Section 4.4 and Section 4.5 of Mission Specifications.
 * 
 * Manages the 7 modular hazards:
 * 1. Water Scarcity
 * 2. Food Production Failure
 * 3. Extreme Temperatures (Cold Snaps)
 * 4. Radiation (Chronic & Solar Particle Events)
 * 5. Low Gravity & Conditioning Debt
 * 6. Dust Storms (Regional & Global)
 * 7. Low Exterior Pressure & Seal Decompression
 */

export class HazardManager {
  constructor(parameterEngine, eventBus) {
    this.engine = parameterEngine;
    this.bus = eventBus;

    this.activeHazards = [];
    this.activeIssues = new Map(); // locationId -> issueDetails
    this.forecasts = [];
    this.conditioningDebt = 0;
    this.solarEventCount = 0; // max 1 major SPE per 30-sol run

    this.challengeType = 'standard';
    this.challengeScript = [];
  }

  setChallenge(challengeType) {
    this.challengeType = challengeType || 'standard';
    this.challengeScript = [];
    this.initChallengeScript();
  }

  initChallengeScript() {
    // Configured deterministic scenarios per §4.5.6
    if (this.challengeType === 'global_dust') {
      this.challengeScript.push({
        sol: 5,
        type: 'global_dust_start',
        duration: 23,
        description: 'Planet-encircling dust storm front entering regional quadrant.'
      });
    } else if (this.challengeType === 'eclss_decomp') {
      this.challengeScript.push({
        sol: 6,
        type: 'eclss_decompression',
        duration: 4,
        description: 'Airlock seal rupture combined with severe subzero polar cold front.'
      });
    } else if (this.challengeType === 'hydrologic_fail') {
      this.challengeScript.push({
        sol: 5,
        type: 'hydrologic_failure',
        duration: 5,
        description: 'Vapor Compression Distillation rotor foul and aeroponic mister clog.'
      });
    }
  }

  /**
   * Called at the start of each Sol to evaluate hazard progression,
   * trigger forecast notices, draw random events, and update conditioning debt.
   * @param {number} currentSol In-game Sol (1 to 30)
   * @returns {Object} Briefing payload including overnight events and forecasts
   */
  processSolStart(currentSol) {
    const overnightNotes = [];

    // 1. Advance & prune active hazards
    for (let i = this.activeHazards.length - 1; i >= 0; i--) {
      const h = this.activeHazards[i];
      h.remainingSols--;
      if (h.remainingSols <= 0) {
        this.clearHazard(h);
        overnightNotes.push(`ENVIRONMENTAL EVENT CONCLUDED: ${h.title}`);
        this.activeHazards.splice(i, 1);
      }
    }

    // 2. Check scripted challenge events
    for (const event of this.challengeScript) {
      if (event.sol === currentSol) {
        this.triggerScriptedEvent(event, currentSol, overnightNotes);
      }
    }

    // 3. Global dust storm dynamic curve if active
    const dustHazard = this.activeHazards.find(h => h.type === 'global_dust' || h.type === 'regional_dust');
    if (dustHazard) {
      if (dustHazard.type === 'global_dust') {
        const elapsed = currentSol - dustHazard.startSol;
        if (elapsed <= 6) {
          // Rises from 0.5 to ~9.0 over 6 sols
          this.engine.stormOpacityTau = 0.5 + (8.5 * (elapsed / 6.0));
        } else if (elapsed <= 10) {
          // Peak severity tau = 9 to 10
          this.engine.stormOpacityTau = 9.5;
        } else {
          // Declines gradually toward tau = 3.0 by sol 28
          const declineFraction = Math.min(1.0, (elapsed - 10) / 14.0);
          this.engine.stormOpacityTau = 9.5 - (6.5 * declineFraction);
        }
      }
    } else {
      // Nominal clear-sky tau
      this.engine.stormOpacityTau = 0.5;
    }

    // 4. Random event draw (§4.5.5)
    // Draw only if fewer than 2 major hazards and fewer than 2 active module issues
    if (this.activeHazards.length < 2 && this.activeIssues.size < 2) {
      let p_any = 0.10;
      if (currentSol > 10 && currentSol <= 20) p_any = 0.12;
      if (currentSol > 20) p_any = 0.14;

      if (Math.random() < p_any) {
        this.drawRandomOperationalEvent(currentSol, overnightNotes);
      }
    }

    // 5. Radiation 1% SPE draw (§4.4.5)
    if (this.solarEventCount === 0 && Math.random() < 0.01) {
      this.triggerSolarParticleEvent(currentSol, overnightNotes);
    }

    // 6. Refresh upcoming forecasts for the morning briefing
    this.updateForecasts(currentSol);

    return {
      sol: currentSol,
      overnightNotes,
      forecasts: [...this.forecasts],
      activeHazardsCount: this.activeHazards.length,
      activeIssuesCount: this.activeIssues.size
    };
  }

  triggerScriptedEvent(event, sol, notes) {
    if (event.type === 'global_dust_start') {
      const hazard = {
        id: 'global_dust_' + sol,
        type: 'global_dust',
        title: 'PLANET-ENCIRCLING GLOBAL DUST STORM',
        startSol: sol,
        remainingSols: event.duration,
        severity: 'critical'
      };
      this.activeHazards.push(hazard);
      notes.push('CRITICAL ALERT: Global dust storm front has engulfed the surface region. Atmospheric opacity rising sharply.');
    } else if (event.type === 'eclss_decompression') {
      this.engine.thetaColdModifier = 0.35;
      this.engine.moduleHealth.airlock_module = 0.25;
      this.engine.activeSealLeak = true;
      this.raiseModuleIssue('airlock_module', {
        faultName: 'Airlock SuitPort Seal Rupture',
        severity: 'critical',
        affectedResources: ['Oxygen', 'Power'],
        repairCostCH: 3,
        requiresEVA: true,
        description: 'Cabin atmosphere decompressing. Primary hatch seals compromised.'
      });
      const hazard = {
        id: 'subzero_shock_' + sol,
        type: 'extreme_cold',
        title: 'SUBZERO POLAR VORTEX',
        startSol: sol,
        remainingSols: event.duration,
        severity: 'high'
      };
      this.activeHazards.push(hazard);
      notes.push('EMERGENCY: Airlock seal decompression detected! Subzero thermal wave is stressing electrical heaters.');
    } else if (event.type === 'hydrologic_failure') {
      this.engine.moduleHealth.water_recovery_module = 0.50;
      this.raiseModuleIssue('water_recovery_module', {
        faultName: 'VCD Distillation Centrifuge Fouling',
        severity: 'high',
        affectedResources: ['Water'],
        repairCostCH: 3,
        requiresEVA: false,
        description: 'Wastewater filtration membranes fouled. Recovery loop degraded.'
      });
      this.engine.moduleHealth.hydroponics_module = 0.50;
      this.raiseModuleIssue('hydroponics_module', {
        faultName: 'Aeroponic Ultrasonic Mister Clog',
        severity: 'medium',
        affectedResources: ['Food'],
        repairCostCH: 2,
        requiresEVA: false,
        description: 'Mineral scaling on nutrient misters. Root feeding halved.'
      });
      notes.push('WARNING: Water recovery centrifuge imbalance detected. Hydroponic misters clogged.');
    }
  }

  drawRandomOperationalEvent(sol, notes) {
    const site = this.engine.siteData;
    // Weights: Water 1.2, Food 1.0, Cold 0.8 * (theta / 0.85), Dust 1.0 * stormExposure, Low Pressure 0.8
    const weights = {
      water: 1.2,
      food: 1.0,
      cold: 0.8 * (site.theta / 0.85),
      dust: 1.0 * site.stormExposure,
      pressure: 0.8
    };

    const totalWeight = weights.water + weights.food + weights.cold + weights.dust + weights.pressure;
    let roll = Math.random() * totalWeight;

    if (roll < weights.water) {
      // Water issue
      this.engine.moduleHealth.water_recovery_module = 0.50;
      this.raiseModuleIssue('water_recovery_module', {
        faultName: 'Water Loop Micro-Particulate Contamination',
        severity: 'medium',
        affectedResources: ['Water'],
        repairCostCH: 2,
        requiresEVA: false,
        description: 'Subsurface perchlorate filtration saturation. Water recovery efficiency derated.'
      });
      notes.push('MAINTENANCE NOTICE: Water recovery filter pack fouled. Replacement required.');
    } else if ((roll -= weights.water) < weights.food) {
      // Food / hydroponics issue
      this.engine.moduleHealth.hydroponics_module = 0.50;
      this.raiseModuleIssue('hydroponics_module', {
        faultName: 'Crop Growth Bay Nutrient Imbalance',
        severity: 'medium',
        affectedResources: ['Food'],
        repairCostCH: 2,
        requiresEVA: false,
        description: 'pH excursion in hydroponic nutrient loop. Harvest yield restricted.'
      });
      notes.push('BIOSPHERE ALERT: Hydroponic bay nutrient delivery imbalance detected.');
    } else if ((roll -= weights.food) < weights.cold) {
      // Cold snap
      this.engine.thetaColdModifier = 0.30;
      this.activeHazards.push({
        id: 'cold_snap_' + sol,
        type: 'extreme_cold',
        title: 'REGIONAL SUBZERO COLD SNAP',
        startSol: sol,
        remainingSols: 3,
        severity: 'medium'
      });
      notes.push('WEATHER BULLETIN: Regional cold wave approaching. Base heating load increased for 3 sols.');
    } else if ((roll -= weights.cold) < weights.dust) {
      // Regional dust storm
      const duration = 4 + Math.floor(Math.random() * 4);
      this.engine.stormOpacityTau = 3.5;
      this.activeHazards.push({
        id: 'regional_dust_' + sol,
        type: 'regional_dust',
        title: 'REGIONAL DUST SQUALL',
        startSol: sol,
        remainingSols: duration,
        severity: 'medium'
      });
      notes.push(`METEOROLOGY: Regional dust squall active (Tau = 3.5). Estimated duration: ${duration} sols.`);
    } else {
      // Pressure / seal leak
      this.engine.moduleHealth.airlock_module = 0.40;
      this.engine.activeSealLeak = true;
      this.raiseModuleIssue('airlock_module', {
        faultName: 'Outer Airlock Hatch Micro-Fissure',
        severity: 'high',
        affectedResources: ['Oxygen', 'Power'],
        repairCostCH: 2,
        requiresEVA: true,
        description: 'Atmospheric pressure leak detected across secondary airlock seal.'
      });
      notes.push('SAFETY ALARM: Airlock micro-leak detected! Cabin pressure venting slowly.');
    }
  }

  triggerSolarParticleEvent(sol, notes) {
    this.solarEventCount++;
    this.engine.isSheltered = true;
    this.activeHazards.push({
      id: 'solar_particle_event_' + sol,
      type: 'solar_event',
      title: 'SOLAR PARTICLE EVENT (CLASS-M CORONAL FLARE)',
      startSol: sol,
      remainingSols: 1,
      severity: 'critical'
    });
    notes.push('RADIATION SHELTER DIRECTIVE: Class-M solar flare detected by deep-space orbiter. All crew ordered to Habitation Storm Shelter. Discretionary CH capped at 7.');
  }

  raiseModuleIssue(locationId, issueDetails) {
    this.activeIssues.set(locationId, issueDetails);
    if (this.engine?.moduleHealth && locationId in this.engine.moduleHealth) {
      this.engine.moduleHealth[locationId] = 0.50;
      this.engine.recomputeRates();
    }
    if (this.bus) {
      this.bus.emit('baseIssueRaised', { locationId, issueDetails });
    }
  }

  resolveModuleIssue(locationId) {
    if (this.activeIssues.has(locationId)) {
      this.activeIssues.delete(locationId);
      this.engine.repairModule(locationId);
      if (this.bus) {
        this.bus.emit('challengeResolved', { locationId, status: 'resolved' });
      }
      return true;
    }
    return false;
  }

  clearHazard(hazard) {
    if (hazard.type === 'extreme_cold') {
      this.engine.thetaColdModifier = 0.0;
    } else if (hazard.type === 'regional_dust' || hazard.type === 'global_dust') {
      this.engine.stormOpacityTau = 0.5;
    } else if (hazard.type === 'solar_event') {
      this.engine.isSheltered = false;
    }
  }

  updateForecasts(sol) {
    this.forecasts = [];
    if (this.engine.stormOpacityTau > 1.5) {
      this.forecasts.push(`Atmospheric opacity elevated (Tau ${this.engine.stormOpacityTau.toFixed(1)}). Solar array transmission degraded.`);
    } else {
      this.forecasts.push('Clear sky conditions predicted over landing zone. Baseline solar irradiance nominal.');
    }

    if (this.engine.thetaColdModifier > 0) {
      this.forecasts.push('Subzero thermal low active. Habitat life support heaters operating at elevated duty cycle.');
    }

    if (this.engine.brineCycleSolRemaining > 0) {
      this.forecasts.push(`Brine Processor active: 98% water recovery operating (${this.engine.brineCycleSolRemaining} sols remaining).`);
    }

    if (this.conditioningDebt > 2) {
      this.forecasts.push(`Musculoskeletal conditioning debt elevated (${this.conditioningDebt} pts). EVA maintenance overhead increased.`);
    }
  }

  applyConditioningDebt(skipped) {
    if (skipped) {
      this.conditioningDebt++;
    } else {
      this.conditioningDebt = Math.max(0, this.conditioningDebt - 1);
    }
  }

  getAvailableCrewHours() {
    let ch = 20;
    // Shelter restriction caps CH at 7
    if (this.engine.isSheltered) {
      return 7;
    }
    // Every 3 debt points reduces next sol CH by 1 (max -4)
    const debtPenalty = Math.min(4, Math.floor(this.conditioningDebt / 3));
    ch -= debtPenalty;

    // Emergency rationing prolonged penalty
    if (this.engine.waterRation < 0.60 || this.engine.foodRation < 0.75) {
      ch = Math.max(12, ch - 2);
    }
    return Math.max(5, ch);
  }

  getEVACostModifier() {
    if (this.conditioningDebt >= 6) return 2;
    if (this.conditioningDebt >= 3) return 1;
    return 0;
  }
}
