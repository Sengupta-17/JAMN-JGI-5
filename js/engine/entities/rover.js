/**
 * 6-Wheel Rocker-Bogie Mars Exploration Rover (Segment 4)
 * Provides 3D procedural rover geometry, vehicle controls, steering,
 * terrain slope adaptation, and third-person chase camera tracking.
 */

export class MarsRover {
  constructor(scene, physicsAuthority) {
    this.scene = scene;
    this.physics = physicsAuthority;

    this.position = new THREE.Vector3(0, 0, 55); // Spawn outside base perimeter
    this.heading = 0; // Yaw angle in radians
    this.speed = 0; // Forward velocity in m/s
    this.maxSpeed = 8.5; // m/s (~30 km/h)
    this.acceleration = 6.0;
    this.steeringAngle = 0;
    this.turnRate = 1.6; // rad/s

    this.wheels = [];
    this.mesh = this.buildRoverMesh();
    this.scene.add(this.mesh);

    // Initial terrain positioning
    this.physics.clampToSurface(this.position, 0.7);
    this.mesh.position.copy(this.position);
  }

  buildRoverMesh() {
    const root = new THREE.Group();

    // 1. Main Avionics Chassis Box
    const bodyGeo = new THREE.BoxGeometry(2.4, 0.9, 3.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      metalness: 0.6,
      roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    body.receiveShadow = true;
    root.add(body);

    // 2. Solar Deck / Scientific Equipment Top
    const deckGeo = new THREE.BoxGeometry(2.2, 0.1, 2.8);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x1d3557, // deep blue solar cells
      metalness: 0.8,
      roughness: 0.2
    });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = 1.1;
    root.add(deck);

    // 3. Sensor Mast & Stereo Cameras
    const mastGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.4, 8);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(-0.7, 1.7, -0.9);
    root.add(mast);

    const headGeo = new THREE.BoxGeometry(0.4, 0.25, 0.3);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(-0.7, 2.4, -0.9);
    root.add(head);

    // 4. Rocker-Bogie Suspension & 6 All-Terrain Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.38, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8,
      metalness: 0.4
    });

    const wheelOffsets = [
      { x: -1.5, y: 0.45, z: -1.3 }, // Front Left
      { x:  1.5, y: 0.45, z: -1.3 }, // Front Right
      { x: -1.6, y: 0.45, z:  0.0 }, // Mid Left
      { x:  1.6, y: 0.45, z:  0.0 }, // Mid Right
      { x: -1.5, y: 0.45, z:  1.3 }, // Rear Left
      { x:  1.5, y: 0.45, z:  1.3 }  // Rear Right
    ];

    this.wheels = [];
    for (const off of wheelOffsets) {
      const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
      wheelMesh.position.set(off.x, off.y, off.z);
      wheelMesh.castShadow = true;
      root.add(wheelMesh);
      this.wheels.push(wheelMesh);
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

    // Accelerate / Brake
    if (throttle !== 0) {
      this.speed += throttle * this.acceleration * dt;
      this.speed = Math.max(-this.maxSpeed * 0.5, Math.min(this.maxSpeed, this.speed));
    } else {
      // Natural rolling friction
      this.speed *= Math.pow(0.85, dt * 10);
      if (Math.abs(this.speed) < 0.05) this.speed = 0;
    }

    // Steering turn rate
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
    this.physics.clampToSurface(this.position, 0.45);
    this.mesh.position.copy(this.position);

    // Dynamic pitch/roll quaternion alignment to terrain normal
    this.physics.alignVehicleToTerrain(this.position, this.heading, this.mesh.quaternion);

    // Animate wheel rotation based on distance travelled
    const wheelRoll = (this.speed * dt) / 0.45; // angular displacement = distance / radius
    for (const wheel of this.wheels) {
      wheel.rotation.x += wheelRoll;
    }
  }

  /**
   * Updates third-person chase camera to smoothly track behind the rover.
   * @param {THREE.Camera} camera Three.js perspective camera
   */
  updateChaseCamera(camera) {
    const chaseDistance = 9.5;
    const chaseHeight = 4.2;

    const backX = -Math.sin(this.heading) * chaseDistance;
    const backZ = -Math.cos(this.heading) * chaseDistance;

    const desiredCamPos = new THREE.Vector3(
      this.position.x + backX,
      this.position.y + chaseHeight,
      this.position.z + backZ
    );

    camera.position.lerp(desiredCamPos, 0.1);
    const lookTarget = new THREE.Vector3(this.position.x, this.position.y + 1.2, this.position.z);
    camera.lookAt(lookTarget);
  }

  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
  }
}
