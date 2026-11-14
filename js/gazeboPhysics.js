/**
 * Gazebo-Standard Contact Physics Engine for Three.js First-Person Navigation
 * Simulates:
 * - Martian gravity (0.38g = 3.721 m/s^2)
 * - Capsule-AABB / Capsule-Cylinder contact detection and penetration resolution
 * - Surface friction & restitution
 * - Tangential velocity projection for wall sliding
 * - Low-gravity jumping and inertia
 * - Collision coverage for interior habitat structures
 * - Dynamic airlock blast door collision state
 */

export class GazeboPhysicsEngine {
  constructor() {
    this.gravity = 3.721; // m/s^2 (0.38g)
    this.groundY = 0.0;
    this.eyeHeight = 1.72; // Eye level in EVA suit
    this.capsuleRadius = 0.38; // Collision radius
    this.friction = 0.82;
    this.airResistance = 0.96;

    // Kinematic state
    this.position = { x: 0, y: this.eyeHeight, z: 9.0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.isGrounded = true;

    // Dynamic state
    this.isDoorOpen = false;

    // World Colliders
    this.colliders = [];
    this.interactionZones = [];

    this.initEnvironmentColliders();
  }

  initEnvironmentColliders() {
    // 1. Perimeter Boundary Wall
    this.habitatRadius = 16.6;

    // 2. Central Island Planter & Column
    this.addCylinderCollider(0, 0, 3.4, 1.2, 'Central Bio-Planter & Seating Ring');
    this.addCylinderCollider(0, 0, 0.6, 9.0, 'Central Telemetry Mast');

    // 3. Radial Science Lab Desks
    for (let d = 0; d < 3; d++) {
      const da = (d / 3) * Math.PI * 2 + 0.4;
      const dx = Math.sin(da) * 5.2;
      const dz = Math.cos(da) * 5.2;
      this.addCylinderCollider(dx, dz, 1.35, 1.0, `Radial Science Lab Desk 0${d + 1}`);
    }

    // 4. Command Deck & Server Racks
    this.addBoxCollider(0, -14.2, 6.4, 1.8, 1.4, 'Command Operations Console');
    this.addBoxCollider(0, -12.4, 1.0, 1.0, 1.1, 'Command Ergonomic Chair');
    this.addBoxCollider(-6.5, -14.2, 2.2, 1.8, 3.2, 'Comms Server Rack Alpha');
    this.addBoxCollider(6.5, -14.2, 2.2, 1.8, 3.2, 'Telemetry Server Rack Beta');

    // 5. ECLSS Atmospheric Processing Hub (West Sector, x: -13.5m)
    // OGA Electrolysis Skid (tanks)
    this.addBoxCollider(-12.7, -4.5, 3.4, 2.4, 2.8, 'ECLSS OGA Electrolysis Skid');
    // CDRA & Sabatier Methanation Unit
    this.addBoxCollider(-12.8, 4.5, 3.4, 2.4, 2.6, 'ECLSS CDRA & Sabatier Skid');

    // 6. Bioregenerative Agri-Pod Vertical Farms (East Sector, x: +13.5m)
    // Vertical Aeroponic Rotating Racks 1 & 2
    this.addBoxCollider(13.2, -4.5, 3.0, 2.4, 3.4, 'Vertical Aeroponic Rack 01');
    this.addBoxCollider(13.2, 4.5, 3.0, 2.4, 3.4, 'Vertical Aeroponic Rack 02');

    // 7. Water Recovery & ISRU Melt Extraction (South-West Sector, x: -9.5m, z: 8.5m)
    this.addCylinderCollider(-9.5, 8.5, 1.5, 2.2, 'VCD Centrifuge Distillation Unit');

    // 8. Fission Surface Power & Microgrid Control (South-East Sector, x: +9.5m, z: 8.5m)
    this.addBoxCollider(9.5, 8.5, 2.8, 1.8, 2.4, 'Kilopower Microgrid Switchboard');

    // 9. EVA Airlock Portal, Frame & Interactive Blast Door (South Sector, z: +16.5m)
    this.addBoxCollider(-2.8, 16.5, 2.2, 1.0, 3.8, 'Airlock Left Blast Frame');
    this.addBoxCollider(2.8, 16.5, 2.2, 1.0, 3.8, 'Airlock Right Blast Frame');
    
    // Blast Door itself — solid when closed (blocks passage), disabled when open!
    this.addBoxCollider(0, 16.5, 3.0, 0.6, 3.5, 'Airlock Blast Door');

    // Airlock Vestibule walls (allows walking inside the airlock room when door is open)
    this.addBoxCollider(-1.9, 18.2, 0.6, 3.8, 3.8, 'Airlock Vestibule Left Wall');
    this.addBoxCollider(1.9, 18.2, 0.6, 3.8, 3.8, 'Airlock Vestibule Right Wall');
    this.addBoxCollider(0, 20.2, 4.2, 0.6, 3.8, 'Airlock Outer Surface Hatch Bulkhead');

    // Setup Proximity Interaction Zones (Where astronaut can press [E] to inspect/repair/toggle door)
    this.interactionZones = [
      {
        id: 'airlock_door',
        name: 'EVA Airlock Pressurized Blast Hatch',
        x: 0,
        z: 15.2,
        radius: 2.2,
        prompt: 'PRESS [E] TO OPEN AIRLOCK BLAST DOOR'
      },
      {
        id: 'command_module',
        name: 'Command Deck & Comms Console',
        x: 0,
        z: -12.2,
        radius: 2.8,
        prompt: 'PRESS [E] TO ACCESS COMMAND OPS & CHALLENGES'
      },
      {
        id: 'eclss_module',
        name: 'ECLSS Atmosphere Hub (OGA & CDRA)',
        x: -11.0,
        z: 0,
        radius: 2.8,
        prompt: 'PRESS [E] TO INSPECT ECLSS LIFE SUPPORT'
      },
      {
        id: 'hydroponics_module',
        name: 'Agri-Pod Bioregenerative Farm',
        x: 11.0,
        z: 0,
        radius: 2.8,
        prompt: 'PRESS [E] TO INSPECT AGRI-POD FOOD PRODUCTION'
      },
      {
        id: 'water_recovery_module',
        name: 'Water Recovery & VCD Centrifuge',
        x: -7.5,
        z: 7.0,
        radius: 2.6,
        prompt: 'PRESS [E] TO INSPECT WATER RECOVERY SYSTEM'
      },
      {
        id: 'power_microgrid_module',
        name: 'Kilopower Nuclear Microgrid',
        x: 7.5,
        z: 7.0,
        radius: 2.6,
        prompt: 'PRESS [E] TO INSPECT POWER MICROGRID'
      },
      {
        id: 'airlock_module',
        name: 'EVA Preparation & SuitPort Bay',
        x: 0,
        z: 18.2,
        radius: 2.5,
        prompt: 'PRESS [E] TO INSPECT EVA SUITPORT & TELEMETRY'
      },
      {
        id: 'habitation_module',
        name: 'Crew Quarters & Medical Bay',
        x: 0,
        z: 4.8,
        radius: 2.5,
        prompt: 'PRESS [E] TO INSPECT CREW PODS & MED-BAY'
      }
    ];
  }

  addBoxCollider(x, z, width, depth, height, label) {
    this.colliders.push({
      type: 'box',
      minX: x - width * 0.5,
      maxX: x + width * 0.5,
      minZ: z - depth * 0.5,
      maxZ: z + depth * 0.5,
      height: height,
      label: label,
      disabled: false
    });
  }

  addCylinderCollider(x, z, radius, height, label) {
    this.colliders.push({
      type: 'cylinder',
      x: x,
      z: z,
      radius: radius,
      height: height,
      label: label,
      disabled: false
    });
  }

  toggleDoor() {
    this.isDoorOpen = !this.isDoorOpen;
    this.setDoorState(this.isDoorOpen);
    return this.isDoorOpen;
  }

  setDoorState(isOpen) {
    this.isDoorOpen = isOpen;
    const door = this.colliders.find(c => c.label === 'Airlock Blast Door');
    if (door) {
      door.disabled = isOpen;
    }
    const zone = this.interactionZones.find(z => z.id === 'airlock_door');
    if (zone) {
      zone.prompt = isOpen 
        ? 'PRESS [E] TO CLOSE AIRLOCK BLAST DOOR' 
        : 'PRESS [E] TO OPEN AIRLOCK BLAST DOOR';
    }
  }

  /**
   * Physics update step
   * @param {number} dt Delta time in seconds
   * @param {{ forward: number, strafe: number }} moveInput Normalised movement input
   * @param {number} yawRad Camera heading angle
   * @param {boolean} jumpTrigger Jump requested
   */
  update(dt, moveInput, yawRad, jumpTrigger) {
    // Clamp dt to avoid physics tunnelling
    dt = Math.min(dt, 0.05);

    // 1. Calculate intended movement acceleration in camera direction
    const moveSpeed = 4.8; // m/s walking speed in 0.38g
    let wishX = 0;
    let wishZ = 0;

    if (moveInput.forward !== 0 || moveInput.strafe !== 0) {
      const cos = Math.cos(yawRad);
      const sin = Math.sin(yawRad);

      // Forward vector (Three.js camera forward is -Z)
      const fwdX = -sin;
      const fwdZ = -cos;
      // Right vector
      const rgtX = cos;
      const rgtZ = -sin;

      wishX = fwdX * moveInput.forward + rgtX * moveInput.strafe;
      wishZ = fwdZ * moveInput.forward + rgtZ * moveInput.strafe;

      // Normalise direction
      const len = Math.hypot(wishX, wishZ);
      if (len > 0.001) {
        wishX = (wishX / len) * moveSpeed;
        wishZ = (wishZ / len) * moveSpeed;
      }
    }

    // Accelerate smoothly
    const accelRate = this.isGrounded ? 12.0 : 3.5;
    this.velocity.x += (wishX - this.velocity.x) * accelRate * dt;
    this.velocity.z += (wishZ - this.velocity.z) * accelRate * dt;

    // Apply ground friction
    if (this.isGrounded) {
      if (moveInput.forward === 0 && moveInput.strafe === 0) {
        this.velocity.x *= Math.pow(this.friction, dt * 60);
        this.velocity.z *= Math.pow(this.friction, dt * 60);
      }
    } else {
      this.velocity.x *= Math.pow(this.airResistance, dt * 60);
      this.velocity.z *= Math.pow(this.airResistance, dt * 60);
    }

    // 2. Vertical Dynamics (Martian Gravity & Jump)
    if (jumpTrigger && this.isGrounded) {
      this.velocity.y = 3.4; // Low-gravity jump impulse
      this.isGrounded = false;
    }

    if (!this.isGrounded) {
      this.velocity.y -= this.gravity * dt;
    }

    // 3. Integrate Position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Floor collision
    if (this.position.y <= this.eyeHeight) {
      this.position.y = this.eyeHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // 4. Gazebo Contact Resolution (Walls, Desks, Central Pillar, Solid Objects)
    this.resolveContacts();
  }

  resolveContacts() {
    const r = this.capsuleRadius;
    const px = this.position.x;
    const pz = this.position.z;

    // A. Outer Perimeter Dome Wall (Circular boundary)
    const distFromOrigin = Math.hypot(px, pz);
    if (distFromOrigin > this.habitatRadius - r) {
      // Check if entering the airlock doorway corridor (corridor between -1.6m and 1.6m in X, and z > 15.0m)
      const inAirlockCorridor = Math.abs(px) < 1.6 && pz > 15.0 && pz < 20.2;
      
      if (!inAirlockCorridor) {
        const normalX = px / distFromOrigin;
        const normalZ = pz / distFromOrigin;
        const penetration = distFromOrigin - (this.habitatRadius - r);

        // Correct position along contact normal
        this.position.x -= normalX * penetration;
        this.position.z -= normalZ * penetration;

        // Gazebo ODE tangential sliding: project velocity onto contact plane
        const normalDotV = this.velocity.x * normalX + this.velocity.z * normalZ;
        if (normalDotV > 0) {
          this.velocity.x -= normalDotV * normalX;
          this.velocity.z -= normalDotV * normalZ;
        }
      }
    }

    // B. Internal Obstacles (Box and Cylinder colliders)
    for (const c of this.colliders) {
      if (c.disabled) continue;

      if (c.type === 'cylinder') {
        const dx = this.position.x - c.x;
        const dz = this.position.z - c.z;
        const dist = Math.hypot(dx, dz);
        const minDist = c.radius + r;

        if (dist < minDist && dist > 0.0001) {
          const penetration = minDist - dist;
          const nx = dx / dist;
          const nz = dz / dist;

          this.position.x += nx * penetration;
          this.position.z += nz * penetration;

          // Tangential sliding
          const normalDotV = this.velocity.x * nx + this.velocity.z * nz;
          if (normalDotV < 0) {
            this.velocity.x -= normalDotV * nx;
            this.velocity.z -= normalDotV * nz;
          }
        }
      } else if (c.type === 'box') {
        // Nearest point on AABB
        const closestX = Math.max(c.minX, Math.min(this.position.x, c.maxX));
        const closestZ = Math.max(c.minZ, Math.min(this.position.z, c.maxZ));

        const dx = this.position.x - closestX;
        const dz = this.position.z - closestZ;
        const dist = Math.hypot(dx, dz);

        if (dist < r && dist > 0.0001) {
          const penetration = r - dist;
          const nx = dx / dist;
          const nz = dz / dist;

          this.position.x += nx * penetration;
          this.position.z += nz * penetration;

          // Tangential sliding
          const normalDotV = this.velocity.x * nx + this.velocity.z * nz;
          if (normalDotV < 0) {
            this.velocity.x -= normalDotV * nx;
            this.velocity.z -= normalDotV * nz;
          }
        }
      }
    }
  }

  /**
   * Check if astronaut is currently standing near an interactive terminal
   */
  getNearbyInteraction() {
    for (const zone of this.interactionZones) {
      const dx = this.position.x - zone.x;
      const dz = this.position.z - zone.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= zone.radius) {
        return {
          ...zone,
          distance: dist
        };
      }
    }
    return null;
  }
}
