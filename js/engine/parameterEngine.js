/**
 * Parameter Engine for Mars Surface Mission Simulation (Segment 4)
 * Calibrated against NASA BVAD Rev. 2 (February 2022) and CHAPEA 4-person baseline.
 * 
 * Manages the four core base parameters: Oxygen, Food, Water, Power (0-100%).
 * Evaluates exact rates of change (pp/sol) and handles player resource actions.
 */

export const SITE_MODIFIERS = {
  north_polar: {
    name: 'North Polar Ice Cap',
    externalPressureKPa: 0.80,
    s_site: 0.85,
    i_site: 3.00,
    theta: 1.60,
    stormExposure: 0.80,
    initialArraySoiling: 0.10,
    doseFactor: 1.05
  },
  olympus_mons: {
    name: 'Olympus Mons',
    externalPressureKPa: 0.15,
    s_site: 1.15,
    i_site: 0.25,
    theta: 1.10,
    stormExposure: 0.30,
    initialArraySoiling: 0.02,
    doseFactor: 1.30
  },
  valles_marineris: {
    name: 'Valles Marineris',
    externalPressureKPa: 1.20,
    s_site: 0.95,
    i_site: 1.20,
    theta: 0.90,
    stormExposure: 1.00,
    initialArraySoiling: 0.15,
    doseFactor: 0.85
  },
  hellas_basin: {
    name: 'Hellas Basin',
    externalPressureKPa: 1.24,
    s_site: 0.90,
    i_site: 1.00,
    theta: 0.85,
    stormExposure: 1.30,
    initialArraySoiling: 0.30,
    doseFactor: 0.90
  }
};
SITE_MODIFIERS.polar_ice_caps = SITE_MODIFIERS.north_polar;

export const SITE_STARTING_PARAMETERS = {
  north_polar: { oxygen: 78, food: 60, water: 92, power: 55 },
  olympus_mons: { oxygen: 52, food: 65, water: 45, power: 88 },
  valles_marineris: { oxygen: 70, food: 75, water: 68, power: 72 },
  hellas_basin: { oxygen: 82, food: 62, water: 58, power: 50 }
};
SITE_STARTING_PARAMETERS.polar_ice_caps = SITE_STARTING_PARAMETERS.north_polar;

export class ParameterEngine {
  constructor(siteId = 'valles_marineris') {
    this.siteId = siteId in SITE_MODIFIERS ? siteId : 'valles_marineris';
    this.siteData = SITE_MODIFIERS[this.siteId];

    // Core 4 parameters (0-100%)
    const starting = SITE_STARTING_PARAMETERS[this.siteId];
    this.parameters = {
      oxygen: starting.oxygen,
      food: starting.food,
      water: starting.water,
      power: starting.power
    };

    // Environmental state
    this.sitePressureKPa = this.siteData.externalPressureKPa;
    this.habitatPressureKPa = 56.5; // NASA exploration atmosphere default
    this.stormOpacityTau = 0.5; // Nominal clear-sky optical depth
    this.arraySoiling = this.siteData.initialArraySoiling;
    this.outsideTemperatureC = -59.0;
    this.thetaColdModifier = 0.0;
    this.radiationDose_mSv = 0.0;
    this.hasRegolithBerm = false;
    this.cachedSamples = 0; // MSR Sample Caching Depot count (0 to 5)

    // Subsystem health (0.0 to 1.0)
    this.moduleHealth = {
      eclss_module: 1.0,
      hydroponics_module: 1.0,
      water_recovery_module: 1.0,
      power_microgrid_module: 1.0,
      airlock_module: 1.0,
      command_module: 1.0,
      habitation_module: 1.0
    };

    // Operational policies & states
    this.conservationMode = 'normal'; // 'normal' (L0), 'conserve' (L1), 'survival' (L2)
    this.waterRation = 1.0; // 1.0 normal, 0.74 conserve, 0.57 emergency
    this.foodRation = 1.0; // 1.0 normal, 0.85 conserve, 0.70 emergency
    this.brineCycleSolRemaining = 0; // Days left on 98% brine recovery
    this.cropTending = 1.0; // 0.5 to 1.0
    this.exerciseCompletedToday = true;
    this.strenuousEVA = false;
    this.isSheltered = false;
    this.activeSealLeak = false;
    this.isSealIsolated = false;
    this.isRepressurising = false;

    // Cache computed derivatives (pp/sol)
    this.rates = {
      oxygen: 0,
      food: 0,
      water: 0,
      power: 0
    };

    this.recomputeRates();
  }

  reset(siteId = this.siteId) {
    this.siteId = siteId in SITE_MODIFIERS ? siteId : 'valles_marineris';
    this.siteData = SITE_MODIFIERS[this.siteId];

    const starting = SITE_STARTING_PARAMETERS[this.siteId];
    this.parameters = {
      oxygen: starting.oxygen,
      food: starting.food,
      water: starting.water,
      power: starting.power
    };

    this.sitePressureKPa = this.siteData.externalPressureKPa;
    this.habitatPressureKPa = 56.5;
    this.stormOpacityTau = 0.5;
    this.arraySoiling = this.siteData.initialArraySoiling;
    this.outsideTemperatureC = -59.0;
    this.thetaColdModifier = 0.0;
    this.radiationDose_mSv = 0.0;
    this.hasRegolithBerm = false;
    this.cachedSamples = 0;

    for (const key of Object.keys(this.moduleHealth)) {
      this.moduleHealth[key] = 1.0;
    }

    this.conservationMode = 'normal';
    this.waterRation = 1.0;
    this.foodRation = 1.0;
    this.brineCycleSolRemaining = 0;
    this.cropTending = 1.0;
    this.exerciseCompletedToday = true;
    this.strenuousEVA = false;
    this.isSheltered = false;
    this.activeSealLeak = false;
    this.isSealIsolated = false;
    this.isRepressurising = false;

    this.recomputeRates();
  }

  // --- Automatic Power Load Shedding Curves (§2.4) ---

  getSigmaE(power) {
    if (power >= 25) return 1.0;
    if (power >= 10) return 0.8 + 0.2 * (power - 10) / 15.0;
    if (power > 0) return 0.8 * (power / 10.0);
    return 0.0;
  }

  getEtaEffective(power) {
    const etaTarget = (this.brineCycleSolRemaining > 0) ? 0.98 : 0.94;
    if (power >= 25) return etaTarget;
    if (power >= 10) return 0.90 + (etaTarget - 0.90) * (power - 10) / 15.0;
    if (power > 0) return 0.90 * (power / 10.0);
    return 0.0;
  }

  getPowerLightsFactor(power) {
    if (power >= 40) return 1.0;
    if (power >= 25) return 0.5;
    return 0.0;
  }

  getPowerIsruFactor(power) {
    if (power >= 40) return 1.0;
    if (power >= 25) return 0.5;
    return 0.0;
  }

  getAutomaticBaseLoadCap(power) {
    if (power >= 40) return 0.80;
    if (power >= 25) return 0.74;
    if (power >= 10) return 0.60;
    return 0.50;
  }

  // --- Core Flow Equations (§2.3) ---

  recomputeRates() {
    const P = this.parameters.power;
    const O = this.parameters.oxygen;
    const W = this.parameters.water;
    const F = this.parameters.food;

    const activityFactor = this.strenuousEVA ? 1.06 : 1.00;

    // 1. Oxygen Rate
    const D_O = 8.333; // 4 crew demand = 8.333 pp/sol
    const h_eclss = this.moduleHealth.eclss_module;
    const sigma_E = this.getSigmaE(P);
    const waterFactor = Math.min(1.0, Math.max(0.0, W / 15.0));
    const eclssModeFactor = (this.conservationMode === 'survival') ? 0.92 : 1.00;

    const OGA_fraction = h_eclss * sigma_E * waterFactor * eclssModeFactor;

    const h_airlock = this.moduleHealth.airlock_module;
    const leakBase = 0.125 * (1.0 + 6.0 * (1.0 - h_airlock)) * (this.habitatPressureKPa / 56.5);
    let leakEvent = 0.0;
    if (this.activeSealLeak) {
      leakEvent = this.isSealIsolated ? 0.625 : 2.50; // isolated reduces leak to 25%
    }

    this.rates.oxygen = (D_O * (OGA_fraction - activityFactor)) - leakBase - leakEvent;

    // 2. Water Rate
    const D_W = 5.00; // 5.00 pp/sol make-up loss at 94% recovery
    const etaEff = this.getEtaEffective(P);
    const r_w = this.waterRation;
    const waterLoss = D_W * r_w * activityFactor * ((1.0 - etaEff) / 0.06);

    const i_site = this.siteData.i_site;
    const h_water = this.moduleHealth.water_recovery_module;
    const powerIsru = this.getPowerIsruFactor(P);
    const manualIsru = (this.conservationMode === 'normal') ? 1.0 : 0.0;
    const isruWater = Math.min(powerIsru, manualIsru);

    const waterGain = (2.00 + 1.50 * Math.sqrt(i_site)) * h_water * isruWater;
    this.rates.water = waterGain - waterLoss;

    // 3. Food Rate
    const D_F = 2.222; // 4 crew demand = 2.222 pp/sol
    const f_crop = 0.22;
    const h_hydro = this.moduleHealth.hydroponics_module;
    const tend = Math.min(1.0, Math.max(0.5, this.cropTending));

    const powerLights = this.getPowerLightsFactor(P);
    const manualLights = (this.conservationMode === 'normal') ? 1.0 : (this.conservationMode === 'conserve' ? 0.5 : 0.0);
    const lights = Math.min(powerLights, manualLights);

    // Severe cold without sufficient power harms hydroponic crop yield
    const coldCropMultiplier = (this.thetaColdModifier > 0.20 && (P < 40 || this.conservationMode === 'survival')) ? 0.70 : 1.00;

    const cropCredit = D_F * f_crop * h_hydro * tend * lights * coldCropMultiplier;
    const r_f = this.foodRation;
    this.rates.food = cropCredit - (D_F * r_f * activityFactor);

    // 4. Power Rate
    const h_reactor = this.moduleHealth.power_microgrid_module;
    const h_inverter = this.moduleHealth.power_microgrid_module; // inverters coupled with microgrid
    const s_site = this.siteData.s_site;
    const tau = this.stormOpacityTau;
    const T_tau = Math.min(1.0, Math.max(0.01, Math.exp(-0.45 * Math.max(0, tau - 0.5))));

    const reactorSupply = 0.50 * h_reactor;
    const solarSupply = 0.60 * s_site * (1.0 - this.arraySoiling) * T_tau * h_inverter;
    const generationRatio = reactorSupply + solarSupply;

    const theta = this.siteData.theta + this.thetaColdModifier;
    const warm = (tau <= 2.0) ? 1.0 : Math.max(0.70, 1.0 - 0.04 * (tau - 2.0));

    let heatingModeFactor = 1.0;
    if (this.conservationMode === 'survival' || P < 10) {
      heatingModeFactor = 0.25;
    } else if (P < 25) {
      heatingModeFactor = 0.50;
    }

    const heatingLoad = 0.10 * theta * warm * heatingModeFactor;
    const repressurisationLoad = this.isRepressurising ? (0.08 * Math.max(0, (this.habitatPressureKPa - this.sitePressureKPa) / 56.5)) : 0.0;
    const exerciseLoad = (this.exerciseCompletedToday && P >= 10 && this.conservationMode !== 'survival') ? 0.01 : 0.0;
    const shelterLoad = this.isSheltered ? 0.03 : 0.0;

    let manualBaseLoad = 0.80;
    if (this.conservationMode === 'conserve') manualBaseLoad = 0.65;
    if (this.conservationMode === 'survival') manualBaseLoad = 0.50;

    const autoCap = this.getAutomaticBaseLoadCap(P);
    const effectiveBaseLoad = Math.min(manualBaseLoad, autoCap);

    const loadRatio = effectiveBaseLoad + heatingLoad + repressurisationLoad + exerciseLoad + shelterLoad;
    this.rates.power = 20.0 * (generationRatio - loadRatio);
  }

  /**
   * Integrate continuous rate of change over a time delta dt in sols.
   * @param {number} dtInSols Delta time measured in fractions of a sol (e.g. 1/60th per second)
   */
  integrate(dtInSols) {
    this.recomputeRates();

    this.parameters.oxygen = Math.max(0.0, Math.min(100.0, this.parameters.oxygen + this.rates.oxygen * dtInSols));
    this.parameters.food = Math.max(0.0, Math.min(100.0, this.parameters.food + this.rates.food * dtInSols));
    this.parameters.water = Math.max(0.0, Math.min(100.0, this.parameters.water + this.rates.water * dtInSols));
    this.parameters.power = Math.max(0.0, Math.min(100.0, this.parameters.power + this.rates.power * dtInSols));

    // Array soiling gradual accumulation
    const soilingRate = (this.stormOpacityTau > 2.0) ? 0.015 : 0.002; // up to 1.5% in storm, 0.2% clear
    this.arraySoiling = Math.min(1.0, this.arraySoiling + soilingRate * dtInSols);

    // Chronic radiation accumulation
    const dailyDose = 0.66 * this.siteData.doseFactor * (this.hasRegolithBerm ? 0.5 : 1.0);
    this.radiationDose_mSv += dailyDose * dtInSols;
  }

  // --- Player Action Handlers (§4.5.3) ---

  runBrineCycle() {
    this.brineCycleSolRemaining = 5;
    this.recomputeRates();
    return { success: true, message: 'High-recovery Brine Processor initiated (98% loop efficiency for 5 sols).' };
  }

  drillIceWell() {
    const gain = 3.6 * Math.sqrt(this.siteData.i_site);
    this.parameters.water = Math.min(100.0, this.parameters.water + gain);
    this.moduleHealth.water_recovery_module = 1.0;
    this.recomputeRates();
    return { success: true, gain: gain.toFixed(1), message: `Subsurface well bore flushed. Instant recovery: +${gain.toFixed(1)}% Water.` };
  }

  tendCrops() {
    this.cropTending = 1.0;
    this.recomputeRates();
    return { success: true, message: 'Aeroponic root curtains cleaned and nutrient flushed. Tending factor restored to 100%.' };
  }

  exerciseBlock() {
    this.exerciseCompletedToday = true;
    this.recomputeRates();
    return { success: true, message: '4-crew resistive and cardiovascular countermeasure session completed.' };
  }

  cleanArraysPulse() {
    this.arraySoiling *= 0.50; // clears 50%
    this.recomputeRates();
    return { success: true, soilingPct: (this.arraySoiling * 100).toFixed(1), message: `Electrostatic dust repellent pulse activated. Array dust reduced to ${(this.arraySoiling * 100).toFixed(1)}%.` };
  }

  cleanArraysEVA() {
    this.arraySoiling = 0.05; // clean to 5%
    this.recomputeRates();
    return { success: true, message: 'Manual EVA array sweep complete. Optical dust transmission restored (5% residual).' };
  }

  buildRegolithBerm() {
    this.hasRegolithBerm = true;
    return { success: true, message: 'Engineered regolith storm berm constructed. Radiation dose increment halved.' };
  }

  isolateSealLeak() {
    this.isSealIsolated = true;
    this.recomputeRates();
    return { success: true, message: 'Airlock bulkhead isolated. Cabin decompression rate attenuated by 75%.' };
  }

  repairModule(locationId) {
    if (locationId in this.moduleHealth) {
      this.moduleHealth[locationId] = 1.0;
      if (locationId === 'airlock_module') {
        this.activeSealLeak = false;
        this.isSealIsolated = false;
        this.isRepressurising = true;
        setTimeout(() => { this.isRepressurising = false; this.recomputeRates(); }, 4000);
      }
      this.recomputeRates();
      return true;
    }
    return false;
  }

  setConservationMode(mode) {
    if (['normal', 'conserve', 'survival'].includes(mode)) {
      this.conservationMode = mode;
      this.recomputeRates();
      return true;
    }
    return false;
  }

  setRations(waterTier = 'normal', foodTier = 'normal') {
    this.waterRation = (waterTier === 'emergency') ? 0.57 : (waterTier === 'conserve' ? 0.74 : 1.00);
    this.foodRation = (foodTier === 'emergency') ? 0.70 : (foodTier === 'conserve' ? 0.85 : 1.00);
    this.recomputeRates();
  }

  onSolAdvance() {
    // Decrement brine cycle timer
    if (this.brineCycleSolRemaining > 0) {
      this.brineCycleSolRemaining--;
    }

    // Natural crop tending decay if neglected
    this.cropTending = Math.max(0.50, this.cropTending - 0.10);

    // Reset daily exercise and activity flags
    const skippedExercise = !this.exerciseCompletedToday;
    this.exerciseCompletedToday = false;
    this.strenuousEVA = false;

    this.recomputeRates();
    return { skippedExercise };
  }
}
