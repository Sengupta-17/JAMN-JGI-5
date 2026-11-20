/**
 * Mars Atmosphere & Diurnal Sky System (Segment 4 - Phase 2)
 * Simulates physical Martian atmospheric scattering:
 * - Dynamic Rayleigh & Mie aerosol scattering (Fe2O3 dust particles)
 * - Authentic butterscotch/salmon daytime sky transitioning to iconic blue-violet sunset halo
 * - Optical dust opacity (Tau) solar attenuation and horizon contraction
 * - Diurnal solar trajectory with shadow-casting DirectionalLight and ambient bounce
 * - High-contrast night starfield with nocturnal fade
 */

import * as THREE_MODULE from 'three';

const THREE = (typeof window !== 'undefined' && window.THREE) ? window.THREE : THREE_MODULE;

export class MarsAtmosphere {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.sunLight = null;
    this.ambientLight = null;
    this.skyDome = null;
    this.skyShaderMat = null;
    this.starField = null;

    this.sunRadius = 380.0;
    this.sunPosition = new THREE.Vector3();
    this.sunDirection = new THREE.Vector3();

    this.initLighting();
    this.initSkyDome();
    this.initStarField();
  }

  initLighting() {
    // 1. Primary Martian Sun Directional Light (Casts soft terrain & rover shadows)
    this.sunLight = new THREE.DirectionalLight(0xffeedd, 1.4);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 700;
    this.sunLight.shadow.camera.left = -140;
    this.sunLight.shadow.camera.right = 140;
    this.sunLight.shadow.camera.top = 140;
    this.sunLight.shadow.camera.bottom = -140;
    this.sunLight.shadow.bias = -0.0006;
    this.sunLight.shadow.radius = 1.8;
    this.scene.add(this.sunLight);

    // 2. Ambient diffuse regolith bounce light
    this.ambientLight = new THREE.AmbientLight(0x9e4b2d, 0.45);
    this.scene.add(this.ambientLight);
  }

  initSkyDome() {
    const skyGeo = new THREE.SphereGeometry(460, 48, 32);

    // Physically-inspired Martian Sky Shader
    const vertexShader = `
      varying vec3 vWorldPosition;
      varying vec3 vViewDir;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vViewDir = normalize(worldPos.xyz - cameraPosition);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const fragmentShader = `
      uniform vec3 uSunDirection;
      uniform float uSunElevation;
      uniform float uDayProgress;
      uniform float uStormTau;
      uniform vec3 uHorizonColor;
      uniform vec3 uZenithColor;
      uniform vec3 uSunsetBlue;

      varying vec3 vWorldPosition;
      varying vec3 vViewDir;

      void main() {
        // Vertical gradient: 0 at horizon, 1 at zenith
        float h = clamp(normalize(vWorldPosition).y, 0.0, 1.0);

        // Baseline Martian atmosphere gradient (Warm butterscotch horizon to darker ochre/rust zenith)
        vec3 skyColor = mix(uHorizonColor, uZenithColor, pow(h, 0.65));

        // Angle relative to the sun disk
        float sunDot = max(0.0, dot(vViewDir, uSunDirection));

        // Mie Forward Scattering (Blue sunset halo vs warm daylight glow)
        // On Mars, fine dust scatters blue light preferentially at small forward angles
        if (uSunElevation > -0.05) {
          // Broad solar aureole
          float aureole = pow(sunDot, 12.0) * 0.45;

          // Tight solar core halo
          float coreHalo = pow(sunDot, 64.0) * 0.85;

          // Blue sunset color modulation (strongest when sun is near horizon)
          float sunsetFactor = clamp(1.0 - (uSunElevation / 0.32), 0.0, 1.0);
          vec3 haloColor = mix(vec3(1.0, 0.85, 0.7), uSunsetBlue, sunsetFactor * (1.0 - clamp(uStormTau * 0.25, 0.0, 0.8)));

          skyColor += haloColor * (aureole + coreHalo);

          // Crisp solar disk
          float disk = smoothstep(0.9992, 0.9998, sunDot) * 1.5;
          skyColor += vec3(1.0, 0.98, 0.92) * disk;
        }

        // Night time darkness attenuation
        float nightFade = clamp(uSunElevation * 4.0 + 0.1, 0.02, 1.0);
        skyColor *= nightFade;

        gl_FragColor = vec4(skyColor, 1.0);
      }
    `;

    this.skyShaderMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
        uSunElevation: { value: 1.0 },
        uDayProgress: { value: 0.5 },
        uStormTau: { value: 0.5 },
        uHorizonColor: { value: new THREE.Color(0xc97a52) }, // Butterscotch amber
        uZenithColor: { value: new THREE.Color(0x6e2c18) },  // Dark ferric rust
        uSunsetBlue: { value: new THREE.Color(0x4272a8) }    // Martian blue sunset halo
      },
      side: THREE.BackSide,
      fog: false,
      depthWrite: false
    });

    this.skyDome = new THREE.Mesh(skyGeo, this.skyShaderMat);
    this.scene.add(this.skyDome);

    // Atmospheric surface distance haze (Fog)
    this.scene.fog = new THREE.FogExp2(0xc97a52, 0.0022);
  }

  initStarField() {
    const starCount = 2000;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 450;

      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 8; // Upper celestial sphere
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      // Star spectral tints (white, pale blue, amber)
      const starTemp = Math.random();
      if (starTemp > 0.8) {
        colors[i * 3] = 0.85; colors[i * 3 + 1] = 0.92; colors[i * 3 + 2] = 1.0; // Blue-white
      } else if (starTemp < 0.2) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 0.7; // Red giant
      } else {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0; // Solar white
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });

    this.starField = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starField);
  }

  /**
   * Updates diurnal lighting, scattering uniforms, and solar trajectory with sol progress.
   * @param {number} solProgress 0.0 to 1.0 across the Sol
   * @param {number} stormOpacityTau Atmospheric optical depth (Tau)
   */
  update(solProgress, stormOpacityTau = 0.5) {
    // 75% Day (90s) / 25% Night (30s) Sol Mapping (120s Total Sol Duration)
    // Sol starts at 0.00 directly in morning sunrise daylight with sun rising in the east
    // 0.00 = Sunrise (~14° elevation), 0.375 = Solar Zenith (Noon), 0.72-0.75 = Sunset Twilight, 0.875 = Midnight
    let orbitAngle;
    if (solProgress <= 0.75) {
      const p = solProgress / 0.75;
      orbitAngle = 0.05 * Math.PI + p * 0.90 * Math.PI;
    } else {
      const p = (solProgress - 0.75) / 0.25;
      orbitAngle = Math.PI + p * Math.PI;
    }

    const sunX = -Math.cos(orbitAngle) * this.sunRadius;
    const sunY = Math.sin(orbitAngle) * this.sunRadius;
    const sunZ = Math.sin(orbitAngle * 0.5) * 85.0;

    this.sunPosition.set(sunX, sunY, sunZ);
    this.sunDirection.copy(this.sunPosition).normalize();

    this.sunLight.position.set(sunX, Math.max(-50, sunY), sunZ);
    this.sunLight.target.position.set(0, 0, 0);

    const isDay = (sunY > 0) && (solProgress <= 0.75);
    const sunElevation = sunY / this.sunRadius; // -1.0 to 1.0

    // Beer-Lambert dust transmission: T = exp(-tau * airmass)
    const dustTrans = Math.min(1.0, Math.max(0.06, Math.exp(-0.48 * Math.max(0, stormOpacityTau - 0.4))));

    // Update shader uniforms
    if (this.skyShaderMat && this.skyShaderMat.uniforms) {
      const u = this.skyShaderMat.uniforms;
      u.uSunDirection.value.copy(this.sunDirection);
      u.uSunElevation.value = sunElevation;
      u.uDayProgress.value = solProgress;
      u.uStormTau.value = stormOpacityTau;

      if (stormOpacityTau > 1.8) {
        // Dust Storm Overcast (Ochre-brown gloom)
        u.uHorizonColor.value.setHex(0x8a3e1c);
        u.uZenithColor.value.setHex(0x542310);
      } else {
        // Nominal Martian Sky
        u.uHorizonColor.value.setHex(0xc97a52);
        u.uZenithColor.value.setHex(0x6e2c18);
      }
    }

    if (isDay) {
      // Daylight illumination (minimum irradiance threshold to prevent pitch-black dawn/dusk)
      const dayIntensity = Math.max(0.20, sunElevation * 1.5 * dustTrans);
      this.sunLight.intensity = dayIntensity;

      // Color shifts: Twilight horizon vs Noon sun
      if (sunElevation < 0.25) {
        // Sunset / Sunrise: warm peachy-orange light
        this.sunLight.color.setRGB(1.0, 0.72, 0.52);
        this.scene.fog.color.setRGB(0.55, 0.30, 0.22);
        this.ambientLight.color.setRGB(0.45, 0.25, 0.20);
      } else {
        // High sun: Crisp solar light
        this.sunLight.color.setRGB(1.0, 0.94, 0.88);
        this.scene.fog.color.setHex(stormOpacityTau > 1.8 ? 0x8a3e1c : 0xc97a52);
        this.ambientLight.color.setHex(0x9e4b2d);
      }

      this.ambientLight.intensity = 0.42 * dustTrans;
      this.starField.material.opacity = 0.0;
    } else {
      // Night phase: Total solar occultation
      this.sunLight.intensity = 0.0;
      this.scene.fog.color.setHex(0x060308); // Deep space black fog
      this.ambientLight.intensity = 0.06;
      this.ambientLight.color.setHex(0x1a1224);

      // Starfield fade-in during night cycle (0.75 to 1.0)
      const nightProgress = (solProgress - 0.75) / 0.25;
      const starFade = Math.sin(nightProgress * Math.PI);
      this.starField.material.opacity = Math.max(0.0, starFade * 0.95);
    }
  }

  dispose() {
    if (this.skyDome) {
      this.scene.remove(this.skyDome);
      this.skyDome.geometry.dispose();
      if (this.skyShaderMat) this.skyShaderMat.dispose();
      else if (this.skyDome.material) this.skyDome.material.dispose();
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
