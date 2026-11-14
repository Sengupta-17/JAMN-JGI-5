/**
 * Surface Physics Authority for Mars Exploration (Segment 4)
 * Evaluates Martian 0.38g gravity (3.72 m/s^2), terrain surface friction,
 * velocity integration, and incline slope alignment.
 */

export class SurfacePhysics {
  constructor(terrainManager) {
    this.terrain = terrainManager;
    this.gravity = 3.72; // Martian gravitational acceleration in m/s^2
    this.friction = 0.94; // Surface traction damping
  }

  /**
   * Snaps or clamps an entity position to the terrain surface.
   * @param {THREE.Vector3} position World position
   * @param {number} hoverOffset Distance above ground in meters
   */
  clampToSurface(position, hoverOffset = 0.0) {
    const groundElevation = this.terrain.getElevationAt(position.x, position.z);
    position.y = groundElevation + hoverOffset;
  }

  /**
   * Applies low-gravity kinematics to a free-falling or leaping astronaut.
   * @param {Object} entity Kinematic body with position, velocity, and isGrounded flag
   * @param {number} dt Delta time in seconds
   * @param {number} eyeHeight Astronaut eye height offset (e.g. 1.7m)
   */
  updateAstronautPhysics(entity, dt, eyeHeight = 1.7) {
    const groundElevation = this.terrain.getElevationAt(entity.position.x, entity.position.z);
    const targetY = groundElevation + eyeHeight;

    if (!entity.isGrounded) {
      entity.velocity.y -= this.gravity * dt;
      entity.position.y += entity.velocity.y * dt;

      if (entity.position.y <= targetY) {
        entity.position.y = targetY;
        entity.velocity.y = 0;
        entity.isGrounded = true;
      }
    } else {
      entity.position.y = targetY;
    }

    // Apply horizontal drag/friction
    entity.velocity.x *= Math.pow(this.friction, dt * 30);
    entity.velocity.z *= Math.pow(this.friction, dt * 30);

    entity.position.x += entity.velocity.x * dt;
    entity.position.z += entity.velocity.z * dt;
  }

  /**
   * Calculates pitch and roll orientation quaternion for a vehicle resting on terrain.
   * @param {THREE.Vector3} position Vehicle center
   * @param {number} headingYaw Vehicle steering heading angle in radians
   * @param {THREE.Quaternion} targetQuaternion Output quaternion
   */
  alignVehicleToTerrain(position, headingYaw, targetQuaternion) {
    const normal = this.terrain.getNormalAt(position.x, position.z);

    // Compute heading forward vector
    const forward = new THREE.Vector3(Math.sin(headingYaw), 0, Math.cos(headingYaw)).normalize();

    // Compute right vector perpendicular to normal and forward
    const right = new THREE.Vector3().crossVectors(forward, normal).normalize();
    const correctedForward = new THREE.Vector3().crossVectors(normal, right).normalize();

    // Construct rotation matrix from basis vectors
    const m = new THREE.Matrix4();
    m.makeBasis(right, normal, correctedForward.negate());
    targetQuaternion.setFromRotationMatrix(m);
  }
}
