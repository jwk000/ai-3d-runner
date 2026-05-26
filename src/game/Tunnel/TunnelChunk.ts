import * as THREE from 'three';
import { CONFIG, type FaceIndex, type LaneIndex } from '../../config';
import type { ChunkData, GapSpec, LaneMask } from './ChunkGenerator';

export interface GapInstance {
  face: FaceIndex;
  laneMask: LaneMask;
  zStart: number;
  zEnd: number;
  meshes: THREE.Mesh[];
}

export class TunnelChunk {
  readonly group: THREE.Group;
  zStart = 0;
  zEnd = 0;
  gaps: GapInstance[] = [];

  private floorMesh: THREE.Mesh;
  private ceilMesh: THREE.Mesh;
  private leftMesh: THREE.Mesh;
  private rightMesh: THREE.Mesh;

  private static readonly DEBUG_COLORS = {
    floor: 0xff364f,
    right: 0x3ad858,
    ceil: 0x3a7bd5,
    left: 0xffd24a,
  };
  private static readonly BASE_COLOR = 0x8b9098;
  private static readonly LANE_LINE_COLOR = 0xb4bac4;
  private static readonly GAP_MATERIAL = TunnelChunk.makeStarGapMaterial();
  private static readonly WALL_GEOS = TunnelChunk.makeWallGeometries();

  constructor() {
    this.group = new THREE.Group();

    const { floorGeo, ceilGeo, leftGeo, rightGeo } = TunnelChunk.WALL_GEOS;
    this.floorMesh = new THREE.Mesh(
      floorGeo,
      TunnelChunk.makeWallMaterial(),
    );
    this.ceilMesh = new THREE.Mesh(
      ceilGeo,
      TunnelChunk.makeWallMaterial(),
    );
    this.leftMesh = new THREE.Mesh(
      leftGeo,
      TunnelChunk.makeWallMaterial(),
    );
    this.rightMesh = new THREE.Mesh(
      rightGeo,
      TunnelChunk.makeWallMaterial(),
    );

    this.group.add(this.floorMesh, this.ceilMesh, this.leftMesh, this.rightMesh);
    this.addLightStrips();
    this.addLaneLines();
  }

  private static makeWallGeometries() {
    const size = CONFIG.tunnel.size;
    const length = CONFIG.tunnel.chunkLength;
    const half = size / 2;

    const floor = new THREE.PlaneGeometry(size, length);
    floor.rotateX(-Math.PI / 2);
    floor.translate(0, -half, length / 2);

    const ceil = new THREE.PlaneGeometry(size, length);
    ceil.rotateX(Math.PI / 2);
    ceil.translate(0, half, length / 2);

    const left = new THREE.PlaneGeometry(size, length);
    left.rotateY(Math.PI / 2);
    left.translate(-half, 0, length / 2);

    const right = new THREE.PlaneGeometry(size, length);
    right.rotateY(-Math.PI / 2);
    right.translate(half, 0, length / 2);

    return { floorGeo: floor, ceilGeo: ceil, leftGeo: left, rightGeo: right };
  }

  private static makeStarGapMaterial(): THREE.MeshBasicMaterial {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const bg = ctx.createRadialGradient(size * 0.5, size * 0.45, 0, size * 0.5, size * 0.55, size * 0.72);
    bg.addColorStop(0, '#2d5f90');
    bg.addColorStop(0.52, '#14314f');
    bg.addColorStop(1, '#071425');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 170; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() < 0.88 ? Math.random() * 1.1 + 0.35 : Math.random() * 2.4 + 1.1;
      const alpha = Math.random() * 0.35 + 0.22;
      ctx.fillStyle = `rgba(210,230,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 7; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 32 + Math.random() * 24);
      glow.addColorStop(0, 'rgba(118,202,255,0.28)');
      glow.addColorStop(0.35, 'rgba(80,165,255,0.13)');
      glow.addColorStop(1, 'rgba(30,20,90,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.4, 1.4);
    texture.anisotropy = 4;

    return new THREE.MeshBasicMaterial({
      map: texture,
      color: 0x86bfff,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
    });
  }

  private static makeWallMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: TunnelChunk.BASE_COLOR,
      roughness: 0.88,
      metalness: 0.02,
    });
  }

  private addLightStrips(): void {
    const size = CONFIG.tunnel.size;
    const length = CONFIG.tunnel.chunkLength;
    const half = size / 2;
    const stripMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x9fc8ff,
      emissiveIntensity: 2.2,
      roughness: 0.25,
    });
    const stripWidth = 0.18;
    const stripThickness = 0.04;
    const inset = 0.002;
    const stripOffset = stripWidth / 2 + 0.02;
    const horizGeo = new THREE.BoxGeometry(stripWidth, stripThickness, length * 0.98);
    const vertGeo = new THREE.BoxGeometry(stripThickness, stripWidth, length * 0.98);

    const corners: Array<{ sx: 1 | -1; sy: 1 | -1 }> = [
      { sx: 1, sy: 1 },
      { sx: -1, sy: 1 },
      { sx: 1, sy: -1 },
      { sx: -1, sy: -1 },
    ];

    for (const { sx, sy } of corners) {
      const onHoriz = new THREE.Mesh(horizGeo, stripMat);
      onHoriz.position.set(sx * (half - stripOffset), sy * (half - inset), length / 2);
      const onVert = new THREE.Mesh(vertGeo, stripMat);
      onVert.position.set(sx * (half - inset), sy * (half - stripOffset), length / 2);
      this.group.add(onHoriz, onVert);
    }
  }

  private addLaneLines(): void {
    const size = CONFIG.tunnel.size;
    const length = CONFIG.tunnel.chunkLength;
    const half = size / 2;
    const lineMat = new THREE.MeshBasicMaterial({
      color: TunnelChunk.LANE_LINE_COLOR,
      transparent: true,
      opacity: 0.35,
    });
    const lineWidth = 0.06;
    const inset = 0.003;
    const dividerPositions = [-1.5, 1.5];
    const horizLineGeo = new THREE.PlaneGeometry(lineWidth, length * 0.98);
    const vertLineGeo = new THREE.PlaneGeometry(lineWidth, length * 0.98);

    for (const d of dividerPositions) {
      const floorLine = new THREE.Mesh(horizLineGeo, lineMat);
      floorLine.rotation.x = -Math.PI / 2;
      floorLine.position.set(d, -half + inset, length / 2);
      const ceilLine = new THREE.Mesh(horizLineGeo, lineMat);
      ceilLine.rotation.x = Math.PI / 2;
      ceilLine.position.set(-d, half - inset, length / 2);
      const rightLine = new THREE.Mesh(vertLineGeo, lineMat);
      rightLine.rotation.y = -Math.PI / 2;
      rightLine.position.set(half - inset, d, length / 2);
      const leftLine = new THREE.Mesh(vertLineGeo, lineMat);
      leftLine.rotation.y = Math.PI / 2;
      leftLine.position.set(-half + inset, -d, length / 2);

      this.group.add(floorLine, ceilLine, rightLine, leftLine);
    }
  }

  applyData(data: ChunkData): void {
    this.reset();
    this.zStart = data.zStart;
    this.zEnd = data.zStart + data.length;
    this.group.position.z = data.zStart;
    for (const g of data.gaps) this.applyGap(g);
  }

  private applyGap(g: GapSpec): void {
    const len = g.zEnd - g.zStart;
    const half = CONFIG.tunnel.size / 2;
    const pitInset = 0.01;
    const pitMat = TunnelChunk.GAP_MATERIAL;
    const meshes: THREE.Mesh[] = [];
    const zCenter = (g.zStart + g.zEnd) / 2;

    for (let lane = 0 as LaneIndex; lane < CONFIG.tunnel.laneCount; lane = (lane + 1) as LaneIndex) {
      if (!g.laneMask[lane]) continue;
      const { x, y } = lanePosition(g.face, lane);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(laneSpan(), len), pitMat);
      switch (g.face) {
        case 0:
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.set(x, -half + pitInset, zCenter);
          break;
        case 1:
          mesh.rotation.y = -Math.PI / 2;
          mesh.position.set(half - pitInset, y, zCenter);
          break;
        case 2:
          mesh.rotation.x = Math.PI / 2;
          mesh.position.set(x, half - pitInset, zCenter);
          break;
        case 3:
          mesh.rotation.y = Math.PI / 2;
          mesh.position.set(-half + pitInset, y, zCenter);
          break;
      }
      this.group.add(mesh);
      meshes.push(mesh);
    }

    this.gaps.push({
      face: g.face,
      laneMask: g.laneMask,
      zStart: this.zStart + g.zStart,
      zEnd: this.zStart + g.zEnd,
      meshes,
    });
  }

  reset(): void {
    for (const g of this.gaps) {
      for (const mesh of g.meshes) this.group.remove(mesh);
    }
    this.gaps = [];
  }

  shiftZ(shift: number): void {
    this.zStart += shift;
    this.zEnd += shift;
    this.group.position.z += shift;
    for (const g of this.gaps) {
      g.zStart += shift;
      g.zEnd += shift;
    }
  }

  setDebugColors(enable: boolean): void {
    const base = TunnelChunk.BASE_COLOR;
    const debug = TunnelChunk.DEBUG_COLORS;
    const floorMat = this.floorMesh.material as THREE.MeshStandardMaterial;
    const ceilMat = this.ceilMesh.material as THREE.MeshStandardMaterial;
    const leftMat = this.leftMesh.material as THREE.MeshStandardMaterial;
    const rightMat = this.rightMesh.material as THREE.MeshStandardMaterial;
    if (enable) {
      floorMat.color.setHex(debug.floor);
      rightMat.color.setHex(debug.right);
      ceilMat.color.setHex(debug.ceil);
      leftMat.color.setHex(debug.left);
    } else {
      floorMat.color.setHex(base);
      ceilMat.color.setHex(base);
      leftMat.color.setHex(base);
      rightMat.color.setHex(base);
    }
  }
}

export function lanePosition(face: FaceIndex, lane: LaneIndex): { x: number; y: number } {
  const off = CONFIG.tunnel.laneOffsets[lane];
  const half = CONFIG.tunnel.size / 2;
  switch (face) {
    case 0:
      return { x: off, y: -half };
    case 1:
      return { x: half, y: off };
    case 2:
      return { x: -off, y: half };
    case 3:
      return { x: -half, y: -off };
  }
}

function laneSpan(): number {
  const offsets = CONFIG.tunnel.laneOffsets;
  const laneWidth = Math.abs(offsets[0] - offsets[1]);
  const edgeMargin = Math.max(0.5, (CONFIG.tunnel.size - laneWidth * CONFIG.tunnel.laneCount) / 2);
  return laneWidth - edgeMargin * 0.35;
}
