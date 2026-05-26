import * as THREE from 'three';
import { CONFIG, type FaceIndex, type LaneIndex } from '../config';
import { clamp, damp, lerp } from '../util/math';

export class Player {
  readonly root: THREE.Group;
  readonly visualRoot: THREE.Group;

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
  private runPhase = 0;
  private surfaceAngle = 0;

  private head!: THREE.Mesh;
  private body!: THREE.Mesh;
  private armL!: THREE.Mesh;
  private armR!: THREE.Mesh;
  private legL!: THREE.Mesh;
  private legR!: THREE.Mesh;
  private flameTrail!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private flameTrailUniforms!: {
    uTime: { value: number };
    uIntensity: { value: number };
  };

  private readonly surfaceBase = CONFIG.tunnel.size / 2;

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
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x2b1405, emissive: 0xff3d00, emissiveIntensity: 0.28, roughness: 0.72 });

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
    armL.position.set(-0.47, 0.66, 0.02);
    this.armL = armL;
    this.visualRoot.add(armL);

    const armR = new THREE.Mesh(armGeo.clone(), shirtMat);
    armR.position.set(0.47, 0.66, 0.02);
    this.armR = armR;
    this.visualRoot.add(armR);

    const legGeo = new THREE.CapsuleGeometry(0.095, 0.2, 6, 10);
    legGeo.translate(0, -0.13, 0);
    const legL = new THREE.Mesh(legGeo, pantsMat);
    legL.position.set(-0.24, 0.2, 0.02);
    this.legL = legL;
    this.visualRoot.add(legL);

    const legR = new THREE.Mesh(legGeo.clone(), pantsMat);
    legR.position.set(0.24, 0.2, 0.02);
    this.legR = legR;
    this.visualRoot.add(legR);

    const shoeGeo = new THREE.SphereGeometry(0.12, 12, 8);
    const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
    shoeL.scale.set(1.35, 0.45, 1.05);
    shoeL.position.set(-0.24, -0.01, 0.06);
    this.visualRoot.add(shoeL);
    const shoeR = new THREE.Mesh(shoeGeo.clone(), shoeMat);
    shoeR.scale.copy(shoeL.scale);
    shoeR.position.set(0.24, -0.01, 0.06);
    this.visualRoot.add(shoeR);

    this.flameTrailUniforms = {
      uTime: { value: 0 },
      uIntensity: { value: 1 },
    };
    const trail = new THREE.Mesh(
      new THREE.PlaneGeometry(0.92, 1.45, 16, 24),
      new THREE.ShaderMaterial({
        uniforms: this.flameTrailUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: `
          varying vec2 vUv;
          uniform float uTime;
          void main() {
            vUv = uv;
            vec3 p = position;
            float fade = 1.0 - uv.y;
            p.x += sin(uv.y * 9.0 + uTime * 5.5) * 0.09 * fade;
            p.y += sin(uv.y * 5.0 + uTime * 3.0) * 0.035 * fade;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float uTime;
          uniform float uIntensity;
          void main() {
            float tail = 1.0 - vUv.y;
            float center = 1.0 - smoothstep(0.0, 0.48, abs(vUv.x - 0.5));
            float flicker = 0.76 + 0.24 * sin(uTime * 11.0 + vUv.y * 18.0);
            float alpha = pow(tail, 1.7) * center * flicker * 0.58 * uIntensity;
            vec3 hot = vec3(1.0, 0.82, 0.28);
            vec3 fire = vec3(1.0, 0.22, 0.04);
            vec3 blue = vec3(0.18, 0.45, 1.0);
            vec3 color = mix(hot, fire, smoothstep(0.12, 0.75, vUv.y));
            color = mix(color, blue, smoothstep(0.78, 1.0, vUv.y) * 0.28);
            gl_FragColor = vec4(color, alpha);
          }
        `,
      }),
    );
    trail.name = 'ShaderFlameAfterimage';
    trail.position.set(0, 0.43, -0.58);
    trail.rotation.x = Math.PI / 2;
    this.flameTrail = trail;
    this.visualRoot.add(trail);
  }

  setLaneInstant(lane: LaneIndex): void {
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
    this.tiltZ = 0;
    this.visualRoot.rotation.x = 0;
    this.visualRoot.rotation.z = 0;
    this.setSurfaceAngle(0);
    this.setFaceInstant(0);
    this.setLaneInstant(1);
    this.setSpeed(CONFIG.player.startSpeed);
  }

  jump(): void {
    if (!this.isGrounded) return;
    const { jumpHeight, gravity } = CONFIG.player;
    this.velocityY = Math.sqrt(2 * gravity * jumpHeight);
    this.isGrounded = false;
  }

  beginRotationLock(): void {
    this.rotationLocked = true;
    this.velocityY = 0;
  }

  endRotationLock(): void {
    this.rotationLocked = false;
  }

  fall(dt: number): boolean {
    this.velocityY -= CONFIG.player.gravity * dt;
    this.localY += this.velocityY * dt;
    this.applySurfaceTransform();
    this.visualRoot.rotation.z += dt * 3.6;
    this.visualRoot.rotation.x = lerp(this.visualRoot.rotation.x, -0.75, 0.08);
    this.updateFlameTrail();
    return this.localY <= -CONFIG.tunnel.size * 0.65;
  }

  update(dt: number): void {
    this.laneCurrentX = damp(this.laneCurrentX, this.laneTargetX, 14, dt);

    if (!this.isGrounded && !this.rotationLocked) {
      this.velocityY -= CONFIG.player.gravity * dt;
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
      const strideLift = Math.abs(Math.sin(this.runPhase)) * 0.18;
      this.armL.rotation.x = swing;
      this.armR.rotation.x = -swing;
      this.legL.rotation.x = -swing;
      this.legR.rotation.x = swing;
      this.legL.rotation.z = Math.max(0, Math.sin(this.runPhase)) * -0.18;
      this.legR.rotation.z = Math.max(0, -Math.sin(this.runPhase)) * 0.18;
      const bob = Math.abs(Math.sin(this.runPhase)) * 0.1;
      this.head.position.y = 0.9 + bob;
      this.body.position.y = 0.52 + bob * 0.5;
      this.legL.position.y = 0.2 + Math.max(0, Math.sin(this.runPhase)) * strideLift;
      this.legR.position.y = 0.2 + Math.max(0, -Math.sin(this.runPhase)) * strideLift;
    } else {
      const tuck = lerp(this.armL.rotation.x, -1.0, 0.2);
      this.armL.rotation.x = tuck;
      this.armR.rotation.x = tuck;
      this.legL.rotation.x = lerp(this.legL.rotation.x, -0.4, 0.2);
      this.legR.rotation.x = lerp(this.legR.rotation.x, -0.4, 0.2);
      this.legL.rotation.z = lerp(this.legL.rotation.z, 0, 0.2);
      this.legR.rotation.z = lerp(this.legR.rotation.z, 0, 0.2);
      this.legL.position.y = lerp(this.legL.position.y, 0.2, 0.2);
      this.legR.position.y = lerp(this.legR.position.y, 0.2, 0.2);
    }
    this.updateFlameTrail();
  }

  private updateFlameTrail(): void {
    this.flameTrailUniforms.uTime.value = this.runPhase;
    this.flameTrailUniforms.uIntensity.value = this.isGrounded ? 1 : 0.72;
    this.flameTrail.position.x = Math.sin(this.runPhase * 1.4) * 0.04;
    this.flameTrail.position.y = 0.43 + Math.abs(Math.sin(this.runPhase)) * 0.04;
    this.flameTrail.scale.set(1 + Math.sin(this.runPhase * 2.1) * 0.06, 1, 1);
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
