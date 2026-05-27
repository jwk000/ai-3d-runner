import * as THREE from 'three';
import { CONFIG, type FaceIndex, type LaneIndex } from '../config';
import { clamp, damp, lerp } from '../util/math';

export class Player {
  readonly root: THREE.Group;
  readonly visualRoot: THREE.Group;

  // 手臂相对身体中心的基础横向距离；值越大，手臂离身体越远
  private static readonly ARM_BASE_X = 0.6;
  // 手臂基础高度
  private static readonly ARM_BASE_Y = 0.5;
  // 手臂基础前后偏移，用于让手臂稍微脱离身体平面
  private static readonly ARM_BASE_Z = 0.08;
  // 跑步摆动时，手臂额外向两侧拉开的距离
  private static readonly ARM_SPLIT_X = 0.16;
  // 跑步摆动时，手臂额外向前送出的距离
  private static readonly ARM_SWING_Z = 0.12;
  // 跑步摆动时，手臂额外上抬的高度
  private static readonly ARM_SWING_Y = 0.03;

  // 腿部相对身体中心的基础横向距离；值越大，腿离身体越远
  private static readonly LEG_BASE_X = 0.2;
  // 腿部基础高度
  private static readonly LEG_BASE_Y = 0.14;
  // 腿部基础前后偏移
  private static readonly LEG_BASE_Z = 0.08;

  speed: number;
  face: FaceIndex = 0;
  lane: LaneIndex = 1;
  laneTargetX: number;
  laneCurrentX: number;
  isGrounded = true;
  velocityY = 0;
  localY: number;
  tiltZ = 0;

  private rotationLocked = false;
  private rotationEntryVelocityY = 0;
  private runPhase = 0;
  private surfaceAngle = 0;

  private head!: THREE.Mesh;
  private body!: THREE.Mesh;
  private armL!: THREE.Mesh;
  private armR!: THREE.Mesh;
  private legL!: THREE.Mesh;
  private legR!: THREE.Mesh;
  private dustPoints!: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private dustGeometry!: THREE.BufferGeometry;
  private dustMaterial!: THREE.ShaderMaterial;
  private dustPositions!: Float32Array;
  private dustScales!: Float32Array;
  private dustAlphas!: Float32Array;
  private dustVelocities!: Float32Array;
  private dustAges!: Float32Array;
  private dustLives!: Float32Array;
  private dustSeedCursor = 0;
  private dustSpawnAccumulator = 0;

  private readonly surfaceBase = CONFIG.tunnel.size / 2;
  private readonly dustConfig = CONFIG.player.dust;

  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'PlayerRoot';
    this.visualRoot = new THREE.Group();
    this.visualRoot.name = 'PlayerVisualRoot';
    this.visualRoot.scale.setScalar(1);
    this.root.add(this.visualRoot);

    this.speed = CONFIG.player.startSpeed;
    this.laneTargetX = CONFIG.tunnel.laneOffsets[this.lane];
    this.laneCurrentX = this.laneTargetX;

    this.localY = 0;

    this.build();
  }

  private build(): void {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffc06a, emissive: 0xff5a1f, emissiveIntensity: 0.45, roughness: 0.55 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xff7a18, emissive: 0xff3300, emissiveIntensity: 0.65, roughness: 0.48 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0xffc83d, emissive: 0xff7a00, emissiveIntensity: 0.55, roughness: 0.5 });

    const headFront = makeFaceCanvasMaterial();
    const headSide = new THREE.MeshStandardMaterial({ color: 0xffbb64, emissive: 0xff4c14, emissiveIntensity: 0.42, roughness: 0.58 });
    const headTop = new THREE.MeshStandardMaterial({ color: 0xffe06f, emissive: 0xff9500, emissiveIntensity: 0.52, roughness: 0.7 });

    const headMats: THREE.Material[] = [
      headSide,
      headSide,
      headTop,
      skinMat,
      headFront,
      headTop,
    ];

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), headMats);
    head.scale.set(1.12, 0.92, 1.05);
    head.position.set(0, 0.9, 0);
    this.head = head;
    this.visualRoot.add(head);

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), shirtMat);
    body.scale.set(1.08, 1.02, 0.92);
    body.position.set(0, 0.52, 0);
    this.body = body;
    this.visualRoot.add(body);

    const armGeo = new THREE.CapsuleGeometry(0.085, 0.24, 6, 10);
    armGeo.translate(0, -0.16, 0);
    const armL = new THREE.Mesh(armGeo, shirtMat);
    armL.position.set(-Player.ARM_BASE_X, Player.ARM_BASE_Y, Player.ARM_BASE_Z);
    this.armL = armL;
    this.visualRoot.add(armL);

    const armR = new THREE.Mesh(armGeo.clone(), shirtMat);
    armR.position.set(Player.ARM_BASE_X, Player.ARM_BASE_Y, Player.ARM_BASE_Z);
    this.armR = armR;
    this.visualRoot.add(armR);

    const legGeo = new THREE.CapsuleGeometry(0.095, 0.2, 6, 10);
    legGeo.translate(0, -0.13, 0);
    const legL = new THREE.Mesh(legGeo, pantsMat);
    legL.position.set(-Player.LEG_BASE_X, Player.LEG_BASE_Y, Player.LEG_BASE_Z);
    this.legL = legL;
    this.visualRoot.add(legL);

    const legR = new THREE.Mesh(legGeo.clone(), pantsMat);
    legR.position.set(Player.LEG_BASE_X, Player.LEG_BASE_Y, Player.LEG_BASE_Z);
    this.legR = legR;
    this.visualRoot.add(legR);

    this.buildDust();
  }

  setLaneInstant(lane: LaneIndex): void {
    this.lane = lane;
    this.laneTargetX = CONFIG.tunnel.laneOffsets[lane];
    this.laneCurrentX = this.laneTargetX;
    this.applySurfaceTransform();
  }

  setSurfaceState(face: FaceIndex, lane: LaneIndex): void {
    this.face = face;
    this.lane = lane;
    this.laneTargetX = CONFIG.tunnel.laneOffsets[lane];
    this.laneCurrentX = this.laneTargetX;
    this.applySurfaceTransform();
  }

  trySetLane(lane: LaneIndex): void {
    this.lane = lane;
    this.laneTargetX = CONFIG.tunnel.laneOffsets[lane];
  }

  setFaceInstant(face: FaceIndex): void {
    this.face = face;
    this.applySurfaceTransform();
  }

  setSurfaceAngle(angle: number): void {
    this.surfaceAngle = angle;
    this.applySurfaceTransform();
  }

  resetForRun(z: number): void {
    this.root.position.z = z;
    this.localY = 0;
    this.velocityY = 0;
    this.isGrounded = true;
    this.rotationLocked = false;
    this.rotationEntryVelocityY = 0;
    this.tiltZ = 0;
    this.visualRoot.rotation.x = 0;
    this.visualRoot.rotation.z = 0;
    this.setSurfaceAngle(0);
    this.setFaceInstant(0);
    this.setLaneInstant(1);
    this.setSpeed(CONFIG.player.startSpeed);
    this.resetDust();
  }

  jump(): void {
    if (!this.isGrounded) return;
    const { jumpHeight, jumpGravityUp } = CONFIG.player;
    this.velocityY = Math.sqrt(2 * jumpGravityUp * jumpHeight);
    this.isGrounded = false;
  }

  beginRotationLock(): void {
    this.rotationEntryVelocityY = this.velocityY;
    this.rotationLocked = true;
    this.velocityY = 0;
  }

  endRotationLock(): void {
    this.rotationLocked = false;
    if (!this.isGrounded && this.rotationEntryVelocityY <= 0) {
      this.velocityY = Math.min(this.velocityY, -CONFIG.player.rotationExitFallSpeed);
    }
    this.rotationEntryVelocityY = 0;
  }

  fall(dt: number): boolean {
    this.velocityY -= CONFIG.player.jumpGravityDown * dt;
    this.localY += this.velocityY * dt;
    this.applySurfaceTransform();
    this.visualRoot.rotation.z += dt * 3.6;
    this.visualRoot.rotation.x = lerp(this.visualRoot.rotation.x, -0.75, 0.08);
    this.updateDust(dt);
    return this.localY <= -CONFIG.tunnel.size * 0.65;
  }

  update(dt: number): void {
    this.laneCurrentX = damp(this.laneCurrentX, this.laneTargetX, 14, dt);

    if (!this.isGrounded && !this.rotationLocked) {
      const gravity = this.velocityY > 0 ? CONFIG.player.jumpGravityUp : CONFIG.player.jumpGravityDown;
      this.velocityY -= gravity * dt;
      this.localY += this.velocityY * dt;
      if (this.localY <= 0) {
        this.localY = 0;
        this.velocityY = 0;
        this.isGrounded = true;
      }
    }

    this.applySurfaceTransform();

    const targetTilt = (this.laneTargetX - this.laneCurrentX) * -0.18;
    this.tiltZ = damp(this.tiltZ, targetTilt, 12, dt);
    this.visualRoot.rotation.z = this.tiltZ;

    if (this.isGrounded) {
      this.runPhase += dt * (8 + this.speed * 0.25);
      const swing = Math.sin(this.runPhase) * 1.25;
      const strideLift = Math.abs(Math.sin(this.runPhase)) * 0.24;
      const splitPulse = Math.sin(this.runPhase) * 0.08;
      const legSpread = Math.abs(Math.sin(this.runPhase)) * 0.06;
      this.armL.rotation.x = swing;
      this.armR.rotation.x = -swing;
      this.legL.rotation.x = -swing;
      this.legR.rotation.x = swing;
      this.legL.rotation.z = Math.max(0, Math.sin(this.runPhase)) * -0.18;
      this.legR.rotation.z = Math.max(0, -Math.sin(this.runPhase)) * 0.18;
      const bob = Math.abs(Math.sin(this.runPhase)) * 0.1;
      this.head.position.y = 0.9 + bob;
      this.body.position.y = 0.52 + bob * 0.5;
      this.armL.position.x = -Player.ARM_BASE_X - Math.max(0, splitPulse) * Player.ARM_SPLIT_X;
      this.armR.position.x = Player.ARM_BASE_X + Math.max(0, -splitPulse) * Player.ARM_SPLIT_X;
      this.armL.position.y = Player.ARM_BASE_Y + Math.max(0, swing) * Player.ARM_SWING_Y;
      this.armR.position.y = Player.ARM_BASE_Y + Math.max(0, -swing) * Player.ARM_SWING_Y;
      this.armL.position.z = Player.ARM_BASE_Z + Math.max(0, swing) * Player.ARM_SWING_Z;
      this.armR.position.z = Player.ARM_BASE_Z + Math.max(0, -swing) * Player.ARM_SWING_Z;
      this.legL.position.x = -Player.LEG_BASE_X - Math.max(0, Math.sin(this.runPhase)) * legSpread;
      this.legR.position.x = Player.LEG_BASE_X + Math.max(0, -Math.sin(this.runPhase)) * legSpread;
      this.legL.position.y = Player.LEG_BASE_Y + Math.max(0, Math.sin(this.runPhase)) * strideLift;
      this.legR.position.y = Player.LEG_BASE_Y + Math.max(0, -Math.sin(this.runPhase)) * strideLift;
      this.legL.position.z = Player.LEG_BASE_Z + Math.max(0, Math.sin(this.runPhase)) * 0.12;
      this.legR.position.z = Player.LEG_BASE_Z + Math.max(0, -Math.sin(this.runPhase)) * 0.12;
    } else {
      const tuck = lerp(this.armL.rotation.x, -1.0, 0.2);
      this.armL.rotation.x = tuck;
      this.armR.rotation.x = tuck;
      this.legL.rotation.x = lerp(this.legL.rotation.x, -0.4, 0.2);
      this.legR.rotation.x = lerp(this.legR.rotation.x, -0.4, 0.2);
      this.legL.rotation.z = lerp(this.legL.rotation.z, 0, 0.2);
      this.legR.rotation.z = lerp(this.legR.rotation.z, 0, 0.2);
      this.armL.position.x = lerp(this.armL.position.x, -Player.ARM_BASE_X, 0.2);
      this.armR.position.x = lerp(this.armR.position.x, Player.ARM_BASE_X, 0.2);
      this.armL.position.y = lerp(this.armL.position.y, Player.ARM_BASE_Y, 0.2);
      this.armR.position.y = lerp(this.armR.position.y, Player.ARM_BASE_Y, 0.2);
      this.armL.position.z = lerp(this.armL.position.z, Player.ARM_BASE_Z + Player.ARM_SWING_Z * (2 / 3), 0.2);
      this.armR.position.z = lerp(this.armR.position.z, Player.ARM_BASE_Z + Player.ARM_SWING_Z * (2 / 3), 0.2);
      this.legL.position.x = lerp(this.legL.position.x, -Player.LEG_BASE_X, 0.2);
      this.legR.position.x = lerp(this.legR.position.x, Player.LEG_BASE_X, 0.2);
      this.legL.position.y = lerp(this.legL.position.y, Player.LEG_BASE_Y, 0.2);
      this.legR.position.y = lerp(this.legR.position.y, Player.LEG_BASE_Y, 0.2);
      this.legL.position.z = lerp(this.legL.position.z, Player.LEG_BASE_Z + 0.05, 0.2);
      this.legR.position.z = lerp(this.legR.position.z, Player.LEG_BASE_Z + 0.05, 0.2);
    }
    this.updateDust(dt);
  }

  private buildDust(): void {
    const count = this.dustConfig.particleCount;
    this.dustPositions = new Float32Array(count * 3);
    this.dustVelocities = new Float32Array(count * 3);
    this.dustScales = new Float32Array(count);
    this.dustAlphas = new Float32Array(count);
    this.dustAges = new Float32Array(count);
    this.dustLives = new Float32Array(count);

    this.dustGeometry = new THREE.BufferGeometry();
    this.dustGeometry.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));
    this.dustGeometry.setAttribute('aScale', new THREE.BufferAttribute(this.dustScales, 1));
    this.dustGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.dustAlphas, 1));

    this.dustMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uPointSizePerspective: { value: this.dustConfig.pointSizePerspective },
        uPointDiscardRadius: { value: this.dustConfig.pointDiscardRadius },
        uPointFadeInner: { value: this.dustConfig.pointFadeInner },
        uPointFadeOuter: { value: this.dustConfig.pointFadeOuter },
        uDustColorBright: { value: new THREE.Vector3(...this.dustConfig.colorBright) },
        uDustColorMid: { value: new THREE.Vector3(...this.dustConfig.colorMid) },
        uDustColorDark: { value: new THREE.Vector3(...this.dustConfig.colorDark) },
      },
      vertexShader: `
        attribute float aScale;
        attribute float aAlpha;
        uniform float uPixelRatio;
        uniform float uPointSizePerspective;
        varying float vAlpha;

        void main() {
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aScale * uPixelRatio * (uPointSizePerspective / max(1.0, -mvPosition.z));
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        uniform float uPointDiscardRadius;
        uniform float uPointFadeInner;
        uniform float uPointFadeOuter;
        uniform vec3 uDustColorBright;
        uniform vec3 uDustColorMid;
        uniform vec3 uDustColorDark;

        void main() {
          vec2 centered = gl_PointCoord - vec2(0.5);
          float dist = dot(centered, centered);
          if (dist > uPointDiscardRadius) discard;

          float radial = 1.0 - smoothstep(uPointFadeInner, uPointFadeOuter, dist);
          vec3 color = mix(uDustColorDark, uDustColorMid, radial);
          color = mix(color, uDustColorBright, radial * radial);
          gl_FragColor = vec4(color, radial * vAlpha);
        }
      `,
    });

    this.dustPoints = new THREE.Points(this.dustGeometry, this.dustMaterial);
    this.dustPoints.name = 'FootDustParticles';
    this.dustPoints.frustumCulled = false;
    this.visualRoot.add(this.dustPoints);

    this.resetDust();
  }

  private resetDust(): void {
    this.dustSeedCursor = 0;
    this.dustSpawnAccumulator = 0;
    for (let i = 0; i < this.dustConfig.particleCount; i += 1) {
      this.dustAges[i] = 1;
      this.dustLives[i] = 1;
      this.dustScales[i] = 0;
      this.dustAlphas[i] = 0;
      const idx = i * 3;
      this.dustPositions[idx] = 0;
      this.dustPositions[idx + 1] = this.dustConfig.resetY;
      this.dustPositions[idx + 2] = 0;
      this.dustVelocities[idx] = 0;
      this.dustVelocities[idx + 1] = 0;
      this.dustVelocities[idx + 2] = 0;
    }
    this.markDustAttributesDirty();
  }

  private updateDust(dt: number): void {
    for (let i = 0; i < this.dustConfig.particleCount; i += 1) {
      this.dustAges[i] += dt;
      const idx = i * 3;
      this.dustPositions[idx] += this.dustVelocities[idx] * dt;
      this.dustPositions[idx + 1] += this.dustVelocities[idx + 1] * dt;
      this.dustPositions[idx + 2] += this.dustVelocities[idx + 2] * dt;

      const life = this.dustLives[i];
      const t = life > 0 ? this.dustAges[i] / life : 1;
      const fade = 1 - clamp(t, 0, 1);
      this.dustAlphas[i] = fade * fade * this.dustConfig.alpha;
      this.dustScales[i] = this.dustConfig.scaleMin + fade * this.dustConfig.scaleGain;
    }

    if (this.isGrounded && this.speed > 0.05) {
      const speedFactor = clamp(
        this.speed / Math.max(CONFIG.player.maxSpeed, 0.001),
        this.dustConfig.speedFactorMin,
        this.dustConfig.speedFactorMax,
      );
      this.dustSpawnAccumulator += dt * this.dustConfig.emissionRateGrounded * speedFactor;
      while (this.dustSpawnAccumulator >= 1) {
        this.respawnDustParticle(this.dustSeedCursor % this.dustConfig.particleCount);
        this.dustSeedCursor += 1;
        this.dustSpawnAccumulator -= 1;
      }
    }

    this.markDustAttributesDirty();
  }

  private respawnDustParticle(index: number): void {
    const foot = this.sampleFootDustOrigin(index + this.dustSeedCursor);
    const lifeT = this.noise(index * 13.17 + this.dustSeedCursor * 0.37);
    const life = lerp(this.dustConfig.lifeMin, this.dustConfig.lifeMax, lifeT);
    const idx = index * 3;

    this.dustAges[index] = 0;
    this.dustLives[index] = life;
    this.dustPositions[idx] = foot.x;
    this.dustPositions[idx + 1] = foot.y;
    this.dustPositions[idx + 2] = foot.z;

    const backward =
      this.dustConfig.backwardBase +
      this.speed *
        (this.dustConfig.backwardSpeedMin +
          this.dustConfig.backwardSpeedGain * this.noise(index * 4.13 + 3.1));
    const lateral =
      this.dustConfig.lateralBase +
      this.dustConfig.lateralJitter * this.signedNoise(index * 7.91 + 1.7);
    const lift =
      this.dustConfig.liftBase +
      this.dustConfig.liftJitter * this.noise(index * 5.31 + 0.9);
    const depthJitter = this.dustConfig.depthJitter * this.signedNoise(index * 9.47 + 2.4);
    this.dustVelocities[idx] = lateral;
    this.dustVelocities[idx + 1] = lift;
    this.dustVelocities[idx + 2] = -backward + depthJitter;

    this.dustScales[index] = this.dustConfig.spawnScale;
    this.dustAlphas[index] = this.dustConfig.spawnAlpha;
  }

  private sampleFootDustOrigin(seed: number): { x: number; y: number; z: number } {
    const useLeftFoot = Math.sin(this.runPhase) >= 0;
    const leg = useLeftFoot ? this.legL : this.legR;
    const lateralSide = useLeftFoot ? -1 : 1;
    const xJitter = this.signedNoise(seed * 0.73 + 0.11) * 0.035;
    const yJitter = this.noise(seed * 1.31 + 0.47) * 0.035;
    const zJitter = this.signedNoise(seed * 1.79 + 1.07) * 0.045;

    return {
      x: leg.position.x + lateralSide * this.dustConfig.footOffsetX + xJitter,
      y: leg.position.y + this.dustConfig.footOffsetY + yJitter,
      z: leg.position.z + this.dustConfig.footOffsetZ + zJitter,
    };
  }

  private markDustAttributesDirty(): void {
    this.dustGeometry.attributes.position.needsUpdate = true;
    this.dustGeometry.attributes.aScale.needsUpdate = true;
    this.dustGeometry.attributes.aAlpha.needsUpdate = true;
  }

  private noise(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  private signedNoise(seed: number): number {
    return this.noise(seed) * 2 - 1;
  }

  worldZ(): number {
    return this.root.position.z;
  }

  advance(dt: number): void {
    this.root.position.z += this.speed * dt;
  }

  setSpeed(s: number): void {
    this.speed = clamp(s, 0, CONFIG.player.maxSpeed);
  }

  private applySurfaceTransform(): void {
    const half = this.surfaceBase;
    let localX: number;
    let localY: number;
    switch (this.face) {
      case 0:
        localX = this.laneCurrentX;
        localY = -half + this.localY;
        break;
      case 1:
        localX = half - this.localY;
        localY = this.laneCurrentX;
        break;
      case 2:
        localX = -this.laneCurrentX;
        localY = half - this.localY;
        break;
      case 3:
        localX = -half + this.localY;
        localY = -this.laneCurrentX;
        break;
    }

    const c = Math.cos(this.surfaceAngle);
    const s = Math.sin(this.surfaceAngle);
    this.root.position.x = localX * c - localY * s;
    this.root.position.y = localX * s + localY * c;
  }
}

function makeFaceCanvasMaterial(): THREE.MeshStandardMaterial {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f2c69b';
  g.fillRect(0, 0, size, size);
  g.fillStyle = '#3b2a1c';
  g.fillRect(10, 8, size - 20, 22);
  g.fillStyle = '#ffffff';
  g.fillRect(28, 50, 22, 16);
  g.fillRect(78, 50, 22, 16);
  g.fillStyle = '#1a1a1a';
  g.fillRect(36, 54, 8, 10);
  g.fillRect(86, 54, 8, 10);
  g.fillStyle = '#7a3b2a';
  g.fillRect(58, 78, 12, 6);
  g.strokeStyle = '#3a1a10';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(48, 100);
  g.lineTo(80, 100);
  g.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
}
