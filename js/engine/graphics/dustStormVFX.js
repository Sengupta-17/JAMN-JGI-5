/**
 * Dynamic Dust Storm Particle System (Segment 4)
 * Simulates low-altitude regolith dust drift and high-opacity storm squalls.
 * Opacity, particle velocity, and turbulence scale with atmospheric opacity (Tau).
 */

export class DustStormVFX {
  constructor(scene, particleCount = 3500) {
    this.scene = scene;
    this.particleCount = particleCount;

    this.boxSize = 200.0;
    this.particles = null;
    this.positions = null;
    this.velocities = null;

    this.initParticles();
  }

  initParticles() {
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      this.positions[i * 3] = (Math.random() - 0.5) * this.boxSize;
      this.positions[i * 3 + 1] = Math.random() * 25.0; // from ground up to 25m
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * this.boxSize;

      // Base wind velocity (blowing West to East with small turbulence)
      this.velocities[i * 3] = 4.0 + Math.random() * 5.0;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 2.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xcc6633,
      size: 0.85,
      transparent: true,
      opacity: 0.15,
      depthWrite: false
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  /**
   * Updates particle positions relative to center position (player/rover).
   * @param {number} dt Delta time in seconds
   * @param {THREE.Vector3} centerPos Center of bounding volume
   * @param {number} stormOpacityTau Optical depth (0.5 clear to 10.0 extreme storm)
   */
  update(dt, centerPos, stormOpacityTau = 0.5) {
    if (!this.particles) return;

    // Wind speed multiplier scales with storm intensity
    const stormSeverity = Math.max(0.0, stormOpacityTau - 0.5);
    const speedMult = 1.0 + stormSeverity * 1.8;
    const targetOpacity = Math.min(0.85, 0.08 + stormSeverity * 0.12);

    this.particles.material.opacity = THREE.MathUtils.lerp(
      this.particles.material.opacity,
      targetOpacity,
      dt * 2.0
    );

    const halfBox = this.boxSize * 0.5;
    const pos = this.particles.geometry.attributes.position.array;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      pos[idx] += this.velocities[idx] * speedMult * dt;
      pos[idx + 1] += this.velocities[idx + 1] * dt;
      pos[idx + 2] += this.velocities[idx + 2] * dt;

      // Wrap around bounding box around centerPos
      if (pos[idx] > centerPos.x + halfBox) pos[idx] -= this.boxSize;
      if (pos[idx] < centerPos.x - halfBox) pos[idx] += this.boxSize;

      if (pos[idx + 1] > 30.0) pos[idx + 1] = 0.5;
      if (pos[idx + 1] < 0.2) pos[idx + 1] = 28.0;

      if (pos[idx + 2] > centerPos.z + halfBox) pos[idx + 2] -= this.boxSize;
      if (pos[idx + 2] < centerPos.z - halfBox) pos[idx + 2] += this.boxSize;
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      this.particles.material.dispose();
      this.particles = null;
    }
  }
}
