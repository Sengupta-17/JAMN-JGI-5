/**
 * 6-Wheel Rocker-Bogie Mars Exploration Rover (Segment 4 - Phase 1)
 * Authentic NASA MSL / Mars 2020 exploration vehicle architecture:
 * - Articulated rocker-bogie differential suspension kinematics
 * - 6 cleated titanium all-terrain wheels with active 4-corner steering knuckles
 * - Warm Electronics Box (WEB) chassis with gold Kapton MLI thermal blankets
 * - Remote Sensing Mast (RSM) with Mastcam-Z stereo optics & SuperCam laser aperture
 * - 5-Axis articulated Instrument Deployment Device (Robotic Science Arm)
 * - Aft Multi-Mission Radioisotope Thermoelectric Generator (MMRTG) with radial cooling fins
 * - High-Gain Antenna (HGA) directional dish and omni Low-Gain whip
 * - Smooth third-person chase camera and terrain slope adaptation
 */

import * as THREE_MODULE from 'three';
import { pbrFactory } from '../graphics/pbrMaterials.js';

const THREE = (typeof window !== 'undefined' && window.THREE) ? window.THREE : THREE_MODULE;

export class MarsRover {
  constructor(scene, physicsAuthority) {
    this.scene = scene;
    this.physics = physicsAuthority;

    this.position = new THREE.Vector3(0, 0, 55); // Spawns outside base perimeter
    this.heading = 0; // Yaw angle in radians
    this.speed = 0; // Forward velocity in m/s
    this.maxSpeed = 8.5; // m/s (~30 km/h)
    this.acceleration = 6.0;
    this.steeringAngle = 0;
    this.maxSteeringAngle = 0.45; // ~26 degrees
    this.turnRate = 1.6; // rad/s

    this.wheels = [];
    this.steeringKnuckles = [];
    this.mastHead = null;
    this.antennaDish = null;

    this.mesh = this.buildRoverMesh();
    this.scene.add(this.mesh);

    // Initial terrain positioning
    if (this.physics && this.physics.clampToSurface) {
      this.physics.clampToSurface(this.position, 0.7);
    }
    this.mesh.position.copy(this.position);
  }

  buildRoverMesh() {
    const root = new THREE.Group();

    // Materials from PBR Factory
    const mliMat = pbrFactory.getGoldMLIMaterial();
    const aeroMetalMat = pbrFactory.getAerospaceMetalMaterial({ color: 0xdde2ea, roughness: 0.35, metalness: 0.82 });
    const darkMetalMat = pbrFactory.getAerospaceMetalMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.85 });
    const carbonMat = pbrFactory.getCarbonFiberMaterial();
    const solarMat = pbrFactory.getSolarPanelMaterial();
    const glassMat = pbrFactory.getPolycarbonateDomeMaterial();
    const emissiveSensorMat = pbrFactory.getEmissiveDisplayMaterial(0x38bdf8, 2.0);

    // =========================================================================
    // 1. CHASSIS / WARM ELECTRONICS BOX (WEB)
    // =========================================================================
    const chassisGroup = new THREE.Group();

    // 1A. Main Core Avionics Body (Tapered hexagonal aerospace hull)
    const bodyGeo = new THREE.BoxGeometry(2.3, 0.85, 3.1);
    const bodyMesh = new THREE.Mesh(bodyGeo, aeroMetalMat);
    bodyMesh.position.y = 0.75;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    chassisGroup.add(bodyMesh);

    // 1B. Gold Kapton MLI Thermal Insulation Side Skirts
    const mliLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 2.8), mliMat);
    mliLeft.position.set(-1.18, 0.75, 0);
    chassisGroup.add(mliLeft);

    const mliRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 2.8), mliMat);
    mliRight.position.set(1.18, 0.75, 0);
    chassisGroup.add(mliRight);

    // 1C. Equipment Top Deck & Heat Rejection Louvers
    const deckGeo = new THREE.BoxGeometry(2.2, 0.08, 2.9);
    const deckMesh = new THREE.Mesh(deckGeo, aeroMetalMat);
    deckMesh.position.y = 1.2;
    deckMesh.castShadow = true;
    chassisGroup.add(deckMesh);

    // Radiator thermal louvers (Starboard side)
    const louverMat = pbrFactory.getAerospaceMetalMaterial({ color: 0x64748b, roughness: 0.25, metalness: 0.9 });
    for (let l = -0.8; l <= 0.8; l += 0.2) {
      const louver = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.12), louverMat);
      louver.position.set(0.85, 1.25, l);
      chassisGroup.add(louver);
    }

    // Solar calibration radiometric target disc (Aft deck)
    const calibDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), darkMetalMat);
    calibDisc.position.set(0.65, 1.26, 0.9);
    chassisGroup.add(calibDisc);

    // Front & Rear Hazard Avoidance Cameras (Hazcams)
    const hazcamGeo = new THREE.BoxGeometry(0.18, 0.08, 0.08);
    const hazcamFwd = new THREE.Mesh(hazcamGeo, darkMetalMat);
    hazcamFwd.position.set(0, 0.85, -1.58);
    chassisGroup.add(hazcamFwd);

    const hazcamAft = new THREE.Mesh(hazcamGeo, darkMetalMat);
    hazcamAft.position.set(0, 0.85, 1.58);
    chassisGroup.add(hazcamAft);

    root.add(chassisGroup);

    // =========================================================================
    // 2. REMOTE SENSING MAST (RSM) - "THE ROVER HEAD"
    // =========================================================================
    const mastGroup = new THREE.Group();
    mastGroup.position.set(-0.65, 1.2, -0.95); // Front-left corner of top deck

    // Vertical Carbon-Fiber Structural Column
    const mastGeo = new THREE.CylinderGeometry(0.055, 0.075, 1.5, 12);
    const mastCol = new THREE.Mesh(mastGeo, carbonMat);
    mastCol.position.y = 0.75;
    mastCol.castShadow = true;
    mastGroup.add(mastCol);

    // Masthead Sensor Housing (Rotatable yaw/pitch)
    this.mastHead = new THREE.Group();
    this.mastHead.position.set(0, 1.52, 0);

    const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.28, 0.32), aeroMetalMat);
    headBox.castShadow = true;
    this.mastHead.add(headBox);

    // Central SuperCam / ChemCam Laser Telescope Lens
    const chemcamGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.14, 16);
    chemcamGeo.rotateX(Math.PI / 2);
    const chemcamLens = new THREE.Mesh(chemcamGeo, darkMetalMat);
    chemcamLens.position.set(0, 0.02, -0.18);
    this.mastHead.add(chemcamLens);

    const chemcamGlass = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), emissiveSensorMat);
    chemcamGlass.position.set(0, 0.02, -0.252);
    chemcamGlass.rotation.y = Math.PI;
    this.mastHead.add(chemcamGlass);

    // Dual Mastcam-Z Stereo Optical Cameras (Left & Right)
    const mastcamGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.12, 12);
    mastcamGeo.rotateX(Math.PI / 2);

    const mastcamL = new THREE.Mesh(mastcamGeo, darkMetalMat);
    mastcamL.position.set(-0.16, 0.05, -0.18);
    this.mastHead.add(mastcamL);

    const mastcamR = new THREE.Mesh(mastcamGeo, darkMetalMat);
    mastcamR.position.set(0.16, 0.05, -0.18);
    this.mastHead.add(mastcamR);

    // MEDA Meteorological Sensor Booms (Extending sideways)
    const boomGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.35, 8);
    boomGeo.rotateZ(Math.PI / 2);
    const boomL = new THREE.Mesh(boomGeo, darkMetalMat);
    boomL.position.set(-0.35, 0.08, 0);
    this.mastHead.add(boomL);

    mastGroup.add(this.mastHead);
    root.add(mastGroup);

    // =========================================================================
    // 3. 5-AXIS ROBOTIC SCIENCE ARM (IDD)
    // =========================================================================
    const armGroup = new THREE.Group();
    armGroup.position.set(0.7, 0.75, -1.45); // Front-right chassis corner

    // Shoulder Turret Joint
    const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 12), darkMetalMat);
    armGroup.add(shoulder);

    // Upper Arm Bone
    const armUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.9, 8), carbonMat);
    armUpper.position.set(0, 0.35, -0.25);
    armUpper.rotation.x = 0.55;
    armGroup.add(armUpper);

    // Forearm & Science Instrument Turret
    const turretGroup = new THREE.Group();
    turretGroup.position.set(0, 0.7, -0.65);

    // Turret housing with coring drill & spectrometers
    const turretCore = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.22, 12), aeroMetalMat);
    turretCore.rotation.z = Math.PI / 2;
    turretGroup.add(turretCore);

    const drillBit = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.24, 8), darkMetalMat);
    drillBit.rotation.x = -Math.PI / 2;
    drillBit.position.set(0, 0, -0.16);
    turretGroup.add(drillBit);

    armGroup.add(turretGroup);
    root.add(armGroup);

    // =========================================================================
    // 4. AFT POWER GENERATOR (MMRTG)
    // =========================================================================
    const mmrtgGroup = new THREE.Group();
    mmrtgGroup.position.set(0, 1.05, 1.6); // Aft cantilever mount
    mmrtgGroup.rotation.x = 0.42; // Tilted upward for cooling convection

    // Core Cask
    const caskGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.75, 16);
    const caskMesh = new THREE.Mesh(caskGeo, aeroMetalMat);
    mmrtgGroup.add(caskMesh);

    // 8 Radial Cooling Fin Wings
    const finGeo = new THREE.BoxGeometry(0.02, 0.7, 0.22);
    for (let f = 0; f < 8; f++) {
      const fin = new THREE.Mesh(finGeo, darkMetalMat);
      fin.rotation.y = (f / 8) * Math.PI;
      fin.position.y = 0;
      mmrtgGroup.add(fin);
    }
    root.add(mmrtgGroup);

    // =========================================================================
    // 5. HIGH-GAIN & LOW-GAIN TELEMETRY ANTENNAS
    // =========================================================================
    // Steerable Parabolic High-Gain Antenna (HGA)
    this.antennaDish = new THREE.Group();
    this.antennaDish.position.set(0.65, 1.25, 0.2);

    const dishBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 8), darkMetalMat);
    this.antennaDish.add(dishBase);

    const dishGeo = new THREE.SphereGeometry(0.38, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.35);
    const dishMesh = new THREE.Mesh(dishGeo, aeroMetalMat);
    dishMesh.rotation.x = -0.55;
    dishMesh.position.set(0, 0.22, 0);
    this.antennaDish.add(dishMesh);

    root.add(this.antennaDish);

    // Low-Gain Antenna (LGA) Omni Whip
    const lgaWhip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.85, 6), darkMetalMat);
    lgaWhip.position.set(-0.85, 1.65, 0.6);
    root.add(lgaWhip);

    // =========================================================================
    // 5B. ROVER NIGHT LIGHT / MAST EXPLORATION BEACON MODULE
    // Installed beside the telemetry antenna (High-Gain Antenna deck mount)
    // =========================================================================
    this.nightLightGroup = new THREE.Group();
    this.nightLightGroup.position.set(0.92, 1.35, 0.25); // Mounted right beside the antenna base

    // Structural mounting bracket & heat sink
    const bracketMat = pbrFactory.getAerospaceMetalMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.85 });
    const bracketGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.16, 8);
    const bracketMesh = new THREE.Mesh(bracketGeo, bracketMat);
    this.nightLightGroup.add(bracketMesh);

    // Light fixture cowl (cylindrical reflector)
    const cowlGeo = new THREE.CylinderGeometry(0.07, 0.05, 0.12, 12);
    cowlGeo.rotateX(Math.PI / 2);
    const cowlMesh = new THREE.Mesh(cowlGeo, bracketMat);
    cowlMesh.position.set(0, 0.08, -0.06);
    this.nightLightGroup.add(cowlMesh);

    // Emissive LED Bulb Lens (Visual indicator mesh)
    const bulbGeo = new THREE.SphereGeometry(0.055, 12, 12);
    this.nightLightBulbMaterial = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: 0x000000,
      emissiveIntensity: 0.0,
      roughness: 0.2,
      metalness: 0.8
    });
    this.nightLightBulbMesh = new THREE.Mesh(bulbGeo, this.nightLightBulbMaterial);
    this.nightLightBulbMesh.position.set(0, 0.08, -0.11);
    this.nightLightGroup.add(this.nightLightBulbMesh);

    // Real Three.js Spotlight Illuminator (Casts forward beam across Martian regolith at night)
    this.nightLightSource = new THREE.SpotLight(0xfff5db, 0.0, 38.0, Math.PI / 3.5, 0.5, 1.4);
    this.nightLightSource.position.set(0, 0.08, -0.12);
    this.nightLightSource.castShadow = true;
    this.nightLightSource.shadow.mapSize.width = 1024;
    this.nightLightSource.shadow.mapSize.height = 1024;
    this.nightLightSource.shadow.bias = -0.001;
    this.nightLightGroup.add(this.nightLightSource);

    // Spotlight target (aimed forward-downward onto ground ahead of the rover)
    this.nightLightTarget = new THREE.Object3D();
    this.nightLightTarget.position.set(0.92, -0.2, -8.0);
    root.add(this.nightLightTarget);
    this.nightLightSource.target = this.nightLightTarget;

    root.add(this.nightLightGroup);

    // State: Boolean flag tracking night light illumination state
    this.isNightLightOn = false;

    // =========================================================================
    // 6. ROCKER-BOGIE MOBILITY SUSPENSION & 6 TITANIUM WHEELS
    // =========================================================================
    // Wheel geometry: Radius 0.45m, Width 0.38m
    const wheelRadius = 0.45;
    const wheelWidth = 0.38;

    // Machined titanium all-terrain wheel with traction grousers
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 18);
    wheelGeo.rotateZ(Math.PI / 2); // Cylinder axis aligned along local X
    const wheelMat = pbrFactory.getAerospaceMetalMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.8 });

    // Inner wheel rim cap
    const hubMat = pbrFactory.getAerospaceMetalMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.9 });

    const wheelConfigs = [
      { id: 'FL', x: -1.55, y: wheelRadius, z: -1.35, isSteerable: true }, // Front Left
      { id: 'FR', x:  1.55, y: wheelRadius, z: -1.35, isSteerable: true }, // Front Right
      { id: 'ML', x: -1.65, y: wheelRadius, z:  0.05, isSteerable: false },// Mid Left
      { id: 'MR', x:  1.65, y: wheelRadius, z:  0.05, isSteerable: false },// Mid Right
      { id: 'RL', x: -1.55, y: wheelRadius, z:  1.45, isSteerable: true }, // Rear Left
      { id: 'RR', x:  1.55, y: wheelRadius, z:  1.45, isSteerable: true }  // Rear Right
    ];

    this.wheels = [];
    this.steeringKnuckles = [];

    // Structural suspension rocker tubes
    const rockerMat = pbrFactory.getAerospaceMetalMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.85 });
    const rockerLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.6), rockerMat);
    rockerLeft.position.set(-1.35, 0.65, 0.05);
    rockerLeft.rotation.x = -0.05;
    root.add(rockerLeft);

    const rockerRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.6), rockerMat);
    rockerRight.position.set(1.35, 0.65, 0.05);
    rockerRight.rotation.x = -0.05;
    root.add(rockerRight);

    for (const cfg of wheelConfigs) {
      // Steering knuckle group (yaw pivot for corner wheels)
      const knuckle = new THREE.Group();
      knuckle.position.set(cfg.x, cfg.y, cfg.z);

      // Wheel assembly
      const wheelAssembly = new THREE.Group();

      const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
      wheelMesh.castShadow = true;
      wheelMesh.receiveShadow = true;
      wheelAssembly.add(wheelMesh);

      // Gold anodized center hubcap
      const hubcap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, wheelWidth + 0.02, 12), hubMat);
      hubcap.rotateZ(Math.PI / 2);
      wheelAssembly.add(hubcap);

      knuckle.add(wheelAssembly);
      root.add(knuckle);

      // Register spinning wheel mesh for update roll
      this.wheels.push(wheelAssembly);

      if (cfg.isSteerable) {
        this.steeringKnuckles.push({ knuckle, isFront: cfg.z < 0 });
      }
    }

    return root;
  }

  update(dt, inputKeys) {
    // Process Driving Inputs (W/S or Up/Down)
    let throttle = 0;
    if (inputKeys.KeyW || inputKeys.ArrowUp) throttle += 1;
    if (inputKeys.KeyS || inputKeys.ArrowDown) throttle -= 1;

    // Process Steering Inputs (A/D or Left/Right)
    let steer = 0;
    if (inputKeys.KeyA || inputKeys.ArrowLeft) steer += 1;
    if (inputKeys.KeyD || inputKeys.ArrowRight) steer -= 1;

    // Accelerate / Brake with inertia
    if (throttle !== 0) {
      this.speed += throttle * this.acceleration * dt;
      this.speed = Math.max(-this.maxSpeed * 0.5, Math.min(this.maxSpeed, this.speed));
    } else {
      // Natural rolling regolith friction
      this.speed *= Math.pow(0.85, dt * 10);
      if (Math.abs(this.speed) < 0.05) this.speed = 0;
    }

    // Dynamic Ackermann-style corner wheel steering angle
    const targetSteerAngle = steer * this.maxSteeringAngle;
    this.steeringAngle += (targetSteerAngle - this.steeringAngle) * Math.min(1.0, dt * 8.0);

    // Apply active steering angle to corner knuckles (front inverts rear for tight 4-wheel steer)
    for (const sk of this.steeringKnuckles) {
      sk.knuckle.rotation.y = sk.isFront ? this.steeringAngle : -this.steeringAngle * 0.75;
    }

    // Steering turn rate applied to vehicle yaw
    if (steer !== 0 && Math.abs(this.speed) > 0.1) {
      const direction = (this.speed >= 0) ? 1 : -1;
      this.heading += steer * this.turnRate * dt * direction;
    }

    // Update horizontal position
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);

    this.position.x += forwardX * this.speed * dt;
    this.position.z += forwardZ * this.speed * dt;

    // Clamp to terrain surface with chassis clearance
    if (this.physics && this.physics.clampToSurface) {
      this.physics.clampToSurface(this.position, 0.45);
    }
    this.mesh.position.copy(this.position);

    // Dynamic pitch/roll quaternion alignment to terrain normal
    if (this.physics && this.physics.alignVehicleToTerrain) {
      this.physics.alignVehicleToTerrain(this.position, this.heading, this.mesh.quaternion);
    }

    // Animate wheel rotation based on distance travelled (d = v * dt, theta = d / R)
    const wheelRoll = (this.speed * dt) / 0.45;
    for (const wheel of this.wheels) {
      wheel.rotation.x += wheelRoll;
    }

    // Subtle antenna dish search tracking
    if (this.antennaDish) {
      this.antennaDish.rotation.y = Math.sin(Date.now() * 0.0008) * 0.25;
    }
  }

  /**
   * Updates third-person chase camera to smoothly track behind the rover.
   * @param {THREE.Camera} camera Three.js perspective camera
   */
  updateChaseCamera(camera) {
    if (!camera) return;

    const chaseDistance = 9.8;
    const chaseHeight = 4.4;

    const backX = -Math.sin(this.heading) * chaseDistance;
    const backZ = -Math.cos(this.heading) * chaseDistance;

    const desiredCamPos = new THREE.Vector3(
      this.position.x + backX,
      this.position.y + chaseHeight,
      this.position.z + backZ
    );

    camera.position.lerp(desiredCamPos, 0.12);
    const lookTarget = new THREE.Vector3(this.position.x, this.position.y + 1.25, this.position.z);
    camera.lookAt(lookTarget);
  }

  /**
   * Sets the rover antenna night light state.
   * @param {boolean} enabled True to illuminate, false to extinguish.
   */
  setNightLight(enabled) {
    this.isNightLightOn = !!enabled;

    if (this.nightLightSource) {
      this.nightLightSource.intensity = this.isNightLightOn ? 3.5 : 0.0;
    }

    if (this.nightLightBulbMaterial) {
      if (this.isNightLightOn) {
        this.nightLightBulbMaterial.color.setHex(0xffffff);
        this.nightLightBulbMaterial.emissive.setHex(0xfff5db);
        this.nightLightBulbMaterial.emissiveIntensity = 2.8;
      } else {
        this.nightLightBulbMaterial.color.setHex(0x334155);
        this.nightLightBulbMaterial.emissive.setHex(0x000000);
        this.nightLightBulbMaterial.emissiveIntensity = 0.0;
      }
    }
  }

  /**
   * Convenience helper to illuminate the rover mast night light.
   */
  turnOnNightLight() {
    this.setNightLight(true);
  }

  /**
   * Convenience helper to extinguish the rover mast night light.
   */
  turnOffNightLight() {
    this.setNightLight(false);
  }

  dispose() {
    this.setNightLight(false);
    if (this.nightLightBulbMaterial) {
      this.nightLightBulbMaterial.dispose();
    }
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }
}
