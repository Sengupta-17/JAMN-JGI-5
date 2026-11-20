/**
 * Interactive Surface Element & Science Deployment Manager (Segment 4 - Phase 3)
 * Orchestrates physical 3D surface stations across the Martian exploration map:
 * 1. Subsurface Cryo-Drill Rig (Ice core extraction & ECLSS water loop boost)
 * 2. Photovoltaic Sweeper Hub (Electrodynamic dust removal & power restoration)
 * 3. Remote MEDA Weather Outpost (Meteorological telemetry, early storm warning)
 * 4. Hematite Mineral Outcrop & Sample Caching Depot (MSR astrobiology sample loop)
 * 5. Exterior Airlock Recharge Terminal (EVA umbilical sync & O2 replenishment)
 *
 * Implements proximity detection, animated AR holographic beacons, tactile HUD prompts,
 * audio/visual feedback, and scientific parameter updates.
 */

import * as THREE_MODULE from 'three';
import { pbrFactory } from '../graphics/pbrMaterials.js';

const THREE = (typeof window !== 'undefined' && window.THREE) ? window.THREE : THREE_MODULE;

export class InteractiveSurfaceManager {
  /**
   * @param {THREE.Scene} scene The active Three.js scene
   * @param {object} terrain TerrainManager instance for surface elevation clamping
   */
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;

    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'InteractiveSurfaceElements';
    if (this.scene) {
      this.scene.add(this.rootGroup);
    }

    // Active tracking state
    this.activeTarget = null;
    this.totalTime = 0;
    this.onInteractionCallback = null;

    // Station definitions and runtime state
    this.stations = [
      {
        id: 'ice_drill_site',
        name: 'Subsurface Cryo-Drill Rig',
        icon: '🧊',
        actionId: 'extract_subsurface_ice',
        promptText: 'EXTRACT SUB-SURFACE ICE CORE',
        position: new THREE.Vector3(-18.0, 0, -65.0),
        triggerRadiusRover: 6.5,
        triggerRadiusAstronaut: 4.5,
        beaconColor: 0x00f0ff,
        beaconBaseHeight: 4.2,
        actionCooldownSec: 45.0,
        cooldownRemaining: 0,
        usedThisSol: false,
        delta: { water: 4.5 },
        description: 'Automated permafrost rotary corer accessing subsurface ice matrix.',
        successMessage: 'Subsurface Cryo-Drill: 4.5% water ice extracted & routed to ECLSS melt-tank.'
      },
      {
        id: 'solar_sweeper_hub',
        name: 'Photovoltaic Sweeper Hub',
        icon: '☀️',
        actionId: 'activate_pv_dust_removal',
        promptText: 'ACTIVATE PV DUST REMOVAL',
        position: new THREE.Vector3(48.0, 0, -22.0),
        triggerRadiusRover: 6.5,
        triggerRadiusAstronaut: 4.5,
        beaconColor: 0xf59e0b,
        beaconBaseHeight: 3.8,
        actionCooldownSec: 45.0,
        cooldownRemaining: 0,
        usedThisSol: false,
        delta: { power: 5.0, soilingReduction: 0.5 },
        description: 'Electrodynamic dust purge & pneumatic sweeper across Solar Arrays 1-3.',
        successMessage: 'PV Dust Sweep: High-pressure gas purge complete across solar arrays (+5.0% Power).'
      },
      {
        id: 'weather_station_post',
        name: 'MEDA Weather Outpost',
        icon: '🛰️',
        actionId: 'calibrate_meda_sensors',
        promptText: 'CALIBRATE MEDA SENSORS',
        position: new THREE.Vector3(-72.0, 0, 28.0),
        triggerRadiusRover: 6.5,
        triggerRadiusAstronaut: 4.5,
        beaconColor: 0x10b981,
        beaconBaseHeight: 5.2,
        actionCooldownSec: 45.0,
        cooldownRemaining: 0,
        usedThisSol: false,
        delta: { tauReduction: 0.25, sciencePoints: 15 },
        description: 'Mars Environmental Dynamics Analyzer (MEDA) meteorological sensor suite.',
        successMessage: 'MEDA Weather Post Calibrated: Microbarograph & optical depth synced to Base.'
      },
      {
        id: 'mineral_sample_cache',
        name: 'Hematite Sample Depot',
        icon: '💎',
        actionId: 'coring_drill_and_cache',
        promptText: 'CORING DRILL & CACHE SAMPLE',
        position: new THREE.Vector3(24.0, 0, 78.0),
        triggerRadiusRover: 6.5,
        triggerRadiusAstronaut: 4.5,
        beaconColor: 0xa855f7,
        beaconBaseHeight: 3.5,
        actionCooldownSec: 45.0,
        cooldownRemaining: 0,
        usedThisSol: false,
        delta: { cachedSample: 1, handoverBonusPct: 5 },
        description: 'Astrobiological sedimentary outcrop & titanium sample tube caching carousel.',
        successMessage: 'Astrobiology Sample: Hermetically sealed in titanium tube (+5% Handover Bonus).'
      },
      {
        id: 'airlock_terminal',
        name: 'Airlock Umbilical Terminal',
        icon: '🔄',
        actionId: 'recharge_airlock_oxygen',
        promptText: 'OXYGEN SUPPLY SYNC',
        position: new THREE.Vector3(0.0, 0, 36.0),
        triggerRadiusRover: 6.5,
        triggerRadiusAstronaut: 4.5,
        beaconColor: 0x38bdf8,
        beaconBaseHeight: 3.2,
        actionCooldownSec: 45.0,
        cooldownRemaining: 0,
        usedThisSol: false,
        delta: { oxygen: 3.0 },
        description: 'High-pressure cryogenic umbilical recharge and ECLSS oxygen sync.',
        successMessage: 'Airlock Umbilical Docked: High-pressure oxygen reserves replenished (+3.0% O2).'
      }
    ];

    this.initStationMeshes();
  }

  /**
   * Builds physical 3D meshes and holographic AR beacons for all surface stations.
   */
  initStationMeshes() {
    this.stations.forEach((station) => {
      // 1. Terrain surface height clamping
      let surfaceY = 0;
      if (this.terrain && typeof this.terrain.getElevationAt === 'function') {
        surfaceY = this.terrain.getElevationAt(station.position.x, station.position.z);
      }
      station.position.y = surfaceY;

      // 2. Station group container
      const group = new THREE.Group();
      group.position.copy(station.position);
      group.name = `Station_${station.id}`;

      // 3. Construct specific 3D model geometry
      switch (station.id) {
        case 'ice_drill_site':
          this.buildIceDrillRig(group, station);
          break;
        case 'solar_sweeper_hub':
          this.buildSolarSweeperHub(group, station);
          break;
        case 'weather_station_post':
          this.buildWeatherStationPost(group, station);
          break;
        case 'mineral_sample_cache':
          this.buildMineralSampleDepot(group, station);
          break;
        case 'airlock_terminal':
          this.buildAirlockTerminal(group, station);
          break;
        default:
          break;
      }

      // 4. Construct floating holographic AR beacon
      this.buildARBeacon(group, station);

      this.rootGroup.add(group);
      station.group = group;
    });
  }

  /**
   * Subsurface Cryo-Drill Rig (Ice Extraction)
   */
  buildIceDrillRig(parent, station) {
    const metalMat = pbrFactory.getAerospaceMetalMaterial({ color: 0xc8d1dc, metalness: 0.85, roughness: 0.35 });
    const darkMetalMat = pbrFactory.getAerospaceMetalMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.4 });
    const goldMLIMat = pbrFactory.getGoldMLIMaterial();
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0xdff8fc,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.25,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85
    });

    // Triangular derrick tripod legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.12, 3.8, 8);
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(Math.sin(angle) * 1.3, 1.8, Math.cos(angle) * 1.3);
      leg.rotation.x = Math.cos(angle) * 0.32;
      leg.rotation.z = -Math.sin(angle) * 0.32;
      leg.castShadow = true;
      parent.add(leg);

      // Foot pad
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 12), darkMetalMat);
      foot.position.set(Math.sin(angle) * 1.8, 0.04, Math.cos(angle) * 1.8);
      parent.add(foot);
    }

    // Central structural drill guide tube
    const guideCol = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.4, 16), metalMat);
    guideCol.position.y = 1.7;
    guideCol.castShadow = true;
    parent.add(guideCol);

    // Rotary drill drive head assembly (animated spin)
    const drillHeadGroup = new THREE.Group();
    drillHeadGroup.position.y = 2.4;

    const motorHousing = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.7), darkMetalMat);
    drillHeadGroup.add(motorHousing);

    // Helical drill bit penetrating into the ground
    const drillBitGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.6, 12);
    const drillBit = new THREE.Mesh(drillBitGeo, metalMat);
    drillBit.position.y = -1.2;
    drillHeadGroup.add(drillBit);

    parent.add(drillHeadGroup);
    station.animatedPart = drillHeadGroup;
    station.drillSpinSpeed = 1.5;

    // Cryogenic insulated conduit running to storage manifold
    const manifoldBox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), darkMetalMat);
    manifoldBox.position.set(1.4, 0.35, 0.5);
    manifoldBox.castShadow = true;
    parent.add(manifoldBox);

    const hoseGeo = new THREE.TorusGeometry(1.2, 0.06, 8, 16, Math.PI * 0.75);
    const hose = new THREE.Mesh(hoseGeo, goldMLIMat);
    hose.position.set(0.7, 0.9, 0.25);
    hose.rotation.z = Math.PI * 0.85;
    parent.add(hose);

    // Frost & ice crystals around the borehole
    for (let c = 0; c < 5; c++) {
      const crystalGeo = new THREE.ConeGeometry(0.15 + c * 0.04, 0.45 + c * 0.1, 5);
      const crystal = new THREE.Mesh(crystalGeo, iceMat);
      const cAngle = (c * Math.PI * 2) / 5 + 0.3;
      crystal.position.set(Math.sin(cAngle) * 0.5, 0.2, Math.cos(cAngle) * 0.5);
      crystal.rotation.x = (Math.random() - 0.5) * 0.4;
      crystal.rotation.z = (Math.random() - 0.5) * 0.4;
      parent.add(crystal);
    }
  }

  /**
   * Photovoltaic Sweeper Hub & Electrostatic Dust Removal Terminal
   */
  buildSolarSweeperHub(parent, station) {
    const metalMat = pbrFactory.getAerospaceMetalMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.3 });
    const darkMetalMat = pbrFactory.getAerospaceMetalMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.45 });
    const carbonMat = pbrFactory.getCarbonFiberMaterial();
    const goldMLIMat = pbrFactory.getGoldMLIMaterial();

    // Heavy foundation skid
    const skid = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 1.8), darkMetalMat);
    skid.position.y = 0.1;
    skid.castShadow = true;
    parent.add(skid);

    // Cylindrical high-pressure gas accumulator
    const tankGeo = new THREE.CylinderGeometry(0.45, 0.45, 2.2, 16);
    tankGeo.rotateZ(Math.PI / 2);
    const tank = new THREE.Mesh(tankGeo, carbonMat);
    tank.position.set(0, 0.85, 0);
    tank.castShadow = true;
    parent.add(tank);

    // Gold MLI endcaps for the gas accumulator
    const capGeo = new THREE.SphereGeometry(0.45, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const cap1 = new THREE.Mesh(capGeo, goldMLIMat);
    cap1.position.set(-1.1, 0.85, 0);
    cap1.rotation.z = Math.PI / 2;
    parent.add(cap1);

    const cap2 = new THREE.Mesh(capGeo, goldMLIMat);
    cap2.position.set(1.1, 0.85, 0);
    cap2.rotation.z = -Math.PI / 2;
    parent.add(cap2);

    // Dual articulating sweeper nozzle booms
    const boomGroup = new THREE.Group();
    boomGroup.position.set(0, 1.35, 0);

    const boomArm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), metalMat);
    boomArm1.position.set(-0.8, 0.4, -0.6);
    boomArm1.rotation.x = -0.6;
    boomArm1.rotation.y = -0.4;
    boomGroup.add(boomArm1);

    const nozzle1 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 8), darkMetalMat);
    nozzle1.position.set(-1.2, 1.1, -1.2);
    nozzle1.rotation.x = -0.8;
    boomGroup.add(nozzle1);

    const boomArm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), metalMat);
    boomArm2.position.set(0.8, 0.4, -0.6);
    boomArm2.rotation.x = -0.6;
    boomArm2.rotation.y = 0.4;
    boomGroup.add(boomArm2);

    const nozzle2 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 8), darkMetalMat);
    nozzle2.position.set(1.2, 1.1, -1.2);
    nozzle2.rotation.x = -0.8;
    boomGroup.add(nozzle2);

    parent.add(boomGroup);
    station.animatedPart = boomGroup;

    // Telemetry whip antenna
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 2.4, 8), metalMat);
    antenna.position.set(0.7, 2.0, 0.5);
    parent.add(antenna);
  }

  /**
   * Remote MEDA Meteorological Weather Outpost
   */
  buildWeatherStationPost(parent, station) {
    const metalMat = pbrFactory.getAerospaceMetalMaterial({ color: 0xdde2ea, metalness: 0.85, roughness: 0.3 });
    const darkMetalMat = pbrFactory.getAerospaceMetalMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.35 });
    const carbonMat = pbrFactory.getCarbonFiberMaterial();
    const solarMat = pbrFactory.getSolarPanelMaterial();

    // Lattice mast (4.2 meters high)
    const mastCol = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 4.4, 12), carbonMat);
    mastCol.position.y = 2.2;
    mastCol.castShadow = true;
    parent.add(mastCol);

    // 3 Guy wire struts at base
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 6), metalMat);
      strut.position.set(Math.sin(angle) * 0.7, 0.9, Math.cos(angle) * 0.7);
      strut.rotation.x = Math.cos(angle) * 0.45;
      strut.rotation.z = -Math.sin(angle) * 0.45;
      parent.add(strut);
    }

    // Mini solar leaf to power meteorological post
    const miniPanel = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.9), solarMat);
    miniPanel.position.set(0.45, 2.4, 0);
    miniPanel.rotation.z = -0.4;
    miniPanel.castShadow = true;
    parent.add(miniPanel);

    // Cross-spar arm at mast top
    const crossArm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.08), metalMat);
    crossArm.position.set(0, 4.15, 0);
    parent.add(crossArm);

    // Spinning 3-Cup Anemometer Assembly
    const anemometerGroup = new THREE.Group();
    anemometerGroup.position.set(-0.55, 4.35, 0);

    const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), darkMetalMat);
    anemometerGroup.add(spindle);

    // 3 aerodynamic cups
    const cupMat = pbrFactory.getAerospaceMetalMaterial({ color: 0x38bdf8, metalness: 0.8, roughness: 0.25 });
    for (let c = 0; c < 3; c++) {
      const cupAngle = (c * Math.PI * 2) / 3;
      const cupArm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 6), darkMetalMat);
      cupArm.position.set(Math.sin(cupAngle) * 0.14, 0.12, Math.cos(cupAngle) * 0.14);
      cupArm.rotation.y = cupAngle;
      cupArm.rotation.z = Math.PI / 2;
      anemometerGroup.add(cupArm);

      const cup = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8, 0, Math.PI), cupMat);
      cup.position.set(Math.sin(cupAngle) * 0.28, 0.12, Math.cos(cupAngle) * 0.28);
      cup.rotation.y = cupAngle + Math.PI / 2;
      anemometerGroup.add(cup);
    }

    parent.add(anemometerGroup);
    station.animatedPart = anemometerGroup;
    station.anemometerSpinSpeed = 4.0;

    // Wind direction vane with aerodynamic tail
    const vaneGroup = new THREE.Group();
    vaneGroup.position.set(0.55, 4.35, 0);

    const vaneSpindle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), darkMetalMat);
    vaneGroup.add(vaneSpindle);

    const vaneFin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.35), metalMat);
    vaneFin.position.set(0, 0.15, -0.15);
    vaneGroup.add(vaneFin);

    const vaneCounterweight = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), darkMetalMat);
    vaneCounterweight.position.set(0, 0.15, 0.18);
    vaneGroup.add(vaneCounterweight);

    parent.add(vaneGroup);
    station.vanePart = vaneGroup;

    // Sky-pointing Thermal Infrared Optical Depth Sensor barrel
    const tirsBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 12), darkMetalMat);
    tirsBarrel.position.set(0, 3.8, 0.2);
    tirsBarrel.rotation.x = -0.4;
    parent.add(tirsBarrel);
  }

  /**
   * Hematite Outcrop & Sample Caching Depot (MSR Astrobiology Loop)
   */
  buildMineralSampleDepot(parent, station) {
    const basaltMat = pbrFactory.getBasaltRockMaterial();
    const metalMat = pbrFactory.getAerospaceMetalMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
    const darkMetalMat = pbrFactory.getAerospaceMetalMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.35 });
    const titaniumTubeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.15
    });

    // Layered sedimentary bedrock slab
    const bedrock = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 0.5, 9), basaltMat);
    bedrock.position.y = 0.25;
    bedrock.rotation.y = 0.5;
    bedrock.receiveShadow = true;
    parent.add(bedrock);

    // Secondary rock shelf with hematite mineral vein
    const veinMat = new THREE.MeshStandardMaterial({
      color: 0x7c2d12, // Ferric hematite reddish-grey
      roughness: 0.55,
      metalness: 0.4
    });
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 1.4), veinMat);
    shelf.position.set(0.3, 0.55, 0.2);
    shelf.rotation.y = 0.3;
    parent.add(shelf);

    // Rotary sample caching carousel dock
    const carouselGroup = new THREE.Group();
    carouselGroup.position.set(-0.6, 0.7, -0.4);

    const carouselBase = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.7, 0.3, 16), darkMetalMat);
    carouselGroup.add(carouselBase);

    // 5 Hermetically sealed titanium sample tubes
    station.sampleTubes = [];
    for (let t = 0; t < 5; t++) {
      const angle = (t * Math.PI * 2) / 5;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.45, 12), titaniumTubeMat);
      tube.position.set(Math.sin(angle) * 0.42, 0.25, Math.cos(angle) * 0.42);
      tube.castShadow = true;
      carouselGroup.add(tube);
      station.sampleTubes.push(tube);
    }

    parent.add(carouselGroup);
    station.animatedPart = carouselGroup;

    // Robotic coring drill assembly
    const corerMast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8), metalMat);
    corerMast.position.set(0.8, 1.2, 0.6);
    parent.add(corerMast);

    const corerArm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.1), darkMetalMat);
    corerArm.position.set(0.5, 1.85, 0.5);
    corerArm.rotation.y = -0.5;
    parent.add(corerArm);
  }

  /**
   * Base Exterior Airlock Umbilical Terminal
   */
  buildAirlockTerminal(parent, station) {
    const metalMat = pbrFactory.getAerospaceMetalMaterial({ color: 0xdde2ea, metalness: 0.85, roughness: 0.25 });
    const darkMetalMat = pbrFactory.getAerospaceMetalMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.4 });
    const goldMLIMat = pbrFactory.getGoldMLIMaterial();

    // Upright console pedestal
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.7), metalMat);
    pedestal.position.y = 0.7;
    pedestal.castShadow = true;
    parent.add(pedestal);

    // Angled tactical interface screen
    const screenGeo = new THREE.PlaneGeometry(0.6, 0.4);
    const screenMat = pbrFactory.getEmissiveDisplayMaterial(0x38bdf8, 1.4);
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 1.2, 0.36);
    screen.rotation.x = -0.35;
    parent.add(screen);

    // High-pressure oxygen buffer sphere with Gold MLI thermal wrap
    const o2Sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), goldMLIMat);
    o2Sphere.position.set(0.9, 0.65, 0);
    o2Sphere.castShadow = true;
    parent.add(o2Sphere);

    // Heavy flexible umbilical hoses with brass coupling nozzles
    const hoseGeo1 = new THREE.TorusGeometry(0.4, 0.045, 8, 16, Math.PI * 1.2);
    const hoseMat = pbrFactory.getCarbonFiberMaterial();
    const hose1 = new THREE.Mesh(hoseGeo1, hoseMat);
    hose1.position.set(-0.55, 0.65, 0.35);
    hose1.rotation.y = Math.PI / 2;
    parent.add(hose1);

    const nozzleGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.25, 12);
    const nozzleMat = pbrFactory.getAerospaceMetalMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
    const nozzle1 = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzle1.position.set(-0.55, 0.3, 0.6);
    nozzle1.rotation.x = Math.PI / 4;
    parent.add(nozzle1);

    // LED Status indicator beacons
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.5
    });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), ledMat);
    led.position.set(0.35, 1.35, 0.32);
    parent.add(led);
    station.statusLed = ledMat;
  }

  /**
   * Floating AR Holographic Beacon
   */
  buildARBeacon(parent, station) {
    const beaconGroup = new THREE.Group();
    beaconGroup.position.set(0, station.beaconBaseHeight, 0);

    // 1. Faceted rotating outer diamond ring
    const ringGeo = new THREE.TorusGeometry(0.75, 0.035, 6, 8);
    const ringMat = new THREE.MeshStandardMaterial({
      color: station.beaconColor,
      emissive: station.beaconColor,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    beaconGroup.add(ring);

    // 2. Central floating octahedron crystal
    const crystalGeo = new THREE.OctahedronGeometry(0.38, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: station.beaconColor,
      emissiveIntensity: 1.4,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.9
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    beaconGroup.add(crystal);

    // 3. Glowing point light
    const pointLight = new THREE.PointLight(station.beaconColor, 1.2, 10.0, 1.5);
    pointLight.position.set(0, 0, 0);
    beaconGroup.add(pointLight);

    parent.add(beaconGroup);

    station.beacon = {
      group: beaconGroup,
      ring,
      crystal,
      pointLight,
      ringMat,
      crystalMat,
      baseY: station.beaconBaseHeight,
      baseColor: station.beaconColor
    };
  }

  /**
   * Updates beacons, mechanical rotations, cooldowns, and spatial proximity.
   * @param {number} dt Delta time in seconds
   * @param {THREE.Vector3} playerPosition Current focal position of player
   * @param {boolean} isRover True if player is controlling rover, false for astronaut
   * @returns {object|null} Active nearest interactable within trigger radius
   */
  update(dt, playerPosition, isRover = true) {
    this.totalTime += dt;

    let nearestTarget = null;
    let minDistance = Infinity;

    this.stations.forEach((station) => {
      // 1. Decrement cooldown
      if (station.cooldownRemaining > 0) {
        station.cooldownRemaining = Math.max(0, station.cooldownRemaining - dt);
      }

      // 2. Animate mechanical parts
      if (station.id === 'ice_drill_site' && station.animatedPart) {
        station.animatedPart.rotation.y += station.drillSpinSpeed * dt;
      } else if (station.id === 'solar_sweeper_hub' && station.animatedPart) {
        station.animatedPart.rotation.z = Math.sin(this.totalTime * 1.5) * 0.12;
      } else if (station.id === 'weather_station_post') {
        if (station.animatedPart) {
          station.animatedPart.rotation.y += station.anemometerSpinSpeed * dt;
        }
        if (station.vanePart) {
          station.vanePart.rotation.y = Math.sin(this.totalTime * 0.8) * 0.35;
        }
      }

      // 3. Animate AR Holographic Beacon
      if (station.beacon) {
        const b = station.beacon;
        // Bobbing & rotating
        b.group.position.y = b.baseY + Math.sin(this.totalTime * 2.2 + station.beaconColor) * 0.22;
        b.ring.rotation.z += 1.2 * dt;
        b.crystal.rotation.y += 1.6 * dt;
        b.crystal.rotation.x = Math.sin(this.totalTime * 1.8) * 0.25;

        // Pulse intensity
        const pulse = 1.0 + Math.sin(this.totalTime * 3.2) * 0.3;
        b.pointLight.intensity = (station.cooldownRemaining > 0) ? 0.3 : (1.2 * pulse);

        if (station.cooldownRemaining > 0) {
          b.ringMat.color.setHex(0x64748b);
          b.crystalMat.emissive.setHex(0x64748b);
        } else {
          b.ringMat.color.setHex(b.baseColor);
          b.crystalMat.emissive.setHex(b.baseColor);
        }
      }

      // 4. Proximity detection
      if (playerPosition) {
        const dx = playerPosition.x - station.position.x;
        const dz = playerPosition.z - station.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const radius = isRover ? station.triggerRadiusRover : station.triggerRadiusAstronaut;

        if (dist <= radius && dist < minDistance) {
          minDistance = dist;
          nearestTarget = {
            station,
            distance: dist,
            inRange: true,
            isReady: station.cooldownRemaining <= 0,
            cooldownRemaining: station.cooldownRemaining
          };
        }
      }
    });

    // 5. Beacon highlight for active target
    this.stations.forEach((s) => {
      if (s.beacon) {
        const isActive = nearestTarget && (nearestTarget.station.id === s.id);
        const targetScale = isActive ? 1.3 : 1.0;
        s.beacon.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
        if (isActive && s.cooldownRemaining <= 0) {
          s.beacon.pointLight.intensity = 2.5;
        }
      }
    });

    this.activeTarget = nearestTarget;
    return this.activeTarget;
  }

  /**
   * Executes the active interaction if player is in range.
   * @param {THREE.Vector3} playerPosition Current focal position of player
   * @param {boolean} isRover True if player is controlling rover, false for astronaut
   * @returns {object} Execution result payload
   */
  triggerActiveInteraction(playerPosition, isRover = true) {
    if (!this.activeTarget || !this.activeTarget.station) {
      return {
        success: false,
        reason: 'no_target',
        message: 'No surface station within interaction proximity.'
      };
    }

    const target = this.activeTarget.station;

    // Cooldown check
    if (target.cooldownRemaining > 0) {
      return {
        success: false,
        reason: 'cooldown',
        station: target,
        message: `${target.name} is recycling. Ready in ${Math.ceil(target.cooldownRemaining)}s.`
      };
    }

    // Set cooldown duration
    target.cooldownRemaining = target.actionCooldownSec;
    target.usedThisSol = true;

    // Flare visual feedback on beacon
    if (target.beacon && target.beacon.pointLight) {
      target.beacon.pointLight.intensity = 5.0;
    }

    // Special animation trigger on station
    if (target.id === 'mineral_sample_cache' && target.animatedPart) {
      target.animatedPart.rotation.y += (Math.PI * 2) / 5;
    } else if (target.id === 'weather_station_post') {
      target.anemometerSpinSpeed = 12.0;
      setTimeout(() => { target.anemometerSpinSpeed = 4.0; }, 3500);
    }

    const result = {
      success: true,
      stationId: target.id,
      stationName: target.name,
      actionId: target.actionId,
      delta: { ...target.delta },
      message: target.successMessage
    };

    if (typeof this.onInteractionCallback === 'function') {
      this.onInteractionCallback(result);
    }

    return result;
  }

  /**
   * Resets station cooldowns and usage flags when a new sol begins.
   * @param {number} solNumber Sol number (1 to 30)
   */
  onNewSol(solNumber) {
    this.stations.forEach((s) => {
      s.cooldownRemaining = 0;
      s.usedThisSol = false;
      if (s.statusLed) {
        s.statusLed.color.setHex(0x10b981);
        s.statusLed.emissive.setHex(0x10b981);
      }
    });
  }

  /**
   * Resets all stations and state to Sol 1 baseline.
   */
  resetAll() {
    this.totalTime = 0;
    this.activeTarget = null;
    this.stations.forEach((s) => {
      s.cooldownRemaining = 0;
      s.usedThisSol = false;
    });
  }

  /**
   * Cleans up Three.js meshes, geometries, and materials.
   */
  dispose() {
    if (this.rootGroup && this.scene) {
      this.scene.remove(this.rootGroup);
    }
  }
}
