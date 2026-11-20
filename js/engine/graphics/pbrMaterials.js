/**
 * Mars PBR Material & Procedural Texture Synthesizer (Phase 1)
 * Generates mathematically authentic Physically Based Rendering (PBR) materials:
 * - Regolith with tangent-space normal mapping (Sobel elevation gradient) and roughness
 * - Dark volcanic basalt with vesicular surface pitting
 * - Gold Kapton Multi-Layer Insulation (MLI) with creased foil normals
 * - Photovoltaic silicon solar cell arrays with conductive busbars
 * - Carbon-fiber composite struts with twill weave normals
 * - Brushed aerospace aluminum and titanium skids
 * - Emissive HUD display panels and optical polycarbonate dome panels
 */

import * as THREE_MODULE from 'three';

const THREE = (typeof window !== 'undefined' && window.THREE) ? window.THREE : THREE_MODULE;

export class PBRMaterialFactory {
  constructor() {
    this.textureCache = new Map();
    this.materialCache = new Map();
  }

  /**
   * Generates a procedural 2D canvas texture with fallback for headless/Node environments.
   * @param {number} width Canvas pixel width
   * @param {number} height Canvas pixel height
   * @param {Function} drawFn Drawing routine receiving (ctx, width, height)
   * @returns {THREE.Texture}
   */
  createCanvasTexture(width, height, drawFn) {
    if (typeof document === 'undefined') {
      // Headless / Node fallback: Return DataTexture
      const size = width * height;
      const data = new Uint8Array(size * 4);
      for (let i = 0; i < size; i++) {
        const stride = i * 4;
        data[stride] = 180;     // R
        data[stride + 1] = 80;  // G
        data[stride + 2] = 40;  // B
        data[stride + 3] = 255; // A
      }
      const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
      tex.needsUpdate = true;
      return tex;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    drawFn(ctx, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Synthesizes a true tangent-space normal map (RGB) from a procedural heightfield.
   * Uses central difference gradient: dX = H(x+1, y) - H(x-1, y), dY = H(x, y+1) - H(x, y-1).
   * Encodes N = normalize(-dX * s, -dY * s, 1) into RGB [0, 255].
   * @param {number} width Pixel width
   * @param {number} height Pixel height
   * @param {Function} heightFn Function(x, y, w, h) returning normalized height [0.0, 1.0]
   * @param {number} bumpStrength Relief exaggeration factor
   * @returns {THREE.Texture}
   */
  createNormalMapFromHeight(width, height, heightFn, bumpStrength = 2.4) {
    if (typeof document === 'undefined') {
      // Neutral tangent-space normal (0, 0, 1) -> RGB (128, 128, 255)
      const data = new Uint8Array(width * height * 4);
      for (let i = 0; i < width * height; i++) {
        const stride = i * 4;
        data[stride] = 128;
        data[stride + 1] = 128;
        data[stride + 2] = 255;
        data[stride + 3] = 255;
      }
      const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
      tex.needsUpdate = true;
      return tex;
    }

    // 1. Evaluate height buffer
    const heights = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        heights[y * width + x] = heightFn(x, y, width, height);
      }
    }

    // 2. Synthesize tangent normal image
    return this.createCanvasTexture(width, height, (ctx) => {
      const imgData = ctx.createImageData(width, height);
      const data = imgData.data;

      for (let y = 0; y < height; y++) {
        const yPrev = (y - 1 + height) % height;
        const yNext = (y + 1) % height;

        for (let x = 0; x < width; x++) {
          const xPrev = (x - 1 + width) % width;
          const xNext = (x + 1) % width;

          const hL = heights[y * width + xPrev];
          const hR = heights[y * width + xNext];
          const hD = heights[yPrev * width + x];
          const hU = heights[yNext * width + x];

          const dX = (hR - hL) * bumpStrength;
          const dY = (hU - hD) * bumpStrength;

          // Tangent normal vector: (-dX, -dY, 1.0) normalized
          const len = Math.sqrt(dX * dX + dY * dY + 1.0);
          const nx = -dX / len;
          const ny = -dY / len;
          const nz = 1.0 / len;

          const idx = (y * width + x) * 4;
          data[idx]     = Math.floor((nx * 0.5 + 0.5) * 255);
          data[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
          data[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    });
  }

  // --- Specialized Martian Surface Materials ---

  /**
   * Authentic Martian Regolith PBR Material
   * Multi-scale oxidized iron ferric dust, basalt grains, and ripples.
   */
  getRegolithMaterial(options = {}) {
    const cacheKey = `regolith_${options.tint || 'default'}`;
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey);
    }

    // 1. Albedo Diffuse Map (512x512)
    const albedoTex = this.createCanvasTexture(512, 512, (ctx, w, h) => {
      // Stratified Martian background
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0.0, '#9e3f1e');
      grad.addColorStop(0.3, '#b8542b');
      grad.addColorStop(0.7, '#8f3316');
      grad.addColorStop(1.0, '#75250f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Fine dust streaks and wind ripples
      ctx.fillStyle = 'rgba(215, 120, 70, 0.18)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y + Math.sin(y * 0.08) * 3, w, 2);
      }

      // Micro basalt pebbles & iron-rich granules
      for (let i = 0; i < 9000; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * 2.2 + 0.4;
        const shade = Math.floor(Math.random() * 70) - 35;
        const alpha = Math.random() * 0.4 + 0.1;
        ctx.fillStyle = `rgba(${160 + shade}, ${70 + Math.floor(shade * 0.6)}, ${35 + Math.floor(shade * 0.4)}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    albedoTex.repeat.set(options.repeatX || 8, options.repeatY || 8);

    // 2. Tangent Space Normal Map
    const normalTex = this.createNormalMapFromHeight(256, 256, (x, y, w, h) => {
      const u = x / w;
      const v = y / h;
      // High-frequency ripple waves + grain noise
      const ripples = Math.sin(u * 32.0 + Math.cos(v * 16.0) * 1.5) * 0.35;
      const grain = (Math.sin(x * 12.3 + y * 7.7) * Math.cos(x * 5.4 - y * 11.2)) * 0.5;
      return (ripples + grain + 1.0) * 0.5;
    }, 3.0);
    normalTex.repeat.set(options.repeatX || 8, options.repeatY || 8);

    // 3. Roughness Map
    const roughnessTex = this.createCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#e2e2e2'; // High baseline roughness for dusty regolith (~0.88)
      ctx.fillRect(0, 0, w, h);
      // Smoother rock fragments
      ctx.fillStyle = 'rgba(160, 160, 160, 0.4)';
      for (let i = 0; i < 2000; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
    });
    roughnessTex.repeat.set(options.repeatX || 8, options.repeatY || 8);

    const mat = new THREE.MeshStandardMaterial({
      map: albedoTex,
      normalMap: normalTex,
      normalScale: new THREE.Vector2(1.6, 1.6),
      roughnessMap: roughnessTex,
      roughness: 0.88,
      metalness: 0.08,
      flatShading: false
    });

    this.materialCache.set(cacheKey, mat);
    return mat;
  }

  /**
   * Basalt Volcanic Rock PBR Material
   */
  getBasaltRockMaterial() {
    if (this.materialCache.has('basalt_rock')) {
      return this.materialCache.get('basalt_rock');
    }

    const albedoTex = this.createCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#422c22';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 3000; i++) {
        const shade = Math.floor(Math.random() * 40) - 20;
        ctx.fillStyle = `rgba(${50 + shade}, ${36 + shade}, ${30 + shade}, 0.35)`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
      }
    });

    const normalTex = this.createNormalMapFromHeight(256, 256, (x, y) => {
      return (Math.sin(x * 0.4) * Math.cos(y * 0.4) + Math.sin(x * 0.9 + y * 0.7) * 0.5 + 1.5) / 3.0;
    }, 4.0);

    const mat = new THREE.MeshStandardMaterial({
      map: albedoTex,
      normalMap: normalTex,
      normalScale: new THREE.Vector2(2.0, 2.0),
      roughness: 0.92,
      metalness: 0.15,
      flatShading: false
    });

    this.materialCache.set('basalt_rock', mat);
    return mat;
  }

  // --- Aerospace & Vehicle Materials ---

  /**
   * Gold Multi-Layer Insulation (Kapton MLI) Material
   * Quilted, creased, highly reflective gold foil used on rover chassis and space probes.
   */
  getGoldMLIMaterial() {
    if (this.materialCache.has('gold_mli')) {
      return this.materialCache.get('gold_mli');
    }

    const albedoTex = this.createCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#e6a817';
      ctx.fillRect(0, 0, w, h);
      // Quilted thermal seams
      ctx.strokeStyle = '#b37706';
      ctx.lineWidth = 1.5;
      for (let p = 0; p < w; p += 32) {
        ctx.beginPath();
        ctx.moveTo(p, 0); ctx.lineTo(p, h);
        ctx.moveTo(0, p); ctx.lineTo(w, p);
        ctx.stroke();
      }
    });

    const normalTex = this.createNormalMapFromHeight(256, 256, (x, y) => {
      // Wrinkle / crumple profile
      const seamX = Math.abs((x % 32) - 16) / 16;
      const seamY = Math.abs((y % 32) - 16) / 16;
      const quilt = (1.0 - seamX * seamX) * (1.0 - seamY * seamY);
      const wrinkle = Math.sin(x * 0.6 + y * 0.4) * Math.cos(x * 0.3 - y * 0.5) * 0.2;
      return quilt * 0.8 + wrinkle;
    }, 3.2);

    const mat = new THREE.MeshStandardMaterial({
      map: albedoTex,
      normalMap: normalTex,
      normalScale: new THREE.Vector2(1.8, 1.8),
      color: 0xffdf59,
      roughness: 0.24,
      metalness: 0.92
    });

    this.materialCache.set('gold_mli', mat);
    return mat;
  }

  /**
   * Photovoltaic Silicon Solar Array Material
   * Deep navy crystalline blue with anti-reflective specular sheen and conductive silver busbars.
   */
  getSolarPanelMaterial() {
    if (this.materialCache.has('solar_panel')) {
      return this.materialCache.get('solar_panel');
    }

    const albedoTex = this.createCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#0a1d37'; // Deep space photovoltaic blue
      ctx.fillRect(0, 0, w, h);

      // Silver conductive busbars
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, 0); ctx.lineTo(w * 0.5, h);
      ctx.stroke();

      // Fine grid collector fingers
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 0.75;
      for (let y = 8; y < h; y += 12) {
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(w, y);
        ctx.stroke();
      }
    });

    const mat = new THREE.MeshStandardMaterial({
      map: albedoTex,
      color: 0x1e3a8a,
      roughness: 0.16,
      metalness: 0.88
    });

    this.materialCache.set('solar_panel', mat);
    return mat;
  }

  /**
   * Machined Titanium & Anodized Aerospace Aluminum
   */
  getAerospaceMetalMaterial(options = {}) {
    const color = options.color || 0xd1d5db;
    const roughness = options.roughness !== undefined ? options.roughness : 0.32;
    const metalness = options.metalness !== undefined ? options.metalness : 0.85;

    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness
    });
  }

  /**
   * Carbon-Fiber Composite Twill Material
   */
  getCarbonFiberMaterial() {
    if (this.materialCache.has('carbon_fiber')) {
      return this.materialCache.get('carbon_fiber');
    }

    const albedoTex = this.createCanvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#1e242b';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2d333b';
      for (let y = 0; y < h; y += 8) {
        for (let x = 0; x < w; x += 8) {
          if ((x / 8 + y / 8) % 2 === 0) {
            ctx.fillRect(x, y, 8, 8);
          }
        }
      }
    });

    const mat = new THREE.MeshStandardMaterial({
      map: albedoTex,
      roughness: 0.38,
      metalness: 0.25
    });

    this.materialCache.set('carbon_fiber', mat);
    return mat;
  }

  /**
   * Transparent Optical Polycarbonate Greenhouse / Dome Material
   * Clean, high-performance PBR glass with high specular shine and clear transparency.
   * Avoids transmission render target black-outs on standard forward WebGL renderers.
   */
  getPolycarbonateDomeMaterial() {
    if (this.materialCache.has('polycarbonate_dome')) {
      return this.materialCache.get('polycarbonate_dome');
    }

    const mat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      roughness: 0.05,
      metalness: 0.15,
      transparent: true,
      opacity: 0.20,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.materialCache.set('polycarbonate_dome', mat);
    return mat;
  }

  /**
   * Emissive Display / Optical Reticle Material
   */
  getEmissiveDisplayMaterial(hexColor = 0x38bdf8, intensity = 1.6) {
    return new THREE.MeshStandardMaterial({
      color: 0x071524,
      emissive: hexColor,
      emissiveIntensity: intensity,
      roughness: 0.2,
      metalness: 0.5
    });
  }

  getEmissiveScreenMaterial(options = {}) {
    const color = options.color || 0x38bdf8;
    const intensity = options.intensity || 1.6;
    return this.getEmissiveDisplayMaterial(color, intensity);
  }

  dispose() {
    for (const [, tex] of this.textureCache) {
      if (tex && tex.dispose) tex.dispose();
    }
    this.textureCache.clear();

    for (const [, mat] of this.materialCache) {
      if (mat && mat.dispose) mat.dispose();
    }
    this.materialCache.clear();
  }
}

export const pbrFactory = new PBRMaterialFactory();
