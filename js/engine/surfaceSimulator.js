/**
 * Mars Surface Simulation & 3D Environment Coordinator (Segment 4)
 * Combines chunked terrain streaming, rover vehicle dynamics, astronaut 0.38g surface EVA,
 * diurnal solar tracking, and GPU dust storm particle systems.
 */

import { TerrainManager } from './terrain/terrainManager.js';
import { MarsAtmosphere } from './graphics/marsAtmosphere.js';
import { DustStormVFX } from './graphics/dustStormVFX.js';
import { SurfacePhysics } from './physics/surfacePhysics.js';
import { MarsRover } from './entities/rover.js';

export class MarsSurfaceSimulator {
  constructor(canvasContainer) {
    this.container = canvasContainer;

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.terrain = null;
    this.atmosphere = null;
    this.dustVFX = null;
    this.physics = null;
    this.rover = null;

    // Camera modes: 'rover' | 'astronaut' | 'orbit'
    this.cameraMode = 'rover';

    // Astronaut surface entity for EVA mode
    this.astronaut = {
      position: new THREE.Vector3(0, 2, 42),
      velocity: new THREE.Vector3(0, 0, 0),
      heading: 0,
      pitch: 0,
      isGrounded: true
    };

    // User input state
    this.inputKeys = {
      KeyW: false,
      KeyA: false,
      KeyS: false,
      KeyD: false,
      Space: false,
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false
    };

    this.isInitialized = false;
    this.isRendering = false;
    this.animationFrameId = null;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || (window.innerHeight - 180);

    // 1. Three.js Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.5, 1000);
    this.camera.position.set(0, 10, 75);

    // 2. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // 3. Subsystem Managers
    this.terrain = new TerrainManager(this.scene);
    this.terrain.initRockScatter(150);

    this.atmosphere = new MarsAtmosphere(this.scene, this.renderer);
    this.dustVFX = new DustStormVFX(this.scene, 3000);
    this.physics = new SurfacePhysics(this.terrain);

    // 4. Habitat Exterior Model at center (0,0,0)
    this.buildBaseExteriorModel();

    // 5. Mars Exploration Rover
    this.rover = new MarsRover(this.scene, this.physics);

    // 6. Setup input & window resize handlers
    this.setupEventListeners();
    this.isInitialized = true;
  }

  buildBaseExteriorModel() {
    const baseGroup = new THREE.Group();

    // Transparent geodesic bio-dome
    const domeGeo = new THREE.SphereGeometry(32, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      transmission: 0.85,
      thickness: 1.2,
      depthWrite: false
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 0;
    baseGroup.add(dome);

    // Structural geodesic frame rings
    const ringGeo = new THREE.TorusGeometry(32.1, 0.4, 8, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    baseGroup.add(ring);

    // Airlock Ingress Portal at South Perimeter (z = 32)
    const portalGeo = new THREE.CylinderGeometry(3.5, 3.5, 6, 16);
    portalGeo.rotateX(Math.PI / 2);
    const portalMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.7, roughness: 0.3 });
    const portal = new THREE.Mesh(portalGeo, portalMat);
    portal.position.set(0, 2.2, 32);
    portal.castShadow = true;
    baseGroup.add(portal);

    // Solar array farm adjacent to base
    const panelGeo = new THREE.BoxGeometry(6, 0.2, 12);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a2a40, metalness: 0.8, roughness: 0.2 });
    for (let i = -1; i <= 1; i++) {
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(45 + i * 8, 1.5, -20);
      panel.rotation.x = -0.25;
      panel.castShadow = true;
      baseGroup.add(panel);
    }

    this.scene.add(baseGroup);
  }

  setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.code in this.inputKeys) {
        this.inputKeys[e.code] = true;
      }
      if (e.code === 'KeyV') {
        this.toggleCameraMode();
      }
      if (e.code === 'Space' && this.cameraMode === 'astronaut' && this.astronaut.isGrounded) {
        // 0.38g Leap
        this.astronaut.velocity.y = 4.8;
        this.astronaut.isGrounded = false;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code in this.inputKeys) {
        this.inputKeys[e.code] = false;
      }
    });

    window.addEventListener('resize', () => {
      if (!this.container || !this.renderer || !this.camera) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (w > 0 && h > 0) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      }
    });
  }

  toggleCameraMode() {
    if (this.cameraMode === 'rover') {
      this.cameraMode = 'astronaut';
    } else if (this.cameraMode === 'astronaut') {
      this.cameraMode = 'orbit';
    } else {
      this.cameraMode = 'rover';
    }
  }

  setCameraMode(mode) {
    if (['rover', 'astronaut', 'orbit'].includes(mode)) {
      this.cameraMode = mode;
    }
  }

  /**
   * Main render and physics frame step.
   * @param {number} dt Delta time in seconds
   * @param {number} solProgress In-sol cycle progress (0.0 to 1.0)
   * @param {number} stormOpacityTau Atmospheric dust opacity (Tau)
   */
  update(dt, solProgress = 0.2, stormOpacityTau = 0.5) {
    if (!this.isInitialized) return;

    // 1. Update Rover kinematics & controls
    this.rover.update(dt, this.inputKeys);

    // 2. Update Astronaut kinematics (if active or near)
    if (this.cameraMode === 'astronaut') {
      this.updateAstronautControls(dt);
    }

    // 3. Active focal position for dynamic terrain chunking & particles
    const focalPos = (this.cameraMode === 'astronaut') ? this.astronaut.position : this.rover.position;

    // 4. Update chunk terrain around focal position
    this.terrain.update(focalPos);

    // 5. Update diurnal Martian sky, sun orbit, and lighting
    this.atmosphere.update(solProgress, stormOpacityTau);

    // 6. Update GPU dust particles
    this.dustVFX.update(dt, focalPos, stormOpacityTau);

    // 7. Update Camera View based on active mode
    if (this.cameraMode === 'rover') {
      this.rover.updateChaseCamera(this.camera);
    } else if (this.cameraMode === 'astronaut') {
      this.camera.position.set(
        this.astronaut.position.x,
        this.astronaut.position.y,
        this.astronaut.position.z
      );
      const lookX = this.astronaut.position.x + Math.sin(this.astronaut.heading);
      const lookZ = this.astronaut.position.z + Math.cos(this.astronaut.heading);
      this.camera.lookAt(lookX, this.astronaut.position.y, lookZ);
    } else if (this.cameraMode === 'orbit') {
      // High-angle tactical orbital camera looking at base center
      this.camera.position.set(0, 85, 120);
      this.camera.lookAt(0, 0, 0);
    }

    // 8. Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  updateAstronautControls(dt) {
    let moveForward = 0;
    let turn = 0;

    if (this.inputKeys.KeyW || this.inputKeys.ArrowUp) moveForward += 1;
    if (this.inputKeys.KeyS || this.inputKeys.ArrowDown) moveForward -= 1;
    if (this.inputKeys.KeyA || this.inputKeys.ArrowLeft) turn += 1;
    if (this.inputKeys.KeyD || this.inputKeys.ArrowRight) turn -= 1;

    this.astronaut.heading += turn * 2.0 * dt;

    if (moveForward !== 0) {
      const walkSpeed = 4.2; // m/s surface stride
      this.astronaut.velocity.x = Math.sin(this.astronaut.heading) * moveForward * walkSpeed;
      this.astronaut.velocity.z = Math.cos(this.astronaut.heading) * moveForward * walkSpeed;
    }

    this.physics.updateAstronautPhysics(this.astronaut, dt, 1.7);
  }

  dispose() {
    if (this.terrain) this.terrain.dispose();
    if (this.atmosphere) this.atmosphere.dispose();
    if (this.dustVFX) this.dustVFX.dispose();
    if (this.rover) this.rover.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    this.isInitialized = false;
  }
}
