/**
 * Automated Verification Suite for Phase 1: Asset Pipeline & PBR Foundation
 * Tests:
 * 1. PBRMaterialFactory procedural material and normal map generation
 * 2. AssetManager glTF loader initialization and fallback handling
 * 3. 6-Wheel Rocker-Bogie Mars Exploration Rover (MarsRover) geometry and kinematics
 * 4. TerrainManager PBR integration and smooth normal shading
 * 5. HTML Importmap configuration for native ES module asset loading
 */

import assert from 'assert';
import fs from 'fs';
import * as THREE from 'three';
import { PBRMaterialFactory, pbrFactory } from '../js/engine/graphics/pbrMaterials.js';
import { AssetManager, assetManager } from '../js/engine/assets/assetManager.js';
import { MarsRover } from '../js/engine/entities/rover.js';
import { TerrainManager } from '../js/engine/terrain/terrainManager.js';

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log('\n--- RUNNING PHASE 1 ASSET PIPELINE & PBR TEST SUITE ---\n');

  // =========================================================================
  // 1. PBR MATERIAL FACTORY TESTS
  // =========================================================================
  test('PBRMaterialFactory instantiates and initializes', () => {
    assert(pbrFactory instanceof PBRMaterialFactory, 'pbrFactory is instance of PBRMaterialFactory');
    assert(pbrFactory.materialCache instanceof Map, 'materialCache is initialized');
  });

  test('PBR Regolith Material contains albedo, normalMap, and roughnessMap', () => {
    const regolith = pbrFactory.getRegolithMaterial({ repeatX: 4, repeatY: 4 });
    assert(regolith instanceof THREE.MeshStandardMaterial, 'Returns MeshStandardMaterial');
    assert(regolith.map, 'Albedo map is attached');
    assert(regolith.normalMap, 'Tangent-space normalMap is attached');
    assert(regolith.roughnessMap, 'RoughnessMap is attached');
    assert(regolith.roughness >= 0.85, 'Calibrated high regolith roughness');
    assert.strictEqual(regolith.flatShading, false, 'Smooth planetary shading active');
  });

  test('PBR Basalt Rock Material has high roughness and micro-pitting normal scale', () => {
    const basalt = pbrFactory.getBasaltRockMaterial();
    assert(basalt instanceof THREE.MeshStandardMaterial, 'Returns MeshStandardMaterial');
    assert(basalt.normalMap, 'Basalt normal map attached');
    assert(basalt.normalScale.x >= 1.5, 'Pronounced vesicular relief');
  });

  test('PBR Gold Kapton MLI Material has high reflectivity and low roughness', () => {
    const mli = pbrFactory.getGoldMLIMaterial();
    assert(mli instanceof THREE.MeshStandardMaterial, 'Returns MeshStandardMaterial');
    assert(mli.metalness >= 0.9, 'Gold foil is highly metallic');
    assert(mli.roughness <= 0.35, 'Gold foil has sharp specular reflections');
    assert(mli.normalMap, 'Creased blanket normal map attached');
  });

  test('PBR Photovoltaic Solar Material has deep space color and high metalness', () => {
    const solar = pbrFactory.getSolarPanelMaterial();
    assert(solar instanceof THREE.MeshStandardMaterial, 'Returns MeshStandardMaterial');
    assert(solar.metalness >= 0.85, 'Silicon conductive metalness');
    assert(solar.roughness <= 0.25, 'Anti-reflective glass smoothness');
  });

  test('PBR Aerospace Metal and Carbon Fiber Materials generate successfully', () => {
    const titanium = pbrFactory.getAerospaceMetalMaterial({ color: 0x475569, metalness: 0.85 });
    assert(titanium.metalness === 0.85, 'Custom metalness respected');

    const carbon = pbrFactory.getCarbonFiberMaterial();
    assert(carbon.map, 'Woven carbon twill map attached');
  });

  test('PBR Polycarbonate Dome Material has optical transmission and transparency', () => {
    const domeMat = pbrFactory.getPolycarbonateDomeMaterial();
    assert(domeMat.transparent === true, 'Dome is transparent');
    assert(domeMat.opacity <= 0.5, 'Appropriate low opacity');
    assert.strictEqual(domeMat.depthWrite, false, 'depthWrite false for proper glass sorting');
  });

  test('PBR Emissive Display Material produces active screen glow', () => {
    const hudMat = pbrFactory.getEmissiveDisplayMaterial(0x38bdf8, 2.5);
    assert(hudMat.emissive instanceof THREE.Color, 'Emissive color assigned');
    assert(hudMat.emissiveIntensity === 2.5, 'Emissive intensity calibrated');
  });

  // =========================================================================
  // 2. ASSET MANAGER & GLTF LOADER TESTS
  // =========================================================================
  test('AssetManager instantiates and initializes runtime loaders', async () => {
    const mgr = new AssetManager();
    await mgr.initLoaders();
    assert.strictEqual(mgr.isLoaderInitialized, true, 'Loaders initialized');
    assert(mgr.gltfLoader !== null, 'GLTFLoader is created');
  });

  test('AssetManager handles missing or invalid model URLs gracefully', async () => {
    const mgr = new AssetManager();
    const result = await mgr.loadModel('non_existent_rover_cad_model.glb');
    assert.strictEqual(result, null, 'Returns null on error without throwing uncaught exceptions');
  });

  // =========================================================================
  // 3. ELEVATED MARS EXPLORATION ROVER TESTS
  // =========================================================================
  const mockScene = new THREE.Scene();
  const mockPhysics = {
    clampToSurface: (pos, offset = 0) => { pos.y = offset; },
    alignVehicleToTerrain: (pos, heading, quat) => {}
  };

  test('MarsRover builds authentic 6-wheel rocker-bogie exploration vehicle', () => {
    const rover = new MarsRover(mockScene, mockPhysics);
    assert(rover.mesh instanceof THREE.Group, 'Root mesh is THREE.Group');
    assert.strictEqual(rover.wheels.length, 6, 'Contains exactly 6 mobility wheels');
    assert.strictEqual(rover.steeringKnuckles.length, 4, 'Contains 4 active corner steering knuckles');
    assert(rover.mastHead instanceof THREE.Group, 'Remote Sensing Mast head present');
    assert(rover.antennaDish instanceof THREE.Group, 'High-Gain Antenna dish present');
  });

  test('MarsRover update integrates throttle, steering, wheel roll and friction', () => {
    const rover = new MarsRover(mockScene, mockPhysics);
    const initialZ = rover.position.z;

    // Simulate forward driving (W key)
    rover.update(0.1, { KeyW: true, KeyA: false, KeyS: false, KeyD: false });
    assert(rover.speed > 0, 'Rover accelerated forward');
    assert(rover.position.z !== initialZ, 'Rover moved along forward axis');

    // Simulate steering (A key)
    rover.update(0.1, { KeyW: true, KeyA: true, KeyS: false, KeyD: false });
    assert(rover.steeringAngle !== 0, 'Active steering angle applied to knuckles');

    // Simulate braking / friction (no keys)
    const movingSpeed = rover.speed;
    rover.update(0.2, { KeyW: false, KeyA: false, KeyS: false, KeyD: false });
    assert(rover.speed < movingSpeed, 'Rolling friction decelerates vehicle');
  });

  test('MarsRover updateChaseCamera smoothly tracks position', () => {
    const rover = new MarsRover(mockScene, mockPhysics);
    const cam = new THREE.PerspectiveCamera(60, 1.5, 0.1, 1000);
    cam.position.set(0, 0, 0);

    rover.updateChaseCamera(cam);
    assert(cam.position.x !== 0 || cam.position.y !== 0 || cam.position.z !== 0, 'Chase camera positioned behind vehicle');
  });

  test('MarsRover dispose cleans up resources cleanly', () => {
    const rover = new MarsRover(mockScene, mockPhysics);
    rover.dispose();
    assert(!mockScene.children.includes(rover.mesh), 'Rover mesh removed from scene on dispose');
  });

  // =========================================================================
  // 4. TERRAIN MANAGER PBR INTEGRATION
  // =========================================================================
  test('TerrainManager initializes with PBR materials and instanced boulders', () => {
    const tm = new TerrainManager(mockScene, { chunkSize: 100 });
    assert(tm.terrainMaterial instanceof THREE.MeshStandardMaterial, 'Terrain material is MeshStandardMaterial');
    assert(tm.terrainMaterial.normalMap, 'Terrain material uses normalMap for regolith micro-relief');

    tm.initRockScatter(20);
    assert(tm.instancedRocks instanceof THREE.InstancedMesh, 'Instanced boulders created');
    assert.strictEqual(tm.instancedRocks.count, 20, 'Boulder count matches');
    tm.dispose();
  });

  // =========================================================================
  // 5. HTML & INFRASTRUCTURE INTEGRATION
  // =========================================================================
  test('index.html contains valid ES module importmap for Three.js and addons', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    assert(html.includes('<script type="importmap">'), 'index.html contains importmap tag');
    assert(html.includes('"three":'), 'importmap defines "three" entry');
    assert(html.includes('"three/addons/":'), 'importmap defines "three/addons/" entry');
  });

  console.log(`\nTEST SUMMARY: ${passedTests} Passed, ${totalTests - passedTests} Failed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests();
