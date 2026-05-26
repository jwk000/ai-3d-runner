import * as THREE from 'three';
import { CONFIG, type LaneIndex } from '../config';
import { clamp, damp, lerp } from '../util/math';

export class Player {
  readonly root: THREE.Group;
  readonly visualRoot: THREE.Group;

  speed: number;
  lane: LaneIndex = 1;
  laneTargetX: number;
  laneCurrentX: number;
  isGrounded = true;
  velocityY = 0;
  localY: number;
  tiltZ = 0;

  private rotationLocked = false;
  private runPhase = 0;

  private head!: THREE.Mesh;
  private body!: THREE.Mesh;
  private armL!: THREE.Mesh;
  private armR!: THREE.Mesh;
  private legL!: THREE.Mesh;
  private legR!: THREE.Mesh;

  private readonly groundY: number;

  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'PlayerRoot';
    this.visualRoot = new THREE.Group();
    this.visualRoot.name = 'PlayerVisualRoot';
    this.visualRoot.scale.setScalar(0.5);
    this.root.add(this.visualRoot);

    this.speed = CONFIG.player.startSpeed;
    this.laneTargetX = CONFIG.tunnel.laneOffsets[this.lane];
    this.laneCurrentX = this.laneTargetX;

    this.groundY = -CONFIG.tunnel.size / 2;
    this.localY = this.groundY;

    this.build();
  }

  private build(): void {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe8b48a, roughness: 0.85 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2a4a8a, roughness: 0.65 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1a1f2e, roughness: 0.78 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0a0c12, roughness: 0.9 });

    const headFront = makeFaceCanvasMaterial();
    const headSide = new THREE.MeshStandardMaterial({ color: 0xe8b48a, roughness: 0.85 });
    const headTop = new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 1 });

    const headMats: THREE.Material[] = [
      headSide,
      headSide,
      headTop,
      skinMat,
      headFront,
      headTop,
    ];

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), headMats);
    head.position.set(0, 1.05, 0);
    this.head = head;
    this.visualRoot.add(head);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.22), shirtMat);
    body.position.set(0, 0.68, 0);
    this.body = body;
    this.visualRoot.add(body);

    const armGeo = new THREE.BoxGeometry(0.11, 0.4, 0.11);
    armGeo.translate(0, -0.2, 0);
    const armL = new THREE.Mesh(armGeo, shirtMat);
    armL.position.set(-0.27, 0.88, 0);
    this.armL = armL;
    this.visualRoot.add(armL);

    const armR = new THREE.Mesh(armGeo.clone(), shirtMat);
    armR.position.set(0.27, 0.88, 0);
    this.armR = armR;
    this.visualRoot.add(armR);

    const legGeo = new THREE.BoxGeometry(0.13, 0.38, 0.13);
    legGeo.translate(0, -0.19, 0);
    const legL = new THREE.Mesh(legGeo, pantsMat);
    legL.position.set(-0.1, 0.46, 0);
    this.legL = legL;
    this.visualRoot.add(legL);

    const legR = new THREE.Mesh(legGeo.clone(), pantsMat);
    legR.position.set(0.1, 0.46, 0);
    this.legR = legR;
    this.visualRoot.add(legR);

    const shoeGeo = new THREE.BoxGeometry(0.16, 0.06, 0.2);
    const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
    shoeL.position.set(-0.1, 0.04, 0.04);
    this.visualRoot.add(shoeL);
    const shoeR = new THREE.Mesh(shoeGeo.clone(), shoeMat);
    shoeR.position.set(0.1, 0.04, 0.04);
    this.visualRoot.add(shoeR);
  }

  setLaneInstant(lane: LaneIndex): void {
    this.lane = lane;
    this.laneTargetX = CONFIG.tunnel.laneOffsets[lane];
    this.laneCurrentX = this.laneTargetX;
  }

  trySetLane(lane: LaneIndex): void {
    this.lane = lane;
    this.laneTargetX = CONFIG.tunnel.laneOffsets[lane];
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

  update(dt: number): void {
    this.laneCurrentX = damp(this.laneCurrentX, this.laneTargetX, 14, dt);

    if (!this.isGrounded && !this.rotationLocked) {
      this.velocityY -= CONFIG.player.gravity * dt;
      this.localY += this.velocityY * dt;
      if (this.localY <= this.groundY) {
        this.localY = this.groundY;
        this.velocityY = 0;
        this.isGrounded = true;
      }
    }

    this.root.position.x = this.laneCurrentX;
    this.root.position.y = this.localY;

    const targetTilt = (this.laneTargetX - this.laneCurrentX) * -0.18;
    this.tiltZ = damp(this.tiltZ, targetTilt, 12, dt);
    this.visualRoot.rotation.z = this.tiltZ;

    if (this.isGrounded) {
      this.runPhase += dt * (8 + this.speed * 0.25);
      const swing = Math.sin(this.runPhase) * 0.7;
      this.armL.rotation.x = swing;
      this.armR.rotation.x = -swing;
      this.legL.rotation.x = -swing;
      this.legR.rotation.x = swing;
      const bob = Math.abs(Math.sin(this.runPhase)) * 0.04;
      this.head.position.y = 1.55 + bob;
      this.body.position.y = 1.0 + bob * 0.5;
    } else {
      const tuck = lerp(this.armL.rotation.x, -1.0, 0.2);
      this.armL.rotation.x = tuck;
      this.armR.rotation.x = tuck;
      this.legL.rotation.x = lerp(this.legL.rotation.x, -0.4, 0.2);
      this.legR.rotation.x = lerp(this.legR.rotation.x, -0.4, 0.2);
    }
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
