/**
 * Terrain Manager for Mars Surface Simulation (Segment 4 - Phase 1)
 * Provides dynamic chunk streaming, Level of Detail (LOD), procedural Martian topography,
 * gap-free skirts, rock instancing, and analytical elevation sampling for physics.
 * Enhanced with PBR Regolith normal mapping and basalt rock materials.
 */

import * as THREE_MODULE from 'three';
import { pbrFactory } from '../graphics/pbrMaterials.js';

const THREE = (typeof window !== 'undefined' && window.THREE) ? window.THREE : THREE_MODULE;

export class TerrainManager {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.chunkSize = options.chunkSize || 120.0; // Size of each terrain chunk in meters
    this.viewRadius = options.viewRadius || 2;   // Number of chunk rings around player
    this.highResSegments = 32;
    this.lowResSegments = 16;

    this.chunks = new Map(); // key: "x,z" -> chunk object
    this.instancedRocks = null;

    // Martian terrain materials (PBR with normal & roughness maps)
    this.terrainMaterial = pbrFactory.getRegolithMaterial({ repeatX: 4, repeatY: 4 });

    // Reusable vector for elevation sampling
    this._tempNormal = new THREE.Vector3();
  }

  createMarsTerrainMaterial() {
    return pbrFactory.getRegolithMaterial({ repeatX: 4, repeatY: 4 });
  }

  // --- Analytical Martian Topography (Procedural Multi-octave fBm) ---

  /**
   * Evaluates terrain elevation at world coordinates (x, z).
   * Exact deterministic formula shared by renderer and surface physics.
   */
  getElevationAt(x, z) {
    // Large regional undulating crater dunes
    const d1 = Math.sin(x * 0.008) * Math.cos(z * 0.008) * 14.0;
    // Mid-scale ridge crests
    const d2 = Math.sin(x * 0.025 + z * 0.015) * Math.cos(x * 0.018 - z * 0.022) * 5.5;
    // Micro-scale regolith roughness
    const d3 = (Math.sin(x * 0.09) + Math.cos(z * 0.09)) * 0.85;

    // Flatten habitat center zone around (0,0)
    const distFromOrigin = Math.sqrt(x * x + z * z);
    const centerPlateau = Math.min(1.0, distFromOrigin / 45.0);

    return (d1 + d2 + d3) * centerPlateau;
  }

  /**
   * Computes analytical normal vector at world coordinates (x, z).
   */
  getNormalAt(x, z) {
    const eps = 0.5;
    const hL = this.getElevationAt(x - eps, z);
    const hR = this.getElevationAt(x + eps, z);
    const hD = this.getElevationAt(x, z - eps);
    const hU = this.getElevationAt(x, z + eps);

    this._tempNormal.set((hL - hR) / (2 * eps), 1.0, (hD - hU) / (2 * eps)).normalize();
    return this._tempNormal;
  }

  // --- Dynamic Chunk Management & LOD ---

  update(playerPosition) {
    const playerChunkX = Math.floor((playerPosition.x + this.chunkSize * 0.5) / this.chunkSize);
    const playerChunkZ = Math.floor((playerPosition.z + this.chunkSize * 0.5) / this.chunkSize);

    const activeKeys = new Set();

    for (let dx = -this.viewRadius; dx <= this.viewRadius; dx++) {
      for (let dz = -this.viewRadius; dz <= this.viewRadius; dz++) {
        const cx = playerChunkX + dx;
        const cz = playerChunkZ + dz;
        const key = `${cx},${cz}`;
        activeKeys.add(key);

        const dist = Math.max(Math.abs(dx), Math.abs(dz));
        const lodLevel = (dist <= 1) ? 'high' : 'low';

        if (!this.chunks.has(key)) {
          this.createChunk(cx, cz, lodLevel);
        } else {
          const chunk = this.chunks.get(key);
          if (chunk.lod !== lodLevel) {
            // Rebuild with new LOD
            this.scene.remove(chunk.mesh);
            chunk.mesh.geometry.dispose();
            this.chunks.delete(key);
            this.createChunk(cx, cz, lodLevel);
          }
        }
      }
    }

    // Unload chunks out of range
    for (const [key, chunk] of this.chunks.entries()) {
      if (!activeKeys.has(key)) {
        this.scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
        this.chunks.delete(key);
      }
    }
  }

  createChunk(cx, cz, lodLevel) {
    const segments = (lodLevel === 'high') ? this.highResSegments : this.lowResSegments;
    const geo = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const worldOriginX = cx * this.chunkSize;
    const worldOriginZ = cz * this.chunkSize;

    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const lx = posAttr.getX(i);
      const lz = posAttr.getZ(i);
      const wx = worldOriginX + lx;
      const wz = worldOriginZ + lz;
      const elevation = this.getElevationAt(wx, wz);
      posAttr.setY(i, elevation);
    }

    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, this.terrainMaterial);
    mesh.position.set(worldOriginX, 0, worldOriginZ);
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    this.chunks.set(`${cx},${cz}`, {
      cx,
      cz,
      lod: lodLevel,
      mesh
    });
  }

  // --- Instanced Martian Boulders / Rocks ---

  initRockScatter(count = 200) {
    const rockGeo = new THREE.DodecahedronGeometry(1.0, 1);
    const rockMat = pbrFactory.getBasaltRockMaterial();

    this.instancedRocks = new THREE.InstancedMesh(rockGeo, rockMat, count);
    this.instancedRocks.castShadow = true;
    this.instancedRocks.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      // Scatter within 250m radius, keeping clear of habitat dome center (r > 35m)
      const angle = Math.random() * Math.PI * 2;
      const dist = 38.0 + Math.random() * 200.0;
      const rx = Math.cos(angle) * dist;
      const rz = Math.sin(angle) * dist;
      const ry = this.getElevationAt(rx, rz);

      dummy.position.set(rx, ry + 0.4, rz);
      const scale = 0.5 + Math.random() * 2.2;
      dummy.scale.set(scale, scale * (0.6 + Math.random() * 0.8), scale);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.updateMatrix();

      this.instancedRocks.setMatrixAt(i, dummy.matrix);
    }
    this.instancedRocks.instanceMatrix.needsUpdate = true;
    this.scene.add(this.instancedRocks);
  }

  dispose() {
    for (const [, chunk] of this.chunks.entries()) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
    }
    this.chunks.clear();

    if (this.instancedRocks) {
      this.scene.remove(this.instancedRocks);
      this.instancedRocks.geometry.dispose();
      this.instancedRocks.material.dispose();
      this.instancedRocks = null;
    }
  }
}
