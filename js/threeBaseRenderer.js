/**
 * Three.js First-Person Base Renderer
 * Renders the habitat interior, exterior Martian landscape, greenhouse dome, and subsystem modules.
 */

import { sound } from './audio.js';

const THREE = typeof window !== 'undefined' ? window.THREE : null;

export class ThreeBaseRenderer {
  constructor(containerId, physicsEngine) {
    this.container = document.getElementById(containerId);
    this.physics = physicsEngine;
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // First-person camera orientation
    this.yaw = 0;   // horizontal rotation (radians)
    this.pitch = 0; // vertical tilt (radians)
    
    this.isPointerLocked = false;
    this.keys = {
      KeyW: false, KeyS: false, KeyA: false, KeyD: false,
      ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
      Space: false
    };

    this.activeIssues = new Set();
    this.animatedObjects = [];
    this.hologramMarkers = [];
    this.clock = THREE ? new THREE.Clock() : null;

    // Interactive Door State
    this.isDoorOpen = false;
    this.doorAnimProgress = 0.0; // 0.0 = closed, 1.0 = fully open
    this.doorGroup = null;
    this.doorStatusBeacon = null;

    // Callbacks
    this.onInteractCallback = null;
    this.onMenuToggleCallback = null;
    this.onEscapeCallback = null;

    if (THREE) {
      this.init();
    }
  }

  init() {
    if (!this.container || !THREE) return;

    try {
      const width = this.container.clientWidth || window.innerWidth || 1200;
      const height = this.container.clientHeight || window.innerHeight || 800;

      // 1. Scene & Camera
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xb25329); // Martian atmospheric orange horizon
      this.scene.fog = new THREE.FogExp2(0x9a3e1d, 0.006); // Soft atmospheric dust haze

      this.camera = new THREE.PerspectiveCamera(74, width / height, 0.1, 300);
      this.camera.position.set(this.physics.position.x, this.physics.position.y, this.physics.position.z);

      // 2. WebGL Renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (THREE.ACESFilmicToneMapping) {
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
      }
      this.container.appendChild(this.renderer.domElement);

      // 3. Habitat Architecture & Modules
      this.setupLighting();
      this.buildExternalMartianLandscape();
      this.buildGeodesicDomeCeiling();
      this.buildFloorAndBulkheads();
      this.buildCentralPlanterAndMast();
      this.buildCommandDeck();
      this.buildEclssSubsystem();
      this.buildHydroponicsSubsystem();
      this.buildWaterAndPowerSectors();
      this.buildInteractiveAirlockDoor();
      this.buildInteractionBeacons();

      // 4. Bind Input Controls
      this.bindControls();
      
      // Resize listener
      window.addEventListener('resize', () => this.onResize());

      // 5. Start Render & Physics Loop
      this.animate();
    } catch (err) {
      console.warn('ThreeBaseRenderer initialization caught error:', err);
    }
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth || window.innerWidth || 900;
    const h = this.container.clientHeight || window.innerHeight || 560;
    if (w > 0 && h > 0) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }
  }

  setupLighting() {
    // Ambient light: Soft Martian dust haze reflection
    const ambientLight = new THREE.AmbientLight(0xffdec7, 0.65);
    this.scene.add(ambientLight);

    // Primary Martian Sun streaming down through the transparent greenhouse dome
    const sunLight = new THREE.DirectionalLight(0xffe2cf, 2.2);
    sunLight.position.set(15, 30, -10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 70;
    sunLight.shadow.camera.left = -25;
    sunLight.shadow.camera.right = 25;
    sunLight.shadow.camera.top = 25;
    sunLight.shadow.camera.bottom = -25;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    // Interior Lighting
    const centralHemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x5c3325, 0.45);
    this.scene.add(centralHemiLight);

    // Command Deck display spotlight
    const commandLight = new THREE.PointLight(0x38bdf8, 2.2, 12, 1.5);
    commandLight.position.set(0, 3.2, -13.5);
    this.scene.add(commandLight);

    // Hydroponics grow lights
    const plantLight = new THREE.PointLight(0xf43f5e, 1.8, 10, 1.5);
    plantLight.position.set(13.0, 3.0, 0);
    this.scene.add(plantLight);

    // ECLSS status light
    const eclssLight = new THREE.PointLight(0x06b6d4, 1.8, 10, 1.5);
    eclssLight.position.set(-13.0, 3.0, 0);
    this.scene.add(eclssLight);
  }

  /**
   * External Martian landscape visible through the transparent dome
   */
  buildExternalMartianLandscape() {
    // Martian Sky Hemisphere Dome
    const skyGeo = new THREE.SphereGeometry(180, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0xc45c2c,
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);

    // Martian Sun
    const sunOrbGeo = new THREE.SphereGeometry(6.0, 16, 16);
    const sunOrbMat = new THREE.MeshBasicMaterial({ color: 0xfff3db });
    const sunOrb = new THREE.Mesh(sunOrbGeo, sunOrbMat);
    sunOrb.position.set(35, 75, -50);
    this.scene.add(sunOrb);

    // Outer Terrain Ground
    const extTerrainGeo = new THREE.RingGeometry(17.6, 160.0, 48);
    const extTerrainMat = new THREE.MeshStandardMaterial({
      color: 0x943818,
      roughness: 0.95,
      metalness: 0.05
    });
    const extTerrain = new THREE.Mesh(extTerrainGeo, extTerrainMat);
    extTerrain.rotation.x = -Math.PI / 2;
    extTerrain.position.y = -0.15;
    extTerrain.receiveShadow = true;
    this.scene.add(extTerrain);

    // External Solar Panel Arrays
    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      metalness: 0.85,
      roughness: 0.2
    });
    const solarFrameMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });

    for (let s = 0; s < 6; s++) {
      const angle = 0.8 + s * 0.35;
      const dist = 28.0 + (s % 2) * 5.0;
      const px = Math.sin(angle) * dist;
      const pz = Math.cos(angle) * dist;

      const panel = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.1, 2.8), solarMat);
      panel.position.set(px, 1.2, pz);
      panel.rotation.x = 0.35;
      panel.rotation.y = angle;

      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8), solarFrameMat);
      stand.position.set(px, 0.6, pz);

      this.scene.add(panel);
      this.scene.add(stand);
    }

    // External Surface Boulders
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6e2c14, roughness: 0.9 });
    for (let r = 0; r < 24; r++) {
      const ra = (r / 24) * Math.PI * 2 + 0.15;
      const rd = 22.0 + (r % 7) * 9.0;
      const rockSize = 0.8 + (r % 4) * 0.55;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rockSize), rockMat);
      rock.position.set(Math.sin(ra) * rd, rockSize * 0.4, Math.cos(ra) * rd);
      rock.rotation.set(r * 0.5, r * 0.8, r * 0.2);
      this.scene.add(rock);
    }
  }

  /**
   * Transparent Greenhouse Dome Structure
   */
  buildGeodesicDomeCeiling() {
    const domeRadius = 18.2;
    const domeGeo = new THREE.IcosahedronGeometry(domeRadius, 2);
    
    // Titanium Geodesic Framing
    const wireGeo = new THREE.WireframeGeometry(domeGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x1e293b,
      linewidth: 2
    });
    const wireframe = new THREE.LineSegments(wireGeo, wireMat);
    wireframe.position.y = 2.5;
    this.scene.add(wireframe);

    // Transparent Glass Panels
    const greenhouseGlassMat = new THREE.MeshStandardMaterial({
      color: 0xd6f0f7,
      roughness: 0.04,
      metalness: 0.85,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const domeMesh = new THREE.Mesh(domeGeo, greenhouseGlassMat);
    domeMesh.position.y = 2.5;
    this.scene.add(domeMesh);

    // Central Cupola Ring Beam
    const cupolaRingGeo = new THREE.TorusGeometry(3.6, 0.25, 12, 16);
    const cupolaRingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
    const cupolaRing = new THREE.Mesh(cupolaRingGeo, cupolaRingMat);
    cupolaRing.rotation.x = Math.PI / 2;
    cupolaRing.position.y = 8.5;
    this.scene.add(cupolaRing);

    // Communications Tower
    const towerGeo = new THREE.CylinderGeometry(0.35, 0.6, 18, 12);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(0, 18.0, 0);
    this.scene.add(tower);
  }

  buildFloorAndBulkheads() {
    // Habitat Floor (Radius: 18m)
    const floorGeo = new THREE.CylinderGeometry(18.0, 18.0, 0.2, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x222836,
      roughness: 0.7,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Inner Navigation Walkway
    const carpetGeo = new THREE.RingGeometry(0.1, 12.0, 48);
    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0x2f3647,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide
    });
    const carpet = new THREE.Mesh(carpetGeo, carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.y = 0.01;
    carpet.receiveShadow = true;
    this.scene.add(carpet);

    // Perimeter Bulkhead Wall
    const wallGeo = new THREE.CylinderGeometry(17.8, 17.8, 5.0, 32, 1, true);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.45,
      metalness: 0.15,
      side: THREE.BackSide
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = 2.5;
    this.scene.add(wall);

    // Storage cabinets lining perimeter
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      // Skip doorway corridors
      if (Math.abs(angle - 0) < 0.35 || Math.abs(angle - Math.PI) < 0.35) continue;

      const cabGeo = new THREE.BoxGeometry(2.4, 2.2, 0.6);
      const cabMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xf3f4f6 : 0xe5e7eb,
        roughness: 0.35,
        metalness: 0.2
      });
      const cabinet = new THREE.Mesh(cabGeo, cabMat);
      cabinet.position.set(Math.sin(angle) * 17.1, 1.1, Math.cos(angle) * 17.1);
      cabinet.rotation.y = angle + Math.PI;
      cabinet.castShadow = true;
      cabinet.receiveShadow = true;
      this.scene.add(cabinet);
    }
  }

  buildCentralPlanterAndMast() {
    // Circular Planter Bench
    const planterOuterGeo = new THREE.CylinderGeometry(3.4, 3.5, 0.7, 32);
    const planterOuterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const planterOuter = new THREE.Mesh(planterOuterGeo, planterOuterMat);
    planterOuter.position.y = 0.35;
    planterOuter.receiveShadow = true;
    planterOuter.castShadow = true;
    this.scene.add(planterOuter);

    // Bench Seating Cushion Ring
    const cushionGeo = new THREE.TorusGeometry(3.1, 0.35, 12, 32);
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const cushion = new THREE.Mesh(cushionGeo, cushionMat);
    cushion.rotation.x = Math.PI / 2;
    cushion.position.y = 0.65;
    this.scene.add(cushion);

    // Soil Bed
    const soilGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.6, 24);
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x271910, roughness: 0.9 });
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 0.45;
    this.scene.add(soil);

    // Vegetation Clusters
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 });
    for (let p = 0; p < 14; p++) {
      const pa = (p / 14) * Math.PI * 2;
      const pr = 0.85 + (p % 3) * 0.5;
      const leafGeo = new THREE.DodecahedronGeometry(0.38 + (p % 2) * 0.15);
      const leaf = new THREE.Mesh(leafGeo, plantMat);
      leaf.position.set(Math.cos(pa) * pr, 0.95 + (p % 3) * 0.12, Math.sin(pa) * pr);
      leaf.castShadow = true;
      this.scene.add(leaf);
    }

    // Central Structural Column
    const columnGeo = new THREE.CylinderGeometry(0.45, 0.5, 9.0, 16);
    const columnMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    const column = new THREE.Mesh(columnGeo, columnMat);
    column.position.y = 4.5;
    column.castShadow = true;
    this.scene.add(column);

    // Suspended Central Monitors
    for (let m = 0; m < 4; m++) {
      const ma = (m / 4) * Math.PI * 2;
      const monGeo = new THREE.BoxGeometry(1.6, 0.9, 0.08);
      const monMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
      const monitor = new THREE.Mesh(monGeo, monMat);
      monitor.position.set(Math.sin(ma) * 1.5, 3.8, Math.cos(ma) * 1.5);
      monitor.rotation.y = ma + Math.PI;
      monitor.rotation.x = 0.15;

      const screenGeo = new THREE.PlaneGeometry(1.5, 0.8);
      const screenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.z = 0.045;
      monitor.add(screen);

      this.scene.add(monitor);
    }

    // Radial Science Lab Desks
    const deskGeo = new THREE.BoxGeometry(2.4, 0.8, 1.1);
    const deskMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.2 });
    for (let d = 0; d < 3; d++) {
      const da = (d / 3) * Math.PI * 2 + 0.4;
      const desk = new THREE.Mesh(deskGeo, deskMat);
      desk.position.set(Math.sin(da) * 5.2, 0.4, Math.cos(da) * 5.2);
      desk.rotation.y = da + Math.PI / 2;
      desk.castShadow = true;
      desk.receiveShadow = true;
      this.scene.add(desk);

      const laptopGeo = new THREE.BoxGeometry(0.5, 0.03, 0.35);
      const laptopMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
      const laptop = new THREE.Mesh(laptopGeo, laptopMat);
      laptop.position.set(desk.position.x, 0.82, desk.position.z);
      this.scene.add(laptop);
    }
  }

  buildCommandDeck() {
    // North Sector: Operations Command Deck
    const cx = 0;
    const cz = -14.2;

    // Command Desk Console
    const consoleGeo = new THREE.BoxGeometry(6.0, 0.9, 1.6);
    const consoleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.2 });
    const consoleMesh = new THREE.Mesh(consoleGeo, consoleMat);
    consoleMesh.position.set(cx, 0.45, cz);
    consoleMesh.castShadow = true;
    consoleMesh.receiveShadow = true;
    this.scene.add(consoleMesh);

    // Operator Chair
    const chairGeo = new THREE.BoxGeometry(0.8, 0.9, 0.8);
    const chairMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
    const chair = new THREE.Mesh(chairGeo, chairMat);
    chair.position.set(cx, 0.45, cz + 1.8);
    this.scene.add(chair);

    // Holographic Display Screens
    const holoGeo = new THREE.PlaneGeometry(3.6, 1.8);
    const holoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    const holoScreen = new THREE.Mesh(holoGeo, holoMat);
    holoScreen.position.set(cx, 1.9, cz - 0.5);
    this.scene.add(holoScreen);
    this.animatedObjects.push({ mesh: holoScreen, type: 'hologram' });

    // Server Racks
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const rackGeo = new THREE.BoxGeometry(1.8, 3.2, 1.4);
    
    const rackLeft = new THREE.Mesh(rackGeo, rackMat);
    rackLeft.position.set(-6.5, 1.6, cz);
    this.scene.add(rackLeft);

    const rackRight = new THREE.Mesh(rackGeo, rackMat);
    rackRight.position.set(6.5, 1.6, cz);
    this.scene.add(rackRight);

    // Surface Observation Window
    const windowFrameGeo = new THREE.BoxGeometry(4.8, 2.6, 0.2);
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const windowFrame = new THREE.Mesh(windowFrameGeo, windowFrameMat);
    windowFrame.position.set(cx, 2.6, cz - 2.8);
    this.scene.add(windowFrame);

    const glassGeo = new THREE.PlaneGeometry(4.4, 2.2);
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xd9532f, side: THREE.DoubleSide });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(cx, 2.6, cz - 2.7);
    this.scene.add(glass);

    // Mission Notes Whiteboard
    const wbGeo = new THREE.PlaneGeometry(2.4, 1.4);
    const wbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const whiteboard = new THREE.Mesh(wbGeo, wbMat);
    whiteboard.position.set(-4.2, 2.0, cz - 2.0);
    this.scene.add(whiteboard);
  }

  buildEclssSubsystem() {
    // West Sector: ECLSS Atmospheric Processing Hub
    const ex = -13.5;

    // Oxygen Generation Assembly (OGA) PEM Electrolysis Cylinders
    const tankGeo = new THREE.CylinderGeometry(0.7, 0.7, 2.8, 16);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.7, roughness: 0.3 });
    
    const ogaTank1 = new THREE.Mesh(tankGeo, tankMat);
    ogaTank1.position.set(ex, 1.4, -4.5);
    ogaTank1.castShadow = true;
    this.scene.add(ogaTank1);

    const ogaTank2 = new THREE.Mesh(tankGeo, tankMat);
    ogaTank2.position.set(ex + 1.6, 1.4, -4.5);
    ogaTank2.castShadow = true;
    this.scene.add(ogaTank2);

    // Sabatier Methanation Reactor Chamber
    const sabGeo = new THREE.CylinderGeometry(0.9, 0.9, 2.2, 16);
    const sabMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.6, roughness: 0.4 });
    const sabatier = new THREE.Mesh(sabGeo, sabMat);
    sabatier.position.set(ex, 1.1, 4.5);
    this.scene.add(sabatier);

    // CDRA Zeolite Desiccant Canisters
    const cdraGeo = new THREE.BoxGeometry(1.6, 2.0, 1.2);
    const cdraMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.4 });
    const cdra = new THREE.Mesh(cdraGeo, cdraMat);
    cdra.position.set(ex + 1.4, 1.0, 4.5);
    this.scene.add(cdra);
  }

  buildHydroponicsSubsystem() {
    // East Sector: Bioregenerative Agri-Pod Farm
    const hx = 13.5;

    // Vertical Aeroponic Rotary Columns
    const colGeo = new THREE.CylinderGeometry(0.6, 0.6, 3.2, 16);
    const colMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });

    const tower1 = new THREE.Mesh(colGeo, colMat);
    tower1.position.set(hx, 1.6, -4.5);
    tower1.castShadow = true;
    this.scene.add(tower1);
    this.animatedObjects.push({ mesh: tower1, type: 'rotateY', speed: 0.4 });

    const tower2 = new THREE.Mesh(colGeo, colMat);
    tower2.position.set(hx, 1.6, 4.5);
    tower2.castShadow = true;
    this.scene.add(tower2);
    this.animatedObjects.push({ mesh: tower2, type: 'rotateY', speed: -0.4 });

    // Grow Light Racks
    const rackGeo = new THREE.BoxGeometry(0.1, 3.0, 2.2);
    const rackMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const rack1 = new THREE.Mesh(rackGeo, rackMat);
    rack1.position.set(hx - 0.9, 1.6, -4.5);
    this.scene.add(rack1);
  }

  buildWaterAndPowerSectors() {
    // South-West: Water Recovery VCD Centrifuge
    const vcdGeo = new THREE.CylinderGeometry(1.1, 1.1, 1.8, 20);
    const vcdMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.7, roughness: 0.3 });
    const vcd = new THREE.Mesh(vcdGeo, vcdMat);
    vcd.position.set(-9.5, 0.9, 8.5);
    this.scene.add(vcd);
    this.animatedObjects.push({ mesh: vcd, type: 'rotateY', speed: 1.5 });

    // South-East: Kilopower Nuclear Microgrid Switchboard
    const pwrGeo = new THREE.BoxGeometry(2.4, 2.2, 1.4);
    const pwrMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.5, roughness: 0.3 });
    const pwr = new THREE.Mesh(pwrGeo, pwrMat);
    pwr.position.set(9.5, 1.1, 8.5);
    this.scene.add(pwr);
  }

  /**
   * Airlock Blast Door & EVA Vestibule
   */
  buildInteractiveAirlockDoor() {
    const doorZ = 16.5;

    // Bulkhead Frame
    const frameTorus = new THREE.Mesh(
      new THREE.TorusGeometry(1.65, 0.28, 16, 32),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 })
    );
    frameTorus.position.set(0, 1.8, doorZ);
    this.scene.add(frameTorus);

    // Left and Right Armor Jambs with Industrial Hazard Stripes
    const jambMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const leftJamb = new THREE.Mesh(new THREE.BoxGeometry(1.0, 3.4, 0.4), jambMat);
    leftJamb.position.set(-2.0, 1.8, doorZ);
    this.scene.add(leftJamb);

    const rightJamb = new THREE.Mesh(new THREE.BoxGeometry(1.0, 3.4, 0.4), jambMat);
    rightJamb.position.set(2.0, 1.8, doorZ);
    this.scene.add(rightJamb);

    // 2. Door Status Beacon Indicator (RED when locked/closed, GREEN when open)
    const beaconGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Starts closed = red
    this.doorStatusBeacon = new THREE.Mesh(beaconGeo, beaconMat);
    this.doorStatusBeacon.position.set(0, 3.5, doorZ - 0.1);
    this.scene.add(this.doorStatusBeacon);

    // 3. Wall Keypad Terminal Console next to the door
    const keypadGeo = new THREE.BoxGeometry(0.4, 0.6, 0.15);
    const keypadMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
    const keypad = new THREE.Mesh(keypadGeo, keypadMat);
    keypad.position.set(1.65, 1.6, doorZ - 0.25);
    this.scene.add(keypad);

    const keypadScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    keypadScreen.position.set(1.65, 1.6, doorZ - 0.17);
    keypadScreen.rotation.y = Math.PI;
    this.scene.add(keypadScreen);

    // 4. Interactive Door Panel Assembly (Hinged at x = -1.4m)
    this.doorGroup = new THREE.Group();
    this.doorGroup.position.set(-1.4, 1.8, doorZ); // Hinge pivot point

    // Door Slab Mesh
    const doorSlabGroup = new THREE.Group();
    doorSlabGroup.position.set(1.4, 0, 0); // Offset so pivot is on the outer hinge

    // Circular blast hatch
    const hatchMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.6,
      roughness: 0.35
    });
    const hatchMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.38, 0.18, 32), hatchMat);
    hatchMesh.rotation.x = Math.PI / 2;
    doorSlabGroup.add(hatchMesh);

    // Central circular glass observation viewport
    const vpMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.22, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 })
    );
    vpMesh.rotation.x = Math.PI / 2;
    doorSlabGroup.add(vpMesh);

    // Industrial Locking Wheel
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 });
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 12, 24), wheelMat);
    wheel.position.z = -0.11;
    doorSlabGroup.add(wheel);

    // Cross spokes on locking wheel
    const spoke1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), wheelMat);
    spoke1.position.z = -0.11;
    doorSlabGroup.add(spoke1);
    const spoke2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), wheelMat);
    spoke2.rotation.z = Math.PI / 2;
    spoke2.position.z = -0.11;
    doorSlabGroup.add(spoke2);

    this.doorGroup.add(doorSlabGroup);
    this.scene.add(this.doorGroup);

    // 5. Accessible EVA Airlock Chamber Vestibule (z: 16.5m to 20.0m)
    const vestibuleFloor = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.2, 3.8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
    );
    vestibuleFloor.position.set(0, -0.1, 18.3);
    this.scene.add(vestibuleFloor);

    // Left and Right Vestibule Walls
    const vestWallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    const vestWallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.4, 3.8), vestWallMat);
    vestWallLeft.position.set(-1.8, 1.7, 18.3);
    this.scene.add(vestWallLeft);

    const vestWallRight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.4, 3.8), vestWallMat);
    vestWallRight.position.set(1.8, 1.7, 18.3);
    this.scene.add(vestWallRight);

    // Rear Outer Bulkhead with Martian Surface Viewport
    const vestRearWall = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.4, 0.2), vestWallMat);
    vestRearWall.position.set(0, 1.7, 20.1);
    this.scene.add(vestRearWall);

    // Surface Observation Window looking out onto red Martian desert
    const vestWin = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.6),
      new THREE.MeshBasicMaterial({ color: 0xc45524, side: THREE.DoubleSide })
    );
    vestWin.position.set(0, 1.8, 19.98);
    this.scene.add(vestWin);

    // Two EVA Spacesuits hanging in suitports
    const suitMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });
    const suitHelmetMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.1 });

    for (const sx of [-1.2, 1.2]) {
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.9, 0.4), suitMat);
      torso.position.set(sx, 1.4, 18.8);
      this.scene.add(torso);

      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), suitHelmetMat);
      helmet.position.set(sx, 2.05, 18.8);
      this.scene.add(helmet);
    }
  }

  buildInteractionBeacons() {
    // 3D Floating Hologram Markers over interactive zones
    for (const zone of this.physics.interactionZones) {
      const group = new THREE.Group();
      group.position.set(zone.x, 2.6, zone.z);

      // Diamond / Octahedron floating icon
      const iconGeo = new THREE.OctahedronGeometry(0.35);
      const iconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
      const icon = new THREE.Mesh(iconGeo, iconMat);
      group.add(icon);

      // Ring pulse
      const ringGeo = new THREE.RingGeometry(0.4, 0.48, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      this.scene.add(group);
      this.hologramMarkers.push({ group, zoneId: zone.id, icon, ring });
    }
  }

  toggleDoor() {
    this.isDoorOpen = !this.isDoorOpen;
    this.physics.setDoorState(this.isDoorOpen);
    sound.playDoorServo(this.isDoorOpen);

    if (this.doorStatusBeacon) {
      this.doorStatusBeacon.material.color.setHex(this.isDoorOpen ? 0x10b981 : 0xef4444);
    }

    return this.isDoorOpen;
  }

  setActiveIssues(issuesList) {
    this.activeIssues = new Set(issuesList);
  }

  onInteract(callback) {
    this.onInteractCallback = callback;
  }

  onMenuToggle(callback) {
    this.onMenuToggleCallback = callback;
  }

  onEscape(callback) {
    this.onEscapeCallback = callback;
  }

  bindControls() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = true;
      }

      // [E] Proximity Interaction
      if (e.code === 'KeyE') {
        const nearby = this.physics.getNearbyInteraction();
        if (nearby) {
          if (nearby.id === 'airlock_door') {
            this.toggleDoor();
          } else if (this.onInteractCallback) {
            this.onInteractCallback(nearby.id);
          }
        }
      }

      // [Tab] Menu / Fullscreen exit toggle
      if (e.code === 'Tab') {
        e.preventDefault();
        if (this.onMenuToggleCallback) {
          this.onMenuToggleCallback();
        }
      }

      // [Escape] Dismiss side popup
      if (e.code === 'Escape') {
        if (this.onEscapeCallback) {
          this.onEscapeCallback();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = false;
      }
    });

    // Mouse Look (Pointer Lock)
    this.container.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        this.container.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.container;
      const hint = document.getElementById('fpvControlsHint');
      if (hint) {
        hint.textContent = this.isPointerLocked 
          ? 'MOUSE LOOK ACTIVE // PRESS [ESC] TO RELEASE CURSOR // [E] TO INTERACT' 
          : 'CLICK 3D VIEW FOR MOUSE LOOK // WASD: MOVE // SPACE: 0.38g JUMP // [E]: INTERACT';
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;

      // Clamp vertical pitch looking up/down
      this.pitch = Math.max(-Math.PI * 0.42, Math.min(Math.PI * 0.42, this.pitch));
    });
  }

  /**
   * Main render & physics animation loop
   */
  animate() {
    if (!this.renderer || !this.scene || !this.camera || !this.clock) return;
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.getElapsedTime();

    // 1. Compute normal movement vector from keys
    let forward = 0;
    let strafe = 0;
    if (this.keys.KeyW || this.keys.ArrowUp) forward += 1;
    if (this.keys.KeyS || this.keys.ArrowDown) forward -= 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) strafe -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) strafe += 1;
    const jump = this.keys.Space;

    // 2. Update Gazebo Contact Physics Engine (0.38g gravity + solid contact resolution)
    this.physics.update(dt, { forward, strafe }, this.yaw, jump);

    // 3. Sync Three.js Camera with Physics Astronaut Position
    this.camera.position.set(this.physics.position.x, this.physics.position.y, this.physics.position.z);
    
    // Apply camera rotation Euler angles
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);

    // 4. Animate Interactive Airlock Door (Smooth swing open/closed)
    const targetDoorProgress = this.isDoorOpen ? 1.0 : 0.0;
    this.doorAnimProgress += (targetDoorProgress - this.doorAnimProgress) * Math.min(dt * 3.5, 1.0);
    if (this.doorGroup) {
      // Swing open 85 degrees (Math.PI * 0.47)
      this.doorGroup.rotation.y = this.doorAnimProgress * (Math.PI * 0.47);
    }

    // 5. Update Animated 3D Objects
    for (const obj of this.animatedObjects) {
      if (obj.type === 'rotateY') {
        obj.mesh.rotation.y += obj.speed * dt;
      } else if (obj.type === 'hologram') {
        obj.mesh.material.opacity = 0.55 + Math.sin(time * 3) * 0.15;
      }
    }

    // 6. Update Holographic Markers & Active Alarms
    for (const marker of this.hologramMarkers) {
      const hasIssue = this.activeIssues.has(marker.zoneId);
      marker.group.rotation.y += 1.2 * dt;
      marker.group.position.y = 2.6 + Math.sin(time * 2 + marker.group.position.x) * 0.12;

      if (hasIssue) {
        marker.icon.material.color.setHex(0xef4444); // RED ALERT
        marker.ring.material.color.setHex(0xef4444);
        marker.icon.scale.setScalar(1.2 + Math.sin(time * 8) * 0.3);
      } else {
        marker.icon.material.color.setHex(0x38bdf8); // Cyan Nominal
        marker.ring.material.color.setHex(0x38bdf8);
        marker.icon.scale.setScalar(1.0);
      }
    }

    // 7. Check Proximity Interaction Prompt
    const nearby = this.physics.getNearbyInteraction();
    const promptEl = document.getElementById('fpvInteractionPrompt');
    if (promptEl) {
      if (nearby) {
        promptEl.classList.remove('hidden');
        promptEl.textContent = nearby.prompt;
      } else {
        promptEl.classList.add('hidden');
      }
    }

    // 8. Render 3D Frame
    this.renderer.render(this.scene, this.camera);
  }
}
