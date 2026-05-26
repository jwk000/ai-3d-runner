import * as THREE from 'three';
import { CONFIG, type FaceIndex } from '../../config';
import type { PRNG } from '../../util/PRNG';
import type { Player } from '../Player';
import { ChunkGenerator } from './ChunkGenerator';
import { TunnelChunk } from './TunnelChunk';

const REBASE_THRESHOLD = 500;

export class TunnelManager {
  readonly root: THREE.Group;
  private chunks: TunnelChunk[] = [];
  private pool: TunnelChunk[] = [];
  private generator: ChunkGenerator;
  private nextZ = 0;
  worldOffsetZ = 0;
  currentFace: FaceIndex = 0;
  private debugColors = false;

  constructor(private rng: PRNG) {
    this.root = new THREE.Group();
    this.root.name = 'TunnelRoot';
    this.generator = new ChunkGenerator(rng);
  }

  init(): void {
    this.worldOffsetZ = 0;
    this.nextZ = 0;
    while (this.chunks.length > 0) {
      const old = this.chunks.shift()!;
      this.root.remove(old.group);
      old.reset();
      this.pool.push(old);
    }
    for (let i = 0; i < CONFIG.tunnel.chunksAhead; i++) {
      this.spawnChunk(0);
    }
  }

  update(playerZ: number, difficulty: number): void {
    while (this.nextZ - playerZ < CONFIG.tunnel.chunksAhead * CONFIG.tunnel.chunkLength) {
      this.spawnChunk(difficulty);
    }
    const cutoff = playerZ - CONFIG.tunnel.chunksBehind * CONFIG.tunnel.chunkLength;
    while (this.chunks.length > 0 && this.chunks[0]!.zEnd < cutoff) {
      const old = this.chunks.shift()!;
      this.root.remove(old.group);
      old.reset();
      this.pool.push(old);
    }
  }

  maybeRebase(player: Player): number {
    if (player.root.position.z < REBASE_THRESHOLD) return 0;
    const shift = -player.root.position.z;
    player.root.position.z += shift;
    this.nextZ += shift;
    for (const c of this.chunks) c.shiftZ(shift);
    this.worldOffsetZ -= shift;
    return shift;
  }

  visibleGaps() {
    const list: import('./TunnelChunk').GapInstance[] = [];
    for (const c of this.chunks) list.push(...c.gaps);
    return list;
  }

  setRotationZ(angle: number): void {
    this.root.rotation.z = angle;
  }

  setDebugColors(enable: boolean): void {
    this.debugColors = enable;
    for (const c of this.chunks) c.setDebugColors(enable);
  }

  isDebugColors(): boolean {
    return this.debugColors;
  }

  private spawnChunk(difficulty: number): void {
    const data = this.generator.generate({
      zStart: this.nextZ,
      difficulty,
      currentFace: this.currentFace,
    });
    let chunk = this.pool.pop();
    if (!chunk) chunk = new TunnelChunk();
    chunk.applyData(data);
    chunk.setDebugColors(this.debugColors);
    this.root.add(chunk.group);
    this.chunks.push(chunk);
    this.nextZ = data.zStart + data.length;
  }
}
