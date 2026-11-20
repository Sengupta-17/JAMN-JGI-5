/**
 * Cinematic Post-Processing Pipeline for Mars Simulation (Phase 2)
 * Coordinates:
 * - EffectComposer rendering chain with 16-bit half-float render targets
 * - UnrealBloomPass for emissive screens, holographic terminals, LED grow lamps, and solar halo
 * - Optional GTAOPass for Ground-Truth Ambient Occlusion and contact micro-shadows
 * - OutputPass for calibrated ACES Filmic tonemapping and sRGB color space transfer
 * - Automatic graceful fallback to direct WebGL forward rendering if composer fails
 */

import * as THREE_MODULE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';

const THREE = (typeof window !== 'undefined' && window.THREE) ? window.THREE : THREE_MODULE;

// Backward-compatibility polyfill for Three.js r128 ShaderChunk (colorspace chunks required by r187 OutputShader)
if (THREE && THREE.ShaderChunk) {
  if (!THREE.ShaderChunk.colorspace_pars_fragment) {
    THREE.ShaderChunk.colorspace_pars_fragment = `
      vec4 LinearTransferOETF( in vec4 value ) { return value; }
      vec4 sRGBTransferEOTF( in vec4 value ) {
        return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
      }
      vec4 sRGBTransferOETF( in vec4 value ) {
        return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
      }
    `;
  }
}

export class PostProcessingPipeline {
  constructor(renderer, scene, camera, options = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.options = Object.assign({
      enabled: false, // Default false: Direct forward WebGL rendering guaranteed
      enableBloom: true,
      enableAO: false,
      bloomStrength: 0.36,
      bloomRadius: 0.45,
      bloomThreshold: 0.82
    }, options);

    this.composer = null;
    this.renderPass = null;
    this.bloomPass = null;
    this.gtaoPass = null;
    this.outputPass = null;

    this.enabled = (options.enabled !== undefined) ? !!options.enabled : false;
    this.isReady = false;

    this.init();
  }

  init() {
    if (!this.renderer || !this.scene || !this.camera) return;

    try {
      // 1. Get viewport dimensions
      const size = new THREE.Vector2();
      if (this.renderer.getSize) {
        this.renderer.getSize(size);
      }
      const width = size.x || 1200;
      const height = size.y || 800;

      // 2. Initialize EffectComposer
      this.composer = new EffectComposer(this.renderer);
      this.composer.setSize(width, height);

      // 3. Render Pass (Base Scene)
      this.renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(this.renderPass);

      // 4. Ground-Truth Ambient Occlusion (GTAO) Pass
      try {
        this.gtaoPass = new GTAOPass(this.scene, this.camera, width, height);
        this.gtaoPass.output = GTAOPass.OUTPUT.Default; // Blend onto beauty pass (never Denoise raw buffer)
        this.gtaoPass.enabled = !!this.options.enableAO;
        this.composer.addPass(this.gtaoPass);
      } catch (aoErr) {
        console.warn('PostProcessingPipeline: GTAOPass not supported in current context:', aoErr.message);
        this.gtaoPass = null;
      }

      // 5. UnrealBloomPass (Atmospheric glow, emissive terminals, grow lights)
      if (this.options.enableBloom) {
        const res = new THREE.Vector2(width, height);
        this.bloomPass = new UnrealBloomPass(
          res,
          this.options.bloomStrength,
          this.options.bloomRadius,
          this.options.bloomThreshold
        );
        this.composer.addPass(this.bloomPass);
      }

      // 6. OutputPass (ACES Filmic tone mapping & sRGB output)
      try {
        this.outputPass = new OutputPass();
        this.composer.addPass(this.outputPass);
      } catch (outErr) {
        console.warn('PostProcessingPipeline: OutputPass unavailable, using direct forward tonemapping:', outErr.message);
        this.outputPass = null;
      }

      this.isReady = true;
    } catch (err) {
      console.warn('PostProcessingPipeline: EffectComposer initialization failed. Fallback active.', err.message);
      this.isReady = false;
    }
  }

  /**
   * Updates composer and pass render target resolutions on window resize.
   * @param {number} width
   * @param {number} height
   */
  setSize(width, height) {
    if (this.composer && this.isReady) {
      try {
        this.composer.setSize(width, height);
        if (this.bloomPass && this.bloomPass.resolution) {
          this.bloomPass.resolution.set(width, height);
        }
        if (this.gtaoPass && this.gtaoPass.setSize) {
          this.gtaoPass.setSize(width, height);
        }
      } catch (err) {
        console.warn('PostProcessingPipeline: setSize encountered error:', err.message);
      }
    }
  }

  /**
   * Renders the frame through the composer, or delegates directly to WebGL forward renderer.
   * @param {number} dt Delta time
   */
  render(dt = 0.016) {
    if (this.enabled && this.isReady && this.composer) {
      try {
        this.composer.render(dt);
        return;
      } catch (err) {
        // One-time fallback if WebGL context threw an exception
        console.warn('PostProcessingPipeline: Composer render failed, falling back to direct render:', err.message);
        this.isReady = false;
      }
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Modulates bloom properties dynamically.
   * @param {number} strength
   * @param {number} radius
   * @param {number} threshold
   */
  setBloomParams(strength, radius, threshold) {
    if (this.bloomPass) {
      if (strength !== undefined) this.bloomPass.strength = strength;
      if (radius !== undefined) this.bloomPass.radius = radius;
      if (threshold !== undefined) this.bloomPass.threshold = threshold;
    }
  }

  /**
   * Toggles GTAO contact shadows on/off (e.g. for performance scaling).
   * @param {boolean} enabled
   */
  setAOEnabled(enabled) {
    if (this.gtaoPass) {
      this.gtaoPass.enabled = !!enabled;
    }
  }

  dispose() {
    if (this.composer) {
      if (this.renderPass) this.renderPass.dispose();
      if (this.bloomPass) this.bloomPass.dispose();
      if (this.gtaoPass) this.gtaoPass.dispose();
      if (this.outputPass) this.outputPass.dispose();
    }
    this.composer = null;
    this.isReady = false;
  }
}
