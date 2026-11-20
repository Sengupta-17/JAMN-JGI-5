/**
 * Interplanetary Mission Asset & 3D Model Manager (Phase 1)
 * Coordinates glTF / GLB model streaming, Draco decompression, texture management,
 * and seamless fallback to procedural PBR assets.
 */

import * as THREE_MODULE from 'three';
import { pbrFactory } from '../graphics/pbrMaterials.js';

const THREE = (typeof window !== 'undefined' && window.THREE) ? window.THREE : THREE_MODULE;

export class AssetManager {
  constructor() {
    this.modelCache = new Map();
    this.textureCache = new Map();
    this.gltfLoader = null;
    this.dracoLoader = null;
    this.isLoaderInitialized = false;
    this.pbr = pbrFactory;
  }

  /**
   * Initializes GLTFLoader and optional DRACOLoader asynchronously.
   * Tolerates headless test environments and missing network endpoints.
   */
  async initLoaders() {
    if (this.isLoaderInitialized) return;

    try {
      // Dynamic import from three/examples/jsm
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      this.gltfLoader = new GLTFLoader();

      try {
        const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');
        this.dracoLoader = new DRACOLoader();
        // Default decoder path for Draco
        if (typeof window !== 'undefined') {
          this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
          this.gltfLoader.setDRACOLoader(this.dracoLoader);
        }
      } catch (dracoErr) {
        console.warn('AssetManager: DRACOLoader optional extension not initialized:', dracoErr.message);
      }

      this.isLoaderInitialized = true;
    } catch (err) {
      console.warn('AssetManager: Native GLTFLoader unavailable in current context. Procedural PBR fallback active.', err.message);
      this.isLoaderInitialized = false;
    }
  }

  /**
   * Loads a 3D model (glTF / GLB) from URL with caching.
   * @param {string} url Model asset URL
   * @param {Function} onProgress Optional progress callback
   * @returns {Promise<THREE.Group|null>}
   */
  async loadModel(url, onProgress = null) {
    if (this.modelCache.has(url)) {
      return this.modelCache.get(url).clone(true);
    }

    if (!this.isLoaderInitialized) {
      await this.initLoaders();
    }

    if (!this.gltfLoader) {
      console.warn(`AssetManager: Loader not ready. Returning null for ${url}`);
      return null;
    }

    return new Promise((resolve) => {
      try {
        this.gltfLoader.load(
          url,
          (gltf) => {
            const root = gltf.scene || gltf.scenes[0];
            root.traverse((node) => {
              if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
              }
            });
            this.modelCache.set(url, root);
            resolve(root.clone(true));
          },
          (progress) => {
            if (onProgress && progress.total > 0) {
              onProgress(progress.loaded / progress.total);
            }
          },
          (error) => {
            console.warn(`AssetManager: Failed to load 3D model [${url}]. Engaging procedural backup.`, error.message || error);
            resolve(null);
          }
        );
      } catch (err) {
        console.warn(`AssetManager: Exception invoking loader for [${url}]. Engaging procedural backup.`, err.message || err);
        resolve(null);
      }
    });
  }

  /**
   * Pre-fetches an array of model assets.
   * @param {string[]} urls
   */
  async preloadModels(urls) {
    const promises = urls.map((url) => this.loadModel(url));
    return Promise.all(promises);
  }

  dispose() {
    for (const [, root] of this.modelCache) {
      root.traverse((child) => {
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
    this.modelCache.clear();

    if (this.dracoLoader) {
      this.dracoLoader.dispose();
      this.dracoLoader = null;
    }
    this.gltfLoader = null;
    this.isLoaderInitialized = false;
  }
}

export const assetManager = new AssetManager();
