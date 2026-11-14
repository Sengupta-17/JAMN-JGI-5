/**
 * Mars Atmosphere & Diurnal Sky System (Segment 4)
 * Simulates realistic Martian sky colors, diurnal sun trajectory,
 * Rayleigh/Mie scattering transitions (salmon day to blue-violet sunset),
 * and night-time starfields.
 */

export class MarsAtmosphere {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.sunLight = null;
    this.ambientLight = null;
    this.skyDome = null;
    this.starField = null;

    this.sunRadius = 350.0;
    this.initLighting();
    this.initSkyDome();
    this.initStarField();
  }

  initLighting() {
    // Martian Sun Directional Light
    this.sunLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 600;
    this.sunLight.shadow.camera.left = -120;
    this.sunLight.shadow.camera.right = 120;
    this.sunLight.shadow.camera.top = 120;
    this.sunLight.shadow.camera.bottom = -120;
    this.sunLight.shadow.bias = -0.001;
    this.scene.add(this.sunLight);

    // Ambient diffuse Martian scattering
    this.ambientLight = new THREE.AmbientLight(0x9a4a2b, 0.45);
    this.scene.add(this.ambientLight);
  }

  initSkyDome() {
    const skyGeo = new THREE.SphereGeometry(450, 32, 24);
    // Custom gradient shader or material for Martian atmosphere
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0xc97a52,
      side: THREE.BackSide,
      fog: false
    });

    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    // Surface fog
    this.scene.fog = new THREE.FogExp2(0xc97a52, 0.0025);
  }

  initStarField() {
    const starCount = 1500;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 440;

      // Restrict mostly to upper hemisphere
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 10;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
      opacity: 0.0
    });

    this.starField = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starField);
  }

  /**
   * Updates lighting and atmosphere with the Sol progress (0.0 to 1.0) and dust opacity.
   * Day phase: 0.0 to 0.70 (42 seconds of 60s sol).
   * Night phase: 0.70 to 1.0 (18 seconds of 60s sol).
   */
  update(solProgress, stormOpacityTau = 0.5) {
    // Map sol progress to orbital angle (0 to 2*PI)
    // 0.0 = Sunrise, 0.35 = Solar Zenith, 0.70 = Sunset, 0.85 = Midnight
    const orbitAngle = solProgress * Math.PI * 2 - Math.PI * 0.5;

    const sunX = Math.cos(orbitAngle) * this.sunRadius;
    const sunY = Math.sin(orbitAngle) * this.sunRadius;
    const sunZ = Math.sin(orbitAngle * 0.5) * 80.0;

    this.sunLight.position.set(sunX, Math.max(-50, sunY), sunZ);
    this.sunLight.target.position.set(0, 0, 0);

    const isDay = sunY > 0;
    const sunElevation = Math.max(0.0, sunY / this.sunRadius);

    // Dust attenuation factor on solar brightness
    const dustTrans = Math.min(1.0, Math.max(0.05, Math.exp(-0.45 * Math.max(0, stormOpacityTau - 0.5))));

    if (isDay) {
      // Day lighting
      const dayIntensity = Math.max(0.1, sunElevation * 1.4 * dustTrans);
      this.sunLight.intensity = dayIntensity;

      // Color shifts: Sunset/sunrise is cool violet-blue, noon is butterscotch salmon
      if (sunElevation < 0.25) {
        // Twilight horizon glow
        const t = sunElevation / 0.25;
        this.skyDome.material.color.setRGB(0.55 * t + 0.25 * (1 - t), 0.35 * t + 0.20 * (1 - t), 0.25 * t + 0.35 * (1 - t));
        this.scene.fog.color.copy(this.skyDome.material.color);
      } else {
        // High sun butterscotch
        this.skyDome.material.color.setHex(0xc97a52);
        this.scene.fog.color.setHex(0xc97a52);
      }

      this.ambientLight.intensity = 0.45 * dustTrans;
      this.starField.material.opacity = 0.0;
    } else {
      // Night phase
      this.sunLight.intensity = 0.0;
      this.skyDome.material.color.setHex(0x0a060d); // deep space indigo-black
      this.scene.fog.color.setHex(0x0a060d);
      this.ambientLight.intensity = 0.08;

      // Fade in stars
      const nightProgress = (solProgress - 0.70) / 0.30;
      const starFade = Math.sin(nightProgress * Math.PI);
      this.starField.material.opacity = Math.max(0.0, starFade * 0.9);
    }
  }

  dispose() {
    if (this.skyDome) {
      this.scene.remove(this.skyDome);
      this.skyDome.geometry.dispose();
      this.skyDome.material.dispose();
    }
    if (this.starField) {
      this.scene.remove(this.starField);
      this.starField.geometry.dispose();
      this.starField.material.dispose();
    }
    if (this.sunLight) this.scene.remove(this.sunLight);
    if (this.ambientLight) this.scene.remove(this.ambientLight);
  }
}
