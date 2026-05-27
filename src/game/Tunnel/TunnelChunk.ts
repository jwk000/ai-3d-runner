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

  private static readonly PORTAL_TIME_UNIFORM = { value: 0 };
  private static readonly GUIDE_BAR_GEOMETRY = TunnelChunk.makeGuideBarGeometry();
  private static readonly GUIDE_BAR_MATERIAL = TunnelChunk.makeGuideBarMaterial();
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
  private static readonly GAP_MATERIAL = TunnelChunk.makePortalGapMaterial();
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
    this.addLaneLines();
    this.addGuideBars();
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

  private static makePortalGapMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: TunnelChunk.PORTAL_TIME_UNIFORM,
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;

        float wave(vec2 uv, float time, float scale, vec2 direction) {
          vec2 dir = normalize(direction);
          float phase = dot(uv, dir) * scale + time;
          return sin(phase);
        }

        float ripple(vec2 uv, vec2 center, float freq, float speed, float time) {
          float dist = length(uv - center);
          return sin(dist * freq - time * speed);
        }

        vec3 palette(float depth, float crust, float ember) {
          vec3 charred = vec3(0.06, 0.02, 0.01);
          vec3 lava = vec3(0.48, 0.08, 0.01);
          vec3 molten = vec3(0.9, 0.22, 0.02);
          vec3 core = vec3(1.0, 0.78, 0.12);
          vec3 color = mix(charred, lava, smoothstep(0.12, 0.62, depth));
          color = mix(color, molten, smoothstep(0.48, 0.92, depth));
          color += core * ember;
          color -= vec3(0.12, 0.05, 0.02) * crust;
          return color;
        }

        void main() {
          vec2 uv = vUv;
          float t = uTime;

          vec2 perturbUv = uv;
          perturbUv.x += wave(uv, t * 0.22, 5.5, vec2(0.0, 1.0)) * 0.024;
          perturbUv.y += wave(uv, -t * 0.18, 4.8, vec2(1.0, 0.0)) * 0.02;
          perturbUv += vec2(
            wave(uv, t * 0.12, 8.0, vec2(1.0, 1.0)),
            wave(uv, -t * 0.1, 7.5, vec2(-1.0, 1.0))
          ) * 0.008;

          float currentA = wave(perturbUv, t * 0.38, 11.0, vec2(1.0, 0.25));
          float currentB = wave(perturbUv, -t * 0.26, 8.5, vec2(-0.4, 1.0));
          float currentC = wave(perturbUv, t * 0.18, 16.0, vec2(0.7, 1.0));
          float rippleA = ripple(perturbUv, vec2(0.22, 0.34), 10.0, 0.62, t);
          float rippleB = ripple(perturbUv, vec2(0.78, 0.66), 9.0, 0.48, t);
          float churn = sin((perturbUv.x * 4.5 - perturbUv.y * 6.2) + t * 0.42) * 0.5 + 0.5;
          float bubble = sin((perturbUv.x * 13.0 + perturbUv.y * 9.0) - t * 0.95) * 0.5 + 0.5;

          float depth = 0.5
            + currentA * 0.18
            + currentB * 0.14
            + currentC * 0.12
            + rippleA * 0.06
            + rippleB * 0.05
            + churn * 0.1;
          depth = clamp(depth, 0.0, 1.0);

          float crustLines = smoothstep(0.22, 0.82, currentA * 0.48 + currentB * 0.4 + churn * 0.3);
          float highlight = smoothstep(0.62, 0.98, currentC * 0.45 + rippleA * 0.28 + bubble * 0.27);
          float magmaPulse = sin((perturbUv.x + perturbUv.y) * 10.0 - t * 0.52) * 0.5 + 0.5;
          float ember = smoothstep(0.58, 0.96, magmaPulse * 0.48 + highlight * 0.52);
          float crust = clamp(crustLines * 0.34 + (1.0 - depth) * 0.28 + churn * 0.08, 0.0, 0.7);

          vec3 color = palette(depth, crust, ember * 0.34);
          color += vec3(1.0, 0.42, 0.04) * highlight * 0.24;
          color += vec3(1.0, 0.88, 0.32) * ember * 0.16;

          float alpha = 0.9 + ember * 0.02;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
      toneMapped: false,
    });
  }

  private static updatePortalTime(): void {
    TunnelChunk.PORTAL_TIME_UNIFORM.value = performance.now() * 0.001;
  }

  private static makeWallMaterial(): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color: TunnelChunk.BASE_COLOR,
    });
  }

  private static makeGuideBarGeometry(): THREE.BoxGeometry {
    const thickness = 0.08;
    const length = CONFIG.tunnel.chunkLength * 0.96;
    return new THREE.BoxGeometry(thickness, thickness, length);
  }

  private static makeGuideBarMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x9ed8ff,
      emissive: 0x49b7ff,
      emissiveIntensity: 2.6,
      roughness: 0.2,
      metalness: 0.04,
      toneMapped: false,
    });
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
    const dividerPositions = laneDividerPositions();
    const floorCeilLineGeo = new THREE.PlaneGeometry(lineWidth, length * 0.98);
    const sideWallLineGeo = new THREE.PlaneGeometry(length * 0.98, lineWidth);

    for (const d of dividerPositions) {
      const floorLine = new THREE.Mesh(floorCeilLineGeo, lineMat);
      floorLine.rotation.x = -Math.PI / 2;
      floorLine.position.set(d, -half + inset, length / 2);
      const ceilLine = new THREE.Mesh(floorCeilLineGeo, lineMat);
      ceilLine.rotation.x = Math.PI / 2;
      ceilLine.position.set(d, half - inset, length / 2);
      const rightLine = new THREE.Mesh(sideWallLineGeo, lineMat);
      rightLine.rotation.y = -Math.PI / 2;
      rightLine.position.set(half - inset, d, length / 2);
      const leftLine = new THREE.Mesh(sideWallLineGeo, lineMat);
      leftLine.rotation.y = Math.PI / 2;
      leftLine.position.set(-half + inset, d, length / 2);
      this.group.add(floorLine, ceilLine, rightLine, leftLine);
    }
  }

  private addGuideBars(): void {
    const half = CONFIG.tunnel.size / 2;
    const zCenter = CONFIG.tunnel.chunkLength / 2;
    const inset = 0.06;
    const corners: Array<{ x: number; y: number }> = [
      { x: -half + inset, y: -half + inset },
      { x: half - inset, y: -half + inset },
      { x: half - inset, y: half - inset },
      { x: -half + inset, y: half - inset },
    ];

    for (const corner of corners) {
      const bar = new THREE.Mesh(
        TunnelChunk.GUIDE_BAR_GEOMETRY,
        TunnelChunk.GUIDE_BAR_MATERIAL,
      );
      bar.position.set(corner.x, corner.y, zCenter);
      this.group.add(bar);
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

    for (const run of gapLaneRuns(g.laneMask)) {
      const { center, width } = laneRunLayout(run.start, run.end);
      const { x, y } = surfacePosition(g.face, center);
      const geometry =
        g.face === 1 || g.face === 3
          ? new THREE.PlaneGeometry(len, width)
          : new THREE.PlaneGeometry(width, len);
      scaleGapUv(geometry, width, len);
      const mesh = new THREE.Mesh(geometry, pitMat);
      mesh.onBeforeRender = () => TunnelChunk.updatePortalTime();
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
      for (const mesh of g.meshes) {
        this.group.remove(mesh);
        mesh.geometry.dispose();
      }
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
    const floorMat = this.floorMesh.material as THREE.MeshBasicMaterial;
    const ceilMat = this.ceilMesh.material as THREE.MeshBasicMaterial;
    const leftMat = this.leftMesh.material as THREE.MeshBasicMaterial;
    const rightMat = this.rightMesh.material as THREE.MeshBasicMaterial;
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
  return surfacePosition(face, CONFIG.tunnel.laneOffsets[lane]);
}

function surfacePosition(face: FaceIndex, lateralOffset: number): { x: number; y: number } {
  const half = CONFIG.tunnel.size / 2;
  switch (face) {
    case 0:
      return { x: lateralOffset, y: -half };
    case 1:
      return { x: half, y: lateralOffset };
    case 2:
      return { x: -lateralOffset, y: half };
    case 3:
      return { x: -half, y: -lateralOffset };
  }
}

function laneSpacing(): number {
  const offsets = CONFIG.tunnel.laneOffsets;
  return Math.abs(offsets[0] - offsets[1]);
}

function laneDividerPositions(): number[] {
  const orderedOffsets = [...CONFIG.tunnel.laneOffsets].sort((a, b) => a - b);
  const dividers: number[] = [];
  for (let i = 0; i < orderedOffsets.length - 1; i++) {
    dividers.push((orderedOffsets[i]! + orderedOffsets[i + 1]!) * 0.5);
  }
  return dividers;
}

function laneBounds(lane: LaneIndex): { min: number; max: number } {
  const half = CONFIG.tunnel.size / 2;
  const orderedLanes = ([0, 1, 2] as LaneIndex[]).sort(
    (a, b) => CONFIG.tunnel.laneOffsets[a] - CONFIG.tunnel.laneOffsets[b],
  );
  const laneOrder = orderedLanes.indexOf(lane);
  const boundaries = [-half, ...laneDividerPositions(), half];
  return {
    min: boundaries[laneOrder]!,
    max: boundaries[laneOrder + 1]!,
  };
}

function laneRunLayout(start: LaneIndex, end: LaneIndex): { center: number; width: number } {
  const offsets = CONFIG.tunnel.laneOffsets;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let lane = start; lane <= end; lane++) {
    const bounds = laneBounds(lane as LaneIndex);
    min = Math.min(min, bounds.min);
    max = Math.max(max, bounds.max);
  }
  return {
    center: (offsets[start] + offsets[end]) * 0.5,
    width: max - min,
  };
}

function gapLaneRuns(mask: LaneMask): Array<{ start: LaneIndex; end: LaneIndex }> {
  const runs: Array<{ start: LaneIndex; end: LaneIndex }> = [];
  let lane = 0;
  while (lane < CONFIG.tunnel.laneCount) {
    if (!mask[lane as LaneIndex]) {
      lane++;
      continue;
    }
    const start = lane as LaneIndex;
    let end = start;
    lane++;
    while (lane < CONFIG.tunnel.laneCount && mask[lane as LaneIndex]) {
      end = lane as LaneIndex;
      lane++;
    }
    runs.push({ start, end });
  }
  return runs;
}

function scaleGapUv(geometry: THREE.PlaneGeometry, width: number, length: number): void {
  const uv = geometry.getAttribute('uv');
  const laneUnit = Math.max(0.001, laneSpacing());
  const widthRepeat = Math.max(1, width / laneUnit);
  const lengthRepeat = Math.max(1, length / 5);
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * widthRepeat, uv.getY(i) * lengthRepeat);
  }
  uv.needsUpdate = true;
}
