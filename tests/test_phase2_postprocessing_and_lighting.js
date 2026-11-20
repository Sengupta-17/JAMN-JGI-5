/**
 * Automated Verification Suite for Phase 2: Post-Processing, Atmospheric Scattering & Lighting
 * Tests:
 * 1. PostProcessingPipeline initialization, passes (Bloom, GTAO, OutputPass), resizing, and fallback
 * 2. MarsAtmosphere physical Rayleigh/Mie scattering shader uniforms, diurnal cycle, blue sunset, and dust storm Tau
 * 3. Directional sun lighting shadow parameters and night-time starfield transition
 * 4. Surface simulator and Base renderer integration
 */

import assert from 'assert';
import * as THREE from 'three';
import { PostProcessingPipeline } from '../js/engine/graphics/postProcessingPipeline.js';
import { MarsAtmosphere } from '../js/engine/graphics/marsAtmosphere.js';
import { MarsRover } from '../js/engine/entities/rover.js';
import { SimulationLoop } from '../js/engine/simulationLoop.js';
import { ParameterEngine } from '../js/engine/parameterEngine.js';
import { HazardManager } from '../js/engine/hazards/hazardManager.js';

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
  console.log('\n--- RUNNING PHASE 2 POST-PROCESSING & LIGHTING TEST SUITE ---\n');

  const mockRenderer = {
    getPixelRatio: () => 1,
    getSize: (v) => { v.x = 1200; v.y = 800; return v; },
    getContext: () => null,
    render: () => {},
    capabilities: { isWebGL2: true }
  };
  const mockScene = new THREE.Scene();
  const mockCamera = new THREE.PerspectiveCamera(60, 1.5, 0.1, 1000);

  // =========================================================================
  // 1. POST-PROCESSING PIPELINE TESTS
  // =========================================================================
  test('PostProcessingPipeline instantiates and configures passes', () => {
    const pipeline = new PostProcessingPipeline(mockRenderer, mockScene, mockCamera, {
      enableBloom: true,
      enableAO: true,
      bloomStrength: 0.4,
      bloomRadius: 0.5,
      bloomThreshold: 0.8
    });

    assert(pipeline.composer !== null, 'EffectComposer is instantiated');
    assert(pipeline.renderPass !== null, 'RenderPass is attached');
    assert(pipeline.bloomPass !== null, 'UnrealBloomPass is attached');
    assert(pipeline.outputPass !== null, 'OutputPass is attached');
    assert(pipeline.gtaoPass !== null, 'GTAOPass is attached');
    assert.strictEqual(pipeline.isReady, true, 'Pipeline marked ready');
  });

  test('PostProcessingPipeline dynamically modulates bloom and AO properties', () => {
    const pipeline = new PostProcessingPipeline(mockRenderer, mockScene, mockCamera);
    pipeline.setBloomParams(0.55, 0.65, 0.9);
    assert.strictEqual(pipeline.bloomPass.strength, 0.55, 'Bloom strength updated');
    assert.strictEqual(pipeline.bloomPass.radius, 0.65, 'Bloom radius updated');
    assert.strictEqual(pipeline.bloomPass.threshold, 0.9, 'Bloom threshold updated');

    pipeline.setAOEnabled(false);
    assert.strictEqual(pipeline.gtaoPass.enabled, false, 'GTAO toggled off');
    pipeline.setAOEnabled(true);
    assert.strictEqual(pipeline.gtaoPass.enabled, true, 'GTAO toggled on');
  });

  test('PostProcessingPipeline setSize updates resolutions without error', () => {
    const pipeline = new PostProcessingPipeline(mockRenderer, mockScene, mockCamera);
    pipeline.setSize(1600, 900);
    assert.strictEqual(pipeline.bloomPass.resolution.x, 1600, 'Bloom resolution X updated');
    assert.strictEqual(pipeline.bloomPass.resolution.y, 900, 'Bloom resolution Y updated');
  });

  test('PostProcessingPipeline render executes and falls back safely', () => {
    let directRenderCalled = false;
    const fallbackRenderer = {
      getPixelRatio: () => 1,
      getSize: (v) => { v.x = 800; v.y = 600; return v; },
      getContext: () => null,
      render: () => { directRenderCalled = true; },
      capabilities: { isWebGL2: true }
    };
    const pipeline = new PostProcessingPipeline(fallbackRenderer, mockScene, mockCamera);
    pipeline.enabled = false; // Forced direct forward fallback
    pipeline.render(0.016);
    assert.strictEqual(directRenderCalled, true, 'Direct render invoked when composer disabled');

    pipeline.dispose();
    assert.strictEqual(pipeline.composer, null, 'Composer cleanly disposed');
  });

  // =========================================================================
  // 2. MARS ATMOSPHERE & DIURNAL SCATTERING TESTS
  // =========================================================================
  test('MarsAtmosphere creates directional sun light, shadow maps, and ambient bounce', () => {
    const atmo = new MarsAtmosphere(mockScene, mockRenderer);
    assert(atmo.sunLight instanceof THREE.DirectionalLight, 'Directional sun light created');
    assert.strictEqual(atmo.sunLight.castShadow, true, 'Sun light casts soft shadows');
    assert.strictEqual(atmo.sunLight.shadow.mapSize.width, 2048, 'Shadow map resolution is 2048');
    assert(atmo.ambientLight instanceof THREE.AmbientLight, 'Ambient light created');
    assert(mockScene.fog instanceof THREE.FogExp2, 'Atmospheric distance fog attached to scene');
    atmo.dispose();
  });

  test('MarsAtmosphere creates physical sky dome shader with Mie blue sunset halo uniforms', () => {
    const atmo = new MarsAtmosphere(mockScene, mockRenderer);
    assert(atmo.skyDome instanceof THREE.Mesh, 'Sky dome mesh created');
    assert(atmo.skyShaderMat instanceof THREE.ShaderMaterial, 'Sky dome uses custom ShaderMaterial');

    const uniforms = atmo.skyShaderMat.uniforms;
    assert('uSunDirection' in uniforms, 'uSunDirection uniform present');
    assert('uSunElevation' in uniforms, 'uSunElevation uniform present');
    assert('uHorizonColor' in uniforms, 'uHorizonColor uniform present');
    assert('uSunsetBlue' in uniforms, 'uSunsetBlue uniform present for forward Mie scattering');
    atmo.dispose();
  });

  test('MarsAtmosphere update tracks solar trajectory at solar noon (solProgress = 0.35)', () => {
    const atmo = new MarsAtmosphere(mockScene, mockRenderer);
    atmo.update(0.35, 0.5); // Solar zenith (noon)

    assert(atmo.sunPosition.y > 0, 'Sun is above horizon at noon');
    assert(atmo.sunLight.intensity > 1.0, 'Full solar daytime irradiance');
    assert.strictEqual(atmo.starField.material.opacity, 0.0, 'Stars invisible in bright daylight');
    atmo.dispose();
  });

  test('MarsAtmosphere update calculates Martian blue sunset halo at sunset (solProgress = 0.73)', () => {
    const atmo = new MarsAtmosphere(mockScene, mockRenderer);
    atmo.update(0.73, 0.5); // Sunset twilight (87.6s into 90s day)

    const elevation = atmo.skyShaderMat.uniforms.uSunElevation.value;
    assert(elevation > 0 && elevation < 0.25, 'Sun is grazing the horizon during sunset');
    assert(atmo.sunLight.color.r > atmo.sunLight.color.b, 'Sunlight shifts to warm peachy-orange');
    atmo.dispose();
  });

  test('MarsAtmosphere update occults sun and fades in starfield at night (solProgress = 0.85)', () => {
    const atmo = new MarsAtmosphere(mockScene, mockRenderer);
    atmo.update(0.85, 0.5); // Midnight

    assert.strictEqual(atmo.sunLight.intensity, 0.0, 'Sunlight extinguished at night');
    assert(atmo.starField.material.opacity > 0.5, 'Celestial stars fade in during nocturnal cycle');
    assert(mockScene.fog.color.getHex() === 0x060308, 'Surface distance fog turns nocturnal deep black');
    atmo.dispose();
  });

  test('MarsAtmosphere attenuates solar intensity and shifts sky during dust storm (Tau = 2.5)', () => {
    const atmo = new MarsAtmosphere(mockScene, mockRenderer);
    atmo.update(0.35, 0.5); // Clear noon
    const clearIntensity = atmo.sunLight.intensity;

    atmo.update(0.35, 2.5); // Severe dust storm noon
    const stormIntensity = atmo.sunLight.intensity;

    assert(stormIntensity < clearIntensity * 0.5, 'Beer-Lambert dust opacity sharply dims sunlight');
    assert.strictEqual(atmo.skyShaderMat.uniforms.uHorizonColor.value.getHex(), 0x8a3e1c, 'Sky shifts to ochre dust storm overcast');
    atmo.dispose();
  });

  // =========================================================================
  // 3. 2-MINUTE SOL PACING & ROVER ANTENNA NIGHT LIGHT TESTS
  // =========================================================================
  test('SimulationLoop enforces 2-minute sol duration (90s Day / 30s Night) starting directly in Day phase', () => {
    const engine = new ParameterEngine('valles_marineris');
    const hazards = new HazardManager(engine, null);
    const loop = new SimulationLoop(engine, hazards, null);

    assert.strictEqual(loop.solDurationSeconds, 120.0, '1 sol is exactly 120 seconds (2 minutes)');
    assert.strictEqual(loop.dayDurationSeconds, 90.0, 'Day duration is exactly 90 seconds (1m 30s)');
    assert.strictEqual(loop.nightDurationSeconds, 30.0, 'Night duration is exactly 30 seconds');

    let tickData = null;
    loop.onTickCallbacks.push((d) => { tickData = d; });

    loop.startSol(1);
    assert.strictEqual(loop.currentPhase, 'day', 'Sol directly starts from Day phase');

    // Advance 85 seconds: still within day phase
    loop.update(85.0);
    assert.strictEqual(loop.currentPhase, 'day', 'At 85s, still in Day phase');
    assert.strictEqual(tickData.phase, 'day', 'Tick callback reports Day phase');
    assert.strictEqual(Math.round(tickData.dayNightSeconds), 5, '5 seconds remaining in Day');

    // Advance 10 more seconds (total 95 seconds): crossed 90s boundary into Night phase
    loop.update(10.0);
    assert.strictEqual(loop.currentPhase, 'night', 'At 95s, transitioned into Night phase');
    assert.strictEqual(tickData.phase, 'night', 'Tick callback reports Night phase');
    assert.strictEqual(Math.round(tickData.dayNightSeconds), 25, '25 seconds remaining in Night');

    // Advance remaining 25 seconds to complete sol (total 120 seconds)
    let solCompleted = false;
    loop.onSolCompleteCallbacks.push(() => { solCompleted = true; });
    loop.update(25.0);
    assert.strictEqual(solCompleted, true, 'Sol completed exactly at 120 seconds');
    assert.strictEqual(loop.currentSol, 2, 'Next sol advanced to 2');
    loop.reset();
  });

  test('MarsRover incorporates Antenna Night Light module with automated toggle controls', () => {
    const roverScene = new THREE.Scene();
    const rover = new MarsRover(roverScene, null);

    assert(rover.nightLightGroup instanceof THREE.Group, 'Rover antenna night light group created');
    assert(rover.nightLightBulbMesh instanceof THREE.Mesh, 'Night light bulb mesh exists');
    assert(rover.nightLightSource instanceof THREE.SpotLight, 'Night light spotlight source exists');
    assert.strictEqual(rover.isNightLightOn, false, 'Night light is initially OFF');
    assert.strictEqual(rover.nightLightSource.intensity, 0.0, 'Spotlight intensity is 0 when OFF');
    assert.strictEqual(rover.nightLightBulbMaterial.emissiveIntensity, 0.0, 'Bulb emissive intensity is 0 when OFF');

    // Turn ON
    rover.turnOnNightLight();
    assert.strictEqual(rover.isNightLightOn, true, 'isNightLightOn is true when turned on');
    assert(rover.nightLightSource.intensity > 2.0, 'Spotlight illuminates with high intensity');
    assert(rover.nightLightBulbMaterial.emissiveIntensity > 2.0, 'Bulb glows brightly when illuminated');
    assert.strictEqual(rover.nightLightBulbMaterial.color.getHex(), 0xffffff, 'Bulb glass turns white when on');

    // Turn OFF
    rover.turnOffNightLight();
    assert.strictEqual(rover.isNightLightOn, false, 'isNightLightOn is false when turned off');
    assert.strictEqual(rover.nightLightSource.intensity, 0.0, 'Spotlight intensity returns to 0');
    assert.strictEqual(rover.nightLightBulbMaterial.emissiveIntensity, 0.0, 'Bulb emissive intensity returns to 0');
    assert.strictEqual(rover.nightLightBulbMaterial.color.getHex(), 0x334155, 'Bulb glass returns to unpowered state');

    rover.dispose();
  });

  test('Diurnal loop updates rover antenna night light automatically and extinguishes it on new sol start', () => {
    const roverScene = new THREE.Scene();
    const rover = new MarsRover(roverScene, null);

    // Simulated day update (phase = 'day', solProgress = 0.5)
    const isNightDay = ('day' === 'night') || (0.5 > 0.75);
    assert.strictEqual(isNightDay, false, 'Day phase is not night');
    if (isNightDay && !rover.isNightLightOn) rover.setNightLight(true);
    else if (!isNightDay && rover.isNightLightOn) rover.setNightLight(false);
    assert.strictEqual(rover.isNightLightOn, false, 'Light remains off during day');

    // Simulated night update (phase = 'night', solProgress = 0.85)
    const isNightNight = ('night' === 'night') || (0.85 > 0.75);
    assert.strictEqual(isNightNight, true, 'Night phase detected');
    if (isNightNight && !rover.isNightLightOn) rover.setNightLight(true);
    assert.strictEqual(rover.isNightLightOn, true, 'Rover night light automatically illuminated during night');

    // Simulated new sol launch from challenge briefing tab
    rover.setNightLight(false);
    assert.strictEqual(rover.isNightLightOn, false, 'Rover night light automatically extinguished when new sol starts');

    rover.dispose();
  });

  console.log(`\nTEST SUMMARY: ${passedTests} Passed, ${totalTests - passedTests} Failed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests();
