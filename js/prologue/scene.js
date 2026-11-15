// ============================================================================
// JAMN GAME – MARS SURVIVAL MISSION TRAINER (MILESTONE 2)
// File: scene.js
// Purpose: Lightweight Three.js (r128) 3D engine optimized for older laptops.
//          Includes procedural Mars MOLA-style texture generation, 3D Mars globe,
//          3D spacecraft cockpit interior, orbital spacecraft + 4 landing site
//          markers, EDL descent lander with plasma/parachute/retro plumes,
//          Martian surface terrain, articulated 3D low-poly astronaut, and
//          Mars pressurized habitat + interior environment.
// ============================================================================

window.JAMN_SCENE = (function () {
  let scene, camera, renderer, clock;
  let lowSpecMode = false;
  let currentStage = "TITLE";
  let isPaused = false;

  // Scene Groups for each Mission Stage
  const groups = {
    stars: null,
    marsGlobe: null,
    cockpit: null,
    orbitHud: null,
    descent: null,
    surface: null,
    habitatInterior: null
  };

  // Interactive & Animated Sub-Objects
  let marsMesh = null;
  let marsAtmosphereMesh = null;
  let orbitingCraftPivot = null;
  let siteMarkers = [];
  let raycaster = null;
  let mouse = null;

  // Cockpit animation state
  let cockpitJourneyProgress = 0; // 0 to 1
  let cockpitWarpActive = false;

  // Orbital camera state
  let orbitAngles = { theta: 0.6, phi: 1.25, radius: 22 };
  let targetOrbitAngles = { theta: 0.6, phi: 1.25, radius: 22 };
  let isDraggingGlobe = false;
  let prevPointer = { x: 0, y: 0 };
  let autoRotateGlobe = true;

  // Descent animation state
  let descentAltitudeRatio = 1.0; // 1.0 (orbit) -> 0.0 (touchdown)
  let landerGroup = null;
  let heatShieldCone = null;
  let parachuteCanopy = null;
  let retroFlames = [];
  let dustParticles = null;
  let descentGroundMesh = null;

  // Surface & Astronaut state
  let astronautGroup = null;
  let astroLeftLeg = null, astroRightLeg = null, astroLeftArm = null, astroRightArm = null;
  let surfaceCameraMode = "FIRST_PERSON"; // "FIRST_PERSON" or "THIRD_PERSON"
  let astroState = {
    x: 0,
    z: 18,
    yaw: Math.PI, // facing North (-Z, towards habitat at z = -22)
    pitch: 0,
    speed: 0,
    walkCycle: 0
  };
  let moveKeys = { forward: false, backward: false, left: false, right: false };
  let habitatExteriorPosition = { x: 0, z: -24 };
  let landerExteriorPosition = { x: -16, z: 14 };
  let beaconMesh = null;

  // Synthesized Web Audio API Sound Effects (No external audio files needed)
  let audioCtx = null;
  let audioMuted = false;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function playTone(freq, type, duration, gainVal) {
    if (audioMuted) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal || 0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Ignore audio errors on restricted browsers
    }
  }

  function setMuted(muted) {
    audioMuted = muted;
  }

  // --------------------------------------------------------------------------
  // Procedural Texture Generators (100% offline/sandbox-safe, fast on laptops)
  // --------------------------------------------------------------------------
  function createMarsSurfaceTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Base rusty Martian ochre gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, "#e8e2dc");   // North Polar Ice Cap (Planum Boreum)
    grad.addColorStop(0.08, "#b86b43");  // Northern plains (Vastitas Borealis)
    grad.addColorStop(0.35, "#c85328");  // Tharsis & Equatorial ochre
    grad.addColorStop(0.55, "#9e3b18");  // Dark basaltic syrtis/canyon belt
    grad.addColorStop(0.85, "#b34a22");  // Southern cratered highlands
    grad.addColorStop(0.95, "#7d3218");
    grad.addColorStop(1.0, "#dcd5ce");   // South Polar Cap (Planum Australe)
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Deterministic pseudo-random generator for geological features
    let seed = 4219;
    function rand() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }

    // Regional albedo patches & basaltic plains
    for (let i = 0; i < 240; i++) {
      const x = rand() * 1024;
      const y = 45 + rand() * 420;
      const r = 12 + rand() * 65;
      const dark = rand() > 0.45;
      ctx.fillStyle = dark
        ? `rgba(62, 22, 10, ${0.08 + rand() * 0.14})`
        : `rgba(225, 118, 68, ${0.08 + rand() * 0.14})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.4, r * 0.7, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Feature 1: Olympus Mons (18.65°N, 226.2°E -> u ~0.13, v ~0.39)
    const omX = (( -133.8 + 180 ) / 360) * 1024;
    const omY = (( 90 - 18.65 ) / 180) * 512;
    const omGrad = ctx.createRadialGradient(omX, omY, 3, omX, omY, 38);
    omGrad.addColorStop(0, "#5a1f0e");
    omGrad.addColorStop(0.3, "#8f3418");
    omGrad.addColorStop(0.8, "#d46a3c");
    omGrad.addColorStop(1, "rgba(200,83,40,0)");
    ctx.fillStyle = omGrad;
    ctx.beginPath();
    ctx.arc(omX, omY, 38, 0, Math.PI * 2);
    ctx.fill();

    // Feature 2: Valles Marineris canyon scar (-13.9°S, -59.2°W -> u ~0.33, v ~0.57)
    const vmX = (( -59.2 + 180 ) / 360) * 1024;
    const vmY = (( 90 + 13.9 ) / 180) * 512;
    ctx.strokeStyle = "rgba(45, 14, 6, 0.75)";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(vmX - 65, vmY - 6);
    ctx.quadraticCurveTo(vmX, vmY + 5, vmX + 70, vmY - 2);
    ctx.stroke();

    // Feature 3: Hellas Basin (-42.4°S, 70.5°E -> u ~0.69, v ~0.73)
    const hbX = (( 70.5 + 180 ) / 360) * 1024;
    const hbY = (( 90 + 42.4 ) / 180) * 512;
    const hbGrad = ctx.createRadialGradient(hbX, hbY, 8, hbX, hbY, 48);
    hbGrad.addColorStop(0, "rgba(218, 138, 92, 0.65)");
    hbGrad.addColorStop(0.7, "rgba(110, 40, 18, 0.45)");
    hbGrad.addColorStop(1, "rgba(180, 75, 35, 0)");
    ctx.fillStyle = hbGrad;
    ctx.beginPath();
    ctx.ellipse(hbX, hbY, 52, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Impact craters across globe
    for (let i = 0; i < 180; i++) {
      const cx = rand() * 1024;
      const cy = 50 + rand() * 415;
      const cr = 2 + rand() * 14;
      ctx.strokeStyle = `rgba(240, 160, 110, ${0.15 + rand() * 0.2})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(50, 18, 8, ${0.15 + rand() * 0.2})`;
      ctx.fill();
    }

    // North Polar Spiral Troughs (Planum Boreum)
    ctx.strokeStyle = "rgba(130, 70, 45, 0.55)";
    ctx.lineWidth = 2;
    for (let s = 0; s < 16; s++) {
      ctx.beginPath();
      const sx = (s / 16) * 1024;
      ctx.moveTo(sx, 6);
      ctx.quadraticCurveTo(sx + 35, 22, sx + 70, 38);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  function createSurfaceGroundTexture(baseColorHex) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const c = new THREE.Color(baseColorHex || 0xa84824);
    const rBase = Math.floor(c.r * 255);
    const gBase = Math.floor(c.g * 255);
    const bBase = Math.floor(c.b * 255);

    ctx.fillStyle = `rgb(${rBase},${gBase},${bBase})`;
    ctx.fillRect(0, 0, 512, 512);

    let s = 9012;
    function rand() {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    }

    for (let i = 0; i < 1800; i++) {
      const x = rand() * 512;
      const y = rand() * 512;
      const rad = 1 + rand() * 6;
      const delta = (rand() - 0.5) * 45;
      ctx.fillStyle = `rgb(${Math.min(255, Math.max(0, rBase + delta))},${Math.min(255, Math.max(0, gBase + delta * 0.8))},${Math.min(255, Math.max(0, bBase + delta * 0.6))})`;
      ctx.fillRect(x, y, rad, rad * 0.7);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(18, 18);
    return tex;
  }

  // Helper: Convert Lat/Lon (degrees) to 3D Cartesian position on sphere of radius R
  function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  }

  // --------------------------------------------------------------------------
  // Scene Construction
  // --------------------------------------------------------------------------
  function init(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060c);

    camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(0, 0, 26);

    renderer = new THREE.WebGLRenderer({
      antialias: !lowSpecMode,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x4a5568, 0.75);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff1e0, 1.45);
    sunLight.position.set(45, 25, 40);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xe05a2b, 0.55);
    rimLight.position.set(-40, -15, -30);
    scene.add(rimLight);

    // Build all modular 3D stage groups upfront so transitions are instant
    buildStarfield();
    buildMarsGlobeAndMarkers();
    buildSpacecraftCockpit();
    buildDescentSequenceGroup();
    buildSurfaceAndAstronautGroup();
    buildHabitatInteriorGroup();

    // Input Listeners
    setupInteractions(renderer.domElement);
    window.addEventListener("resize", onWindowResize);

    // Set initial stage
    setStage("TITLE");
    animate();
  }

  function buildStarfield() {
    groups.stars = new THREE.Group();
    const starCount = lowSpecMode ? 900 : 2200;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 350 + Math.random() * 450;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const tint = 0.75 + Math.random() * 0.25;
      colors[i * 3] = tint;
      colors[i * 3 + 1] = tint * (0.92 + Math.random() * 0.08);
      colors[i * 3 + 2] = 1.0;
    }

    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 1.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });

    const stars = new THREE.Points(geom, mat);
    groups.stars.add(stars);
    scene.add(groups.stars);
  }

  function buildMarsGlobeAndMarkers() {
    groups.marsGlobe = new THREE.Group();
    const marsTex = createMarsSurfaceTexture();

    const sphereGeo = new THREE.SphereGeometry(8.0, lowSpecMode ? 36 : 64, lowSpecMode ? 24 : 48);
    const sphereMat = new THREE.MeshStandardMaterial({
      map: marsTex,
      bumpMap: marsTex,
      bumpScale: 0.18,
      roughness: 0.85,
      metalness: 0.05
    });
    marsMesh = new THREE.Mesh(sphereGeo, sphereMat);
    groups.marsGlobe.add(marsMesh);

    // Subtle atmospheric Rayleigh/dust rim halo
    const atmoGeo = new THREE.SphereGeometry(8.28, 40, 30);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0xe66838,
      transparent: true,
      opacity: 0.14,
      side: THREE.BackSide
    });
    marsAtmosphereMesh = new THREE.Mesh(atmoGeo, atmoMat);
    groups.marsGlobe.add(marsAtmosphereMesh);

    // Orbital Reconnaissance Spacecraft + Ring (Visible in ORBIT stage)
    groups.orbitHud = new THREE.Group();

    const orbitRingGeo = new THREE.RingGeometry(10.35, 10.42, 96);
    const orbitRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28
    });
    const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
    orbitRing.rotation.x = Math.PI / 2.3;
    groups.orbitHud.add(orbitRing);

    // 3D Orbiting Spacecraft Model
    orbitingCraftPivot = new THREE.Group();
    orbitingCraftPivot.rotation.x = 0.35;
    const craftModel = new THREE.Group();
    craftModel.position.set(10.4, 0, 0);

    const busMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.7, roughness: 0.3 });
    const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.65, 12), busMat);
    bus.rotation.z = Math.PI / 2;
    craftModel.add(bus);

    const dishMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.3, roughness: 0.5 });
    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.15, 16), dishMat);
    dish.position.set(0, 0.28, 0);
    dish.rotation.x = Math.PI;
    craftModel.add(dish);

    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.6, roughness: 0.2 });
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 1.35), panelMat);
    leftWing.position.set(0, 0, 0.85);
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 1.35), panelMat);
    rightWing.position.set(0, 0, -0.85);
    craftModel.add(leftWing, rightWing);

    orbitingCraftPivot.add(craftModel);
    groups.orbitHud.add(orbitingCraftPivot);

    // 4 Selectable 3D Landing Location Markers attached to MarsMesh
    siteMarkers = [];
    const sites = window.JAMN_DATA.landingSites;
    Object.keys(sites).forEach((key) => {
      const site = sites[key];
      const pos = latLonToVector3(site.lat, site.lon, 8.08);

      const markerGroup = new THREE.Group();
      markerGroup.position.copy(pos);
      markerGroup.lookAt(pos.clone().multiplyScalar(2));
      markerGroup.userData = { siteId: site.id, siteName: site.name };

      // Glowing core pin
      const pinGeo = new THREE.SphereGeometry(0.24, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({ color: 0xff6b2b });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.userData = { siteId: site.id };
      markerGroup.add(pinMesh);

      // Concentric target ring
      const ringGeo = new THREE.RingGeometry(0.34, 0.46, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffb088,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.userData = { siteId: site.id };
      markerGroup.add(ringMesh);

      // Vertical beacon spike
      const spikeGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.75, 8);
      const spikeMat = new THREE.MeshBasicMaterial({ color: 0xff8c42 });
      const spikeMesh = new THREE.Mesh(spikeGeo, spikeMat);
      spikeMesh.rotation.x = Math.PI / 2;
      spikeMesh.position.z = 0.35;
      spikeMesh.userData = { siteId: site.id };
      markerGroup.add(spikeMesh);

      marsMesh.add(markerGroup);
      siteMarkers.push({ group: markerGroup, ring: ringMesh, pin: pinMesh, site: site });
    });

    groups.marsGlobe.add(groups.orbitHud);
    scene.add(groups.marsGlobe);
  }

  // --------------------------------------------------------------------------
  // Stage 1: 3D Spacecraft Cockpit Interior (Requirement #3)
  // --------------------------------------------------------------------------
  function buildSpacecraftCockpit() {
    groups.cockpit = new THREE.Group();

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e2530,
      metalness: 0.75,
      roughness: 0.35
    });
    const darkPanelMat = new THREE.MeshStandardMaterial({
      color: 0x0f141c,
      metalness: 0.5,
      roughness: 0.6
    });
    const screenGlowMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.22
    });
    const amberGlowMat = new THREE.MeshBasicMaterial({
      color: 0xf97316
    });

    // Main Lower Instrument Glare-Shield & Console Desk
    const consoleBase = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.5, 3.2), darkPanelMat);
    consoleBase.position.set(0, -2.05, -2.6);
    consoleBase.rotation.x = -0.22;
    groups.cockpit.add(consoleBase);

    const glareShield = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.16, 1.6), frameMat);
    glareShield.position.set(0, -1.18, -2.2);
    glareShield.rotation.x = -0.1;
    groups.cockpit.add(glareShield);

    // 3D Multi-Function Displays (Left, Center, Right MFDs) on dashboard
    [-2.1, 0, 2.1].forEach((xOffset, idx) => {
      const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.95, 0.12), frameMat);
      bezel.position.set(xOffset, -1.55, -1.75);
      bezel.rotation.x = -0.35;
      if (idx === 0) bezel.rotation.y = 0.18;
      if (idx === 2) bezel.rotation.y = -0.18;

      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(1.38, 0.78),
        idx === 1 ? new THREE.MeshBasicMaterial({ color: 0xea580c, transparent: true, opacity: 0.25 }) : screenGlowMat
      );
      screen.position.z = 0.07;
      bezel.add(screen);
      groups.cockpit.add(bezel);
    });

    // 3D Throttle Quadrant & Attitude Stick
    const throttlePedestal = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.9), frameMat);
    throttlePedestal.position.set(-0.95, -1.65, -1.35);
    groups.cockpit.add(throttlePedestal);

    const throttleHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 12), amberGlowMat);
    throttleHandle.rotation.z = Math.PI / 2;
    throttleHandle.position.set(-0.95, -1.3, -1.35);
    groups.cockpit.add(throttleHandle);

    const flightStick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.5, 12), frameMat);
    flightStick.position.set(0.95, -1.45, -1.35);
    flightStick.rotation.x = -0.2;
    groups.cockpit.add(flightStick);

    // Angled Spacecraft Window Canopy Struts (Left, Right, Center-Left, Center-Right, Upper Bulkhead)
    const strutPositions = [
      { x: -3.6, y: 0.4, z: -2.5, rz: -0.28, ry: 0.3 },
      { x: -1.45, y: 0.4, z: -2.8, rz: -0.12, ry: 0.1 },
      { x: 1.45, y: 0.4, z: -2.8, rz: 0.12, ry: -0.1 },
      { x: 3.6, y: 0.4, z: -2.5, rz: 0.28, ry: -0.3 }
    ];
    strutPositions.forEach((st) => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.2, 0.28), frameMat);
      strut.position.set(st.x, st.y, st.z);
      strut.rotation.z = st.rz;
      strut.rotation.y = st.ry;
      groups.cockpit.add(strut);
    });

    // Overhead Canopy Arch & Caution Light Strip
    const upperArch = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.55, 2.2), darkPanelMat);
    upperArch.position.set(0, 2.35, -2.3);
    upperArch.rotation.x = 0.25;
    groups.cockpit.add(upperArch);

    // Interior Cabin Warm Accent Point Light
    const cabinLight = new THREE.PointLight(0xff7b3a, 0.85, 8);
    cabinLight.position.set(0, 1.5, -1.2);
    groups.cockpit.add(cabinLight);

    groups.cockpit.visible = false;
    scene.add(groups.cockpit);
  }

  // --------------------------------------------------------------------------
  // Stage 4: Spacecraft Descent & Landing Sequence (Requirement #7)
  // --------------------------------------------------------------------------
  function buildDescentSequenceGroup() {
    groups.descent = new THREE.Group();

    // Expanding Martian terrain surface below the descending spacecraft
    const groundGeo = new THREE.PlaneGeometry(320, 320, lowSpecMode ? 32 : 64, lowSpecMode ? 32 : 64);
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const dist = Math.sqrt(vx * vx + vy * vy);
      const height =
        Math.sin(vx * 0.08) * Math.cos(vy * 0.08) * 2.2 +
        (dist > 18 ? Math.sin(dist * 0.12) * 3.5 : 0);
      posAttr.setZ(i, height);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      map: createSurfaceGroundTexture(0xb04a25),
      roughness: 0.92,
      metalness: 0.05
    });
    descentGroundMesh = new THREE.Mesh(groundGeo, groundMat);
    descentGroundMesh.rotation.x = -Math.PI / 2;
    descentGroundMesh.position.y = -35;
    groups.descent.add(descentGroundMesh);

    // 3D Spacecraft / Aeroshell Lander Assembly
    landerGroup = new THREE.Group();

    // Crew Ascent/Descent Capsule
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.55, roughness: 0.35 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.65, 2.3, 24), hullMat);
    capsule.position.y = 0.6;
    landerGroup.add(capsule);

    const noseCap = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.9, 0.55, 24), trimMat);
    noseCap.position.y = 2.0;
    landerGroup.add(noseCap);

    // 4 Landing Legs
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const legGroup = new THREE.Group();
      legGroup.rotation.y = angle;

      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8), trimMat);
      strut.position.set(1.55, -0.5, 0);
      strut.rotation.z = 0.45;
      legGroup.add(strut);

      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.08, 12), trimMat);
      pad.position.set(1.9, -1.25, 0);
      legGroup.add(pad);

      landerGroup.add(legGroup);
    }

    // Ablative Heat Shield & Plasma Shock Cone (Stages 2-3 of EDL)
    const shieldGeo = new THREE.ConeGeometry(2.35, 1.1, 32, 1, true);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });
    heatShieldCone = new THREE.Mesh(shieldGeo, shieldMat);
    heatShieldCone.rotation.x = Math.PI;
    heatShieldCone.position.y = -0.65;
    landerGroup.add(heatShieldCone);

    // Supersonic Parachute Canopy + Risers (Stage 4 of EDL)
    parachuteCanopy = new THREE.Group();
    const domeGeo = new THREE.SphereGeometry(3.4, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.6,
      side: THREE.DoubleSide
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 8.5;
    parachuteCanopy.add(dome);

    const lineMat = new THREE.LineBasicMaterial({ color: 0xcbd5e1 });
    for (let l = 0; l < 8; l++) {
      const a = (l / 8) * Math.PI * 2;
      const pts = [
        new THREE.Vector3(0, 2.2, 0),
        new THREE.Vector3(Math.cos(a) * 3.2, 8.3, Math.sin(a) * 3.2)
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      parachuteCanopy.add(new THREE.Line(lineGeo, lineMat));
    }
    parachuteCanopy.visible = false;
    landerGroup.add(parachuteCanopy);

    // 4 Retro-Propulsion Engine Plumes (Stages 5-6 of EDL)
    retroFlames = [];
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85
    });
    for (let f = 0; f < 4; f++) {
      const a = (f * Math.PI) / 2;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 2.2, 12), flameMat);
      flame.rotation.x = Math.PI;
      flame.position.set(Math.cos(a) * 1.15, -1.4, Math.sin(a) * 1.15);
      flame.visible = false;
      landerGroup.add(flame);
      retroFlames.push(flame);
    }

    groups.descent.add(landerGroup);

    // Surface Dust Plume Particles near Touchdown
    const dustGeo = new THREE.BufferGeometry();
    const dustCount = 350;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const r = 1 + Math.random() * 14;
      const a = Math.random() * Math.PI * 2;
      dustPos[i * 3] = Math.cos(a) * r;
      dustPos[i * 3 + 1] = -2.2 + Math.random() * 2.5;
      dustPos[i * 3 + 2] = Math.sin(a) * r;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xd97742,
      size: 0.45,
      transparent: true,
      opacity: 0.0
    });
    dustParticles = new THREE.Points(dustGeo, dustMat);
    landerGroup.add(dustParticles);

    groups.descent.visible = false;
    scene.add(groups.descent);
  }

  // --------------------------------------------------------------------------
  // Stage 5: Martian Surface, 3D Astronaut, Lander & Habitat (Requirement #8 & #10)
  // --------------------------------------------------------------------------
  function buildSurfaceAndAstronautGroup() {
    groups.surface = new THREE.Group();

    // Procedural Martian Terrain Mesh
    const terrainGeo = new THREE.PlaneGeometry(240, 240, lowSpecMode ? 40 : 72, lowSpecMode ? 40 : 72);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const distCenter = Math.sqrt(x * x + y * y);
      // Keep central walking corridor relatively smooth; raise crater rim around perimeter
      let h = Math.sin(x * 0.07) * Math.cos(y * 0.07) * 0.65;
      if (distCenter > 38) {
        h += Math.pow((distCenter - 38) * 0.12, 1.45);
      }
      pos.setZ(i, h);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: createSurfaceGroundTexture(0xa84824),
      roughness: 0.92,
      metalness: 0.04
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.rotation.x = -Math.PI / 2;
    terrainMesh.name = "surfaceTerrain";
    groups.surface.add(terrainMesh);

    // Scatter Realistic Martian Basalt Boulders & Rocks
    const rockGeo = new THREE.DodecahedronGeometry(1, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x5c2814,
      roughness: 0.9,
      metalness: 0.08
    });
    let rSeed = 1337;
    function rRand() {
      rSeed = (rSeed * 16807) % 2147483647;
      return (rSeed - 1) / 2147483646;
    }
    for (let i = 0; i < 85; i++) {
      const rx = (rRand() - 0.5) * 140;
      const rz = (rRand() - 0.5) * 140;
      // Avoid blocking astronaut spawn, habitat door, or lander pad
      if (Math.abs(rx) < 6 && rz > -30 && rz < 24) continue;
      if (Math.hypot(rx - landerExteriorPosition.x, rz - landerExteriorPosition.z) < 8) continue;

      const rock = new THREE.Mesh(rockGeo, rockMat);
      const s = 0.35 + rRand() * 1.65;
      rock.scale.set(s * 1.2, s * 0.75, s);
      rock.position.set(rx, s * 0.25, rz);
      rock.rotation.set(rRand() * 3, rRand() * 3, rRand() * 3);
      groups.surface.add(rock);
    }

    // Landed Mars Ascent/Descent Vehicle (Visible in background on surface)
    const landedCraft = new THREE.Group();
    landedCraft.position.set(landerExteriorPosition.x, 1.35, landerExteriorPosition.z);
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.55, roughness: 0.35 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.5, 4.2, 24), hullMat);
    body.position.y = 1.2;
    landedCraft.add(body);

    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.4, 1.2, 24), legMat);
    cone.position.y = 3.9;
    landedCraft.add(cone);

    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.0, 8), legMat);
      leg.position.set(Math.cos(a) * 2.4, -0.4, Math.sin(a) * 2.4);
      leg.rotation.z = -Math.cos(a) * 0.4;
      leg.rotation.x = Math.sin(a) * 0.4;
      landedCraft.add(leg);
    }
    groups.surface.add(landedCraft);

    // Mars Habitat Structure + Pressurized Airlock + Solar Arrays (at z = -24)
    const habGroup = new THREE.Group();
    habGroup.position.set(habitatExteriorPosition.x, 0, habitatExteriorPosition.z);

    const habMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.45, metalness: 0.25 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.4, metalness: 0.4 });
    const airlockMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.65 });

    // Main Pressurized Geodesic Dome
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(6.5, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.55),
      habMat
    );
    dome.position.y = 0;
    habGroup.add(dome);

    // Structural Orange Thermal Band
    const ringBand = new THREE.Mesh(new THREE.CylinderGeometry(6.55, 6.55, 0.45, 32), accentMat);
    ringBand.position.y = 0.6;
    habGroup.add(ringBand);

    // Forward Cylindrical Airlock Tunnel (Facing +Z toward Astronaut)
    const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 4.2, 20), airlockMat);
    tunnel.rotation.x = Math.PI / 2;
    tunnel.position.set(0, 1.4, 6.8);
    habGroup.add(tunnel);

    // Airlock Hatch Door & Glowing Entry Status Beacon
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.3, 0.25), habMat);
    hatch.position.set(0, 1.35, 8.9);
    habGroup.add(hatch);

    const hatchWindow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    hatchWindow.position.set(0, 1.65, 9.05);
    habGroup.add(hatchWindow);

    // Glowing Target Beacon above Airlock
    beaconMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    beaconMesh.position.set(0, 3.3, 8.8);
    habGroup.add(beaconMesh);

    // Secondary Hydroponics Module Wing (East Side)
    const hydroWing = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 6.5, 20), habMat);
    hydroWing.rotation.z = Math.PI / 2;
    hydroWing.position.set(7.5, 1.6, -1.0);
    habGroup.add(hydroWing);

    // Solar Array Wings (West Side)
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.7, roughness: 0.2 });
    for (let s = 0; s < 3; s++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 2.2), solarMat);
      panel.position.set(-9.5, 1.2, -3.5 + s * 3.0);
      panel.rotation.x = 0.32;
      habGroup.add(panel);
    }

    // High-Gain Deep Space Network Dish Antenna
    const commsTower = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 3.5, 8), airlockMat);
    commsTower.position.set(-4.2, 6.2, -2.0);
    habGroup.add(commsTower);
    const commsDish = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.55, 20), habMat);
    commsDish.position.set(-4.2, 8.0, -2.0);
    commsDish.rotation.x = 0.6;
    habGroup.add(commsDish);

    groups.surface.add(habGroup);

    // ------------------------------------------------------------------------
    // Detailed Low-Poly 3D Astronaut Character (Requirement #8: Suit, Helmet,
    // Gold Visor, Backpack PLSS, Articulated Arms/Gloves & Legs/Boots)
    // ------------------------------------------------------------------------
    astronautGroup = new THREE.Group();
    const suitWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, metalness: 0.15 });
    const suitGrey = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.3 });
    const suitOrange = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.4, metalness: 0.3 });
    const visorGold = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.15, metalness: 0.92 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.82, 0.44), suitWhite);
    torso.position.y = 1.28;
    astronautGroup.add(torso);

    // Chest Display Control Unit (DCM)
    const dcm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.12), suitGrey);
    dcm.position.set(0, 1.34, -0.25);
    astronautGroup.add(dcm);

    // Orange Mission Stripe on Torso
    const chestBand = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.46), suitOrange);
    chestBand.position.y = 1.52;
    astronautGroup.add(chestBand);

    // Helmet & Gold Reflective Visor
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 20), suitWhite);
    helmet.position.y = 1.92;
    astronautGroup.add(helmet);

    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 16, 16, 0, Math.PI * 0.85, Math.PI * 0.18, Math.PI * 0.55),
      visorGold
    );
    visor.rotation.y = -Math.PI * 0.92;
    visor.position.set(0, 1.92, -0.04);
    astronautGroup.add(visor);

    // Portable Life Support System (PLSS) Backpack
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.78, 0.32), suitWhite);
    backpack.position.set(0, 1.34, 0.34);
    astronautGroup.add(backpack);

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.38, 8), suitOrange);
    antenna.position.set(0.2, 1.88, 0.38);
    astronautGroup.add(antenna);

    // Articulated Left & Right Arms + Gloves
    function createArm(side) {
      const armPivot = new THREE.Group();
      armPivot.position.set(side * 0.44, 1.58, 0);
      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.58, 12), suitWhite);
      upperArm.position.y = -0.26;
      armPivot.add(upperArm);

      const glove = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), suitOrange);
      glove.position.y = -0.58;
      armPivot.add(glove);
      return armPivot;
    }
    astroLeftArm = createArm(-1);
    astroRightArm = createArm(1);
    astronautGroup.add(astroLeftArm, astroRightArm);

    // Articulated Left & Right Legs + Boots
    function createLeg(side) {
      const legPivot = new THREE.Group();
      legPivot.position.set(side * 0.19, 0.86, 0);
      const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.72, 12), suitWhite);
      legMesh.position.y = -0.35;
      legPivot.add(legMesh);

      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.34), suitGrey);
      boot.position.set(0, -0.74, -0.05);
      legPivot.add(boot);
      return legPivot;
    }
    astroLeftLeg = createLeg(-1);
    astroRightLeg = createLeg(1);
    astronautGroup.add(astroLeftLeg, astroRightLeg);

    astronautGroup.position.set(astroState.x, 0, astroState.z);
    groups.surface.add(astronautGroup);

    groups.surface.visible = false;
    scene.add(groups.surface);
  }

  // --------------------------------------------------------------------------
  // Stage 6: Mars Habitat Interior Environment (Requirement #10)
  // --------------------------------------------------------------------------
  function buildHabitatInteriorGroup() {
    groups.habitatInterior = new THREE.Group();

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.55,
      metalness: 0.35,
      side: THREE.BackSide
    });
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.7,
      metalness: 0.4
    });

    // Cylindrical Pressurized Habitat Hull
    const roomShell = new THREE.Mesh(new THREE.CylinderGeometry(9.0, 9.0, 6.2, 32), wallMat);
    roomShell.position.y = 2.6;
    groups.habitatInterior.add(roomShell);

    const floorDisk = new THREE.Mesh(new THREE.CircleGeometry(9.0, 32), floorMat);
    floorDisk.rotation.x = -Math.PI / 2;
    floorDisk.position.y = -0.45;
    groups.habitatInterior.add(floorDisk);

    // Central Holographic Mars Mission Command Table
    const tableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.9, 0.9, 24),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.3 })
    );
    tableBase.position.set(0, 0.0, -3.5);
    groups.habitatInterior.add(tableBase);

    const holoGlobe = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xf97316, wireframe: true, transparent: true, opacity: 0.55 })
    );
    holoGlobe.position.set(0, 1.45, -3.5);
    holoGlobe.name = "habHoloGlobe";
    groups.habitatInterior.add(holoGlobe);

    // Hydroponics Vertical Grow Racks (Left Side)
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5, roughness: 0.4 });
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 });
    const growLightMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });

    for (let r = 0; r < 3; r++) {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.8, 0.8), rackMat);
      rack.position.set(-4.8, 0.95, -2.5 - r * 1.4);
      rack.rotation.y = 0.45;

      const foliage = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.45, 0.65), plantMat);
      foliage.position.y = 0.2;
      rack.add(foliage);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.08, 0.65), growLightMat);
      strip.position.y = 0.65;
      rack.add(strip);

      groups.habitatInterior.add(rack);
    }

    // Life Support MOXIE & Sabatier Water Recycler Tanks (Right Side)
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 });
    for (let t = 0; t < 3; t++) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.6, 16), tankMat);
      tank.position.set(4.8, 0.85, -2.5 - t * 1.3);
      groups.habitatInterior.add(tank);
    }

    // Habitat Observation Viewport Window looking out onto red Mars landscape
    const viewportFrame = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.45, 32),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 })
    );
    viewportFrame.position.set(0, 2.2, -8.8);
    groups.habitatInterior.add(viewportFrame);

    const viewportGlass = new THREE.Mesh(
      new THREE.CircleGeometry(1.2, 32),
      new THREE.MeshBasicMaterial({ color: 0xb84a24 })
    );
    viewportGlass.position.set(0, 2.2, -8.82);
    groups.habitatInterior.add(viewportGlass);

    // Interior Warm Habitat Lighting
    const habLight = new THREE.PointLight(0xe0f2fe, 1.1, 25);
    habLight.position.set(0, 4.8, -3.0);
    groups.habitatInterior.add(habLight);

    groups.habitatInterior.visible = false;
    scene.add(groups.habitatInterior);
  }

  // --------------------------------------------------------------------------
  // Stage Switching & Camera Orchestration
  // --------------------------------------------------------------------------
  function setStage(stageName, siteId) {
    currentStage = stageName;
    playTone(520, "sine", 0.14, 0.05);

    // Reset visibility
    groups.marsGlobe.visible = false;
    groups.orbitHud.visible = false;
    groups.cockpit.visible = false;
    groups.descent.visible = false;
    groups.surface.visible = false;
    groups.habitatInterior.visible = false;
    groups.stars.visible = true;
    scene.fog = null;
    scene.background = new THREE.Color(0x04060c);

    if (stageName === "TITLE") {
      groups.marsGlobe.visible = true;
      siteMarkers.forEach((m) => (m.group.visible = false));
      groups.marsGlobe.position.set(3.8, -0.5, 0);
      camera.position.set(0, 0, 22);
      camera.lookAt(2.2, 0, 0);
      autoRotateGlobe = true;
    } else if (stageName === "COCKPIT") {
      groups.marsGlobe.visible = true;
      groups.cockpit.visible = true;
      siteMarkers.forEach((m) => (m.group.visible = false));
      cockpitJourneyProgress = 0.0;
      cockpitWarpActive = false;
      groups.marsGlobe.position.set(0, 0.5, -52);
      camera.position.set(0, 0, 0);
      camera.rotation.set(0, 0, 0);
    } else if (stageName === "ORBIT" || stageName === "SITE_ANALYSIS") {
      groups.marsGlobe.visible = true;
      groups.orbitHud.visible = true;
      siteMarkers.forEach((m) => (m.group.visible = true));
      groups.marsGlobe.position.set(0, 0, 0);
      marsMesh.rotation.y = 0; // Lock globe rotation so spherical camera coordinates align with markers
      autoRotateGlobe = stageName === "ORBIT" && !siteId;
      if (siteId) {
        focusOnSite(siteId);
      } else {
        targetOrbitAngles = { theta: 0.5, phi: 1.3, radius: 22 };
      }
    } else if (stageName === "DESCENT") {
      groups.descent.visible = true;
      groups.stars.visible = false;
      const site = window.JAMN_DATA.landingSites[siteId] || window.JAMN_DATA.landingSites.olympus_mons;
      scene.background = new THREE.Color(site.skyColor);
      scene.fog = new THREE.FogExp2(site.skyColor, 0.008);
      descentGroundMesh.material.map = createSurfaceGroundTexture(site.terrainColor);
      descentGroundMesh.material.needsUpdate = true;
      descentAltitudeRatio = 1.0;
    } else if (stageName === "SURFACE") {
      groups.surface.visible = true;
      groups.stars.visible = false;
      const site = window.JAMN_DATA.landingSites[siteId] || window.JAMN_DATA.landingSites.olympus_mons;
      scene.background = new THREE.Color(site.skyColor);
      scene.fog = new THREE.FogExp2(site.skyColor, site.fogDensity);
      const terrainMesh = groups.surface.getObjectByName("surfaceTerrain");
      if (terrainMesh) {
        terrainMesh.material.map = createSurfaceGroundTexture(site.terrainColor);
        terrainMesh.material.needsUpdate = true;
      }
      // Reset astronaut position facing North toward Mars Habitat
      astroState.x = 0;
      astroState.z = 16;
      astroState.yaw = Math.PI;
      astroState.pitch = 0;
    } else if (stageName === "HABITAT") {
      groups.habitatInterior.visible = true;
      groups.stars.visible = false;
      scene.background = new THREE.Color(0x090d16);
      camera.position.set(0, 1.85, 2.8);
      camera.lookAt(0, 1.5, -4.0);
    }
  }

  function focusOnSite(siteId) {
    const site = window.JAMN_DATA.landingSites[siteId];
    if (!site) return;
    autoRotateGlobe = false;
    marsMesh.rotation.y = 0;

    const pos = latLonToVector3(site.lat, site.lon, 1.0).normalize();
    const phi = Math.acos(Math.max(-0.98, Math.min(0.98, pos.y)));
    const theta = Math.atan2(pos.z, pos.x);

    targetOrbitAngles.phi = phi;
    targetOrbitAngles.theta = theta;
    targetOrbitAngles.radius = 15.2;
    playTone(680, "triangle", 0.18, 0.06);
  }

  function setCockpitProgress(val, warp) {
    cockpitJourneyProgress = Math.max(0, Math.min(1, val));
    cockpitWarpActive = !!warp;
  }

  function setDescentProgress(ratio, edlStageIndex, parachuteSupported) {
    descentAltitudeRatio = Math.max(0, Math.min(1, ratio));
    if (!landerGroup) return;

    // Altitude vertical mapping
    const landerY = -32.8 + descentAltitudeRatio * 48.0;
    landerGroup.position.y = landerY;

    // Heat shield plasma glow (EDL stages 2 & 3)
    if (heatShieldCone) {
      if (edlStageIndex === 2 || edlStageIndex === 3) {
        heatShieldCone.material.opacity = edlStageIndex === 3 ? 0.82 : 0.45;
      } else {
        heatShieldCone.material.opacity = 0.0;
      }
    }

    // Supersonic Parachute (EDL stage 4, if supported by site atmosphere)
    if (parachuteCanopy) {
      parachuteCanopy.visible = edlStageIndex === 4 && parachuteSupported !== false;
    }

    // Retro-propulsion engines (EDL stages 4/5/6)
    const flamesActive =
      edlStageIndex === 5 ||
      edlStageIndex === 6 ||
      (edlStageIndex === 4 && parachuteSupported === false);
    retroFlames.forEach((fl) => {
      fl.visible = flamesActive;
      if (flamesActive) {
        fl.scale.y = 0.8 + Math.random() * 0.45;
      }
    });

    // Surface Dust Kickup near Touchdown (EDL stages 6 & 7)
    if (dustParticles) {
      dustParticles.material.opacity = edlStageIndex === 6 || edlStageIndex === 7 ? 0.65 : 0.0;
      dustParticles.rotation.y += 0.04;
    }

    // Dynamic camera framing around descending lander
    const shake =
      edlStageIndex >= 2 && edlStageIndex <= 6 ? (Math.random() - 0.5) * 0.18 : 0;
    camera.position.set(6.5 + shake, landerY + 2.8 + shake, 8.5);
    camera.lookAt(0, landerY - 1.2, 0);
  }

  function setSurfaceCameraMode(mode) {
    surfaceCameraMode = mode === "THIRD_PERSON" ? "THIRD_PERSON" : "FIRST_PERSON";
    playTone(440, "sine", 0.1, 0.05);
  }

  function getSurfaceCameraMode() {
    return surfaceCameraMode;
  }

  function setPerformanceMode(isLowSpec) {
    lowSpecMode = !!isLowSpec;
    if (renderer) {
      renderer.setPixelRatio(lowSpecMode ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.5));
    }
  }

  function triggerAstronautMove(dir, active) {
    if (dir in moveKeys) {
      moveKeys[dir] = active;
    }
  }

  function moveAstronautStep(dx, dz, dYaw) {
    astroState.yaw += dYaw || 0;
    const forwardX = Math.sin(astroState.yaw);
    const forwardZ = Math.cos(astroState.yaw);
    astroState.x += forwardX * dz + Math.cos(astroState.yaw) * dx;
    astroState.z += forwardZ * dz - Math.sin(astroState.yaw) * dx;
    astroState.x = Math.max(-45, Math.min(45, astroState.x));
    astroState.z = Math.max(-32, Math.min(35, astroState.z));
    astroState.walkCycle += 0.8;
  }

  function getAstronautTelemetry() {
    const distToHab = Math.hypot(
      astroState.x - habitatExteriorPosition.x,
      astroState.z - (habitatExteriorPosition.z + 9.0)
    );
    return {
      x: astroState.x,
      z: astroState.z,
      distToHabitatMeters: Math.max(0, Math.round(distToHab * 2.5)),
      nearHabitat: distToHab < 7.5
    };
  }

  // --------------------------------------------------------------------------
  // Pointer & Keyboard Interactions
  // --------------------------------------------------------------------------
  function setupInteractions(domElement) {
    domElement.addEventListener("pointerdown", (e) => {
      initAudio();
      isDraggingGlobe = true;
      prevPointer.x = e.clientX;
      prevPointer.y = e.clientY;

      // Check 3D Landing Marker Click in ORBIT or SITE_ANALYSIS stage
      if (currentStage === "ORBIT" || currentStage === "SITE_ANALYSIS") {
        const rect = domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const meshes = [];
        siteMarkers.forEach((m) => {
          meshes.push(m.pin, m.ring);
        });
        const hits = raycaster.intersectObjects(meshes, true);
        if (hits.length > 0) {
          const hitSiteId = hits[0].object.userData.siteId;
          if (hitSiteId && window.JAMN_MAIN && window.JAMN_MAIN.selectLandingSite) {
            window.JAMN_MAIN.selectLandingSite(hitSiteId);
          }
        }
      }
    });

    window.addEventListener("pointermove", (e) => {
      if (!isDraggingGlobe) return;
      const dx = e.clientX - prevPointer.x;
      const dy = e.clientY - prevPointer.y;
      prevPointer.x = e.clientX;
      prevPointer.y = e.clientY;

      if (currentStage === "ORBIT" || currentStage === "SITE_ANALYSIS") {
        autoRotateGlobe = false;
        targetOrbitAngles.theta += dx * 0.0065;
        targetOrbitAngles.phi = Math.max(0.25, Math.min(Math.PI - 0.25, targetOrbitAngles.phi - dy * 0.0065));
      } else if (currentStage === "SURFACE") {
        astroState.yaw -= dx * 0.005;
        astroState.pitch = Math.max(-0.45, Math.min(0.45, astroState.pitch - dy * 0.004));
      }
    });

    window.addEventListener("pointerup", () => {
      isDraggingGlobe = false;
    });

    window.addEventListener("keydown", (e) => {
      if (isPaused || currentStage !== "SURFACE") return;
      const code = e.code;
      if (code === "KeyW" || code === "ArrowUp") moveKeys.forward = true;
      if (code === "KeyS" || code === "ArrowDown") moveKeys.backward = true;
      if (code === "KeyA" || code === "ArrowLeft") moveKeys.left = true;
      if (code === "KeyD" || code === "ArrowRight") moveKeys.right = true;
    });

    window.addEventListener("keyup", (e) => {
      if (isPaused || currentStage !== "SURFACE") return;
      const code = e.code;
      if (code === "KeyW" || code === "ArrowUp") moveKeys.forward = false;
      if (code === "KeyS" || code === "ArrowDown") moveKeys.backward = false;
      if (code === "KeyA" || code === "ArrowLeft") moveKeys.left = false;
      if (code === "KeyD" || code === "ArrowRight") moveKeys.right = false;
    });
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // --------------------------------------------------------------------------
  // Main Render & Animation Loop
  // --------------------------------------------------------------------------
  function animate() {
    requestAnimationFrame(animate);
    if (isPaused) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();

    if (currentStage === "TITLE") {
      marsMesh.rotation.y += dt * 0.14;
      groups.stars.rotation.y += dt * 0.01;
    } else if (currentStage === "COCKPIT") {
      marsMesh.rotation.y += dt * 0.12;
      // Planet gradually grows larger & closer as spacecraft approaches Mars
      const targetZ = -54 + cockpitJourneyProgress * 37.5; // -54 -> -16.5
      groups.marsGlobe.position.z += (targetZ - groups.marsGlobe.position.z) * 0.08;
      const scaleVal = 0.45 + cockpitJourneyProgress * 0.85;
      groups.marsGlobe.scale.set(scaleVal, scaleVal, scaleVal);

      // Subtle spacecraft cockpit camera sway
      const swayAmp = cockpitWarpActive ? 0.045 : 0.015;
      camera.position.x = Math.sin(elapsed * 2.1) * swayAmp;
      camera.position.y = Math.cos(elapsed * 1.7) * swayAmp;
      camera.lookAt(0, 0.15, -20);
    } else if (currentStage === "ORBIT" || currentStage === "SITE_ANALYSIS") {
      groups.marsGlobe.scale.set(1, 1, 1);
      if (autoRotateGlobe) {
        targetOrbitAngles.theta += dt * 0.12;
      }
      orbitAngles.theta += (targetOrbitAngles.theta - orbitAngles.theta) * 0.08;
      orbitAngles.phi += (targetOrbitAngles.phi - orbitAngles.phi) * 0.08;
      orbitAngles.radius += (targetOrbitAngles.radius - orbitAngles.radius) * 0.08;

      const cx = orbitAngles.radius * Math.sin(orbitAngles.phi) * Math.cos(orbitAngles.theta);
      const cy = orbitAngles.radius * Math.cos(orbitAngles.phi);
      const cz = orbitAngles.radius * Math.sin(orbitAngles.phi) * Math.sin(orbitAngles.theta);
      camera.position.set(cx, cy, cz);
      camera.lookAt(0, 0, 0);

      // Orbiting reconnaissance satellite animation
      if (orbitingCraftPivot) {
        orbitingCraftPivot.rotation.y += dt * 0.45;
      }

      // Pulse landing site markers
      siteMarkers.forEach((m, idx) => {
        const s = 1.0 + Math.sin(elapsed * 4.0 + idx) * 0.18;
        m.ring.scale.set(s, s, 1);
      });
    } else if (currentStage === "SURFACE") {
      // Update Astronaut Movement & Articulated Limb Animation
      const turnSpeed = 1.65;
      const walkSpeed = 7.5;
      let moving = false;

      if (moveKeys.left) astroState.yaw += turnSpeed * dt;
      if (moveKeys.right) astroState.yaw -= turnSpeed * dt;

      let dirSign = 0;
      if (moveKeys.forward) {
        dirSign = 1;
        moving = true;
      } else if (moveKeys.backward) {
        dirSign = -0.65;
        moving = true;
      }

      if (moving) {
        astroState.x += Math.sin(astroState.yaw) * walkSpeed * dirSign * dt;
        astroState.z += Math.cos(astroState.yaw) * walkSpeed * dirSign * dt;
        astroState.x = Math.max(-45, Math.min(45, astroState.x));
        astroState.z = Math.max(-32, Math.min(35, astroState.z));
        astroState.walkCycle += dt * 7.5;
      }

      // Terrain height following
      const groundY =
        Math.sin(astroState.x * 0.07) * Math.cos(astroState.z * 0.07) * 0.65;

      if (astronautGroup) {
        astronautGroup.position.set(astroState.x, groundY, astroState.z);
        astronautGroup.rotation.y = astroState.yaw + Math.PI;

        const swing = moving ? Math.sin(astroState.walkCycle) * 0.55 : Math.sin(elapsed * 1.5) * 0.04;
        if (astroLeftLeg) astroLeftLeg.rotation.x = swing;
        if (astroRightLeg) astroRightLeg.rotation.x = -swing;
        if (astroLeftArm) astroLeftArm.rotation.x = -swing * 0.75;
        if (astroRightArm) astroRightArm.rotation.x = swing * 0.75;

        // Show full astronaut in Third-Person; in First-Person, keep arms visible when looking down
        astronautGroup.visible = surfaceCameraMode === "THIRD_PERSON";
      }

      if (beaconMesh) {
        beaconMesh.scale.setScalar(1.0 + Math.sin(elapsed * 5.0) * 0.22);
      }

      if (surfaceCameraMode === "FIRST_PERSON") {
        const bob = moving ? Math.sin(astroState.walkCycle * 2) * 0.06 : 0;
        camera.position.set(astroState.x, groundY + 1.88 + bob, astroState.z);
        const lookX = astroState.x + Math.sin(astroState.yaw) * 10;
        const lookZ = astroState.z + Math.cos(astroState.yaw) * 10;
        const lookY = groundY + 1.85 + astroState.pitch * 8;
        camera.lookAt(lookX, lookY, lookZ);
      } else {
        // Third-Person Astronaut Camera behind and above the spacesuit
        const camDist = 5.2;
        const camX = astroState.x - Math.sin(astroState.yaw) * camDist;
        const camZ = astroState.z - Math.cos(astroState.yaw) * camDist;
        camera.position.set(camX, groundY + 3.1, camZ);
        camera.lookAt(astroState.x, groundY + 1.55, astroState.z);
      }
    } else if (currentStage === "HABITAT") {
      const holo = groups.habitatInterior.getObjectByName("habHoloGlobe");
      if (holo) {
        holo.rotation.y += dt * 0.4;
      }
      camera.position.x = Math.sin(elapsed * 0.4) * 0.35;
      camera.lookAt(0, 1.45, -3.5);
    }

    renderer.render(scene, camera);
  }

  function pause() {
    isPaused = true;
  }

  function resume() {
    isPaused = false;
  }

  return {
    init,
    pause,
    resume,
    setStage,
    focusOnSite,
    setCockpitProgress,
    setDescentProgress,
    setSurfaceCameraMode,
    getSurfaceCameraMode,
    setPerformanceMode,
    triggerAstronautMove,
    moveAstronautStep,
    getAstronautTelemetry,
    playTone,
    setMuted
  };
})();
