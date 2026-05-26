import * as THREE from 'three';
import { CONFIG } from '../config';
import { damp } from '../util/math';

export class FollowCamera {
  private current = new THREE.Vector3();
  private currentLook = new THREE.Vector3();
  // v0.4 alignment fix: player is a CHILD of tunnelRoot, so its `position`
  // property is in the rotating tunnel-local frame. The camera lives in the
  // scene root, so to stay visually behind the player after any rotation we
  // must read player.getWorldPosition() each frame, NOT player.position.
  private playerWorld = new THREE.Vector3();

  constructor(private camera: THREE.PerspectiveCamera, private playerRoot: THREE.Object3D) {
    const [ox, oy, oz] = CONFIG.camera.offset;
    playerRoot.getWorldPosition(this.playerWorld);
    this.current.set(this.playerWorld.x + ox, this.playerWorld.y + oy, this.playerWorld.z + oz);
    this.currentLook.copy(this.playerWorld);
    // v0.5 fix: camera up is ALWAYS world-Y. Previously we set up=(-sin,cos,0)
    // which made the camera roll WITH the tunnel during/after rotation. Because
    // Rotator.getStableAngle() returns the accumulated angle when idle, that
    // roll persisted after the rotation animation ended — visually cancelling
    // the tunnel rotation (Face 0 stayed at screen-bottom forever, hence the
    // "floor is always RED" bug). The whole point of tunnel rotation is that
    // a wall becomes the new floor on screen, which requires the camera frame
    // to remain world-aligned while the tunnel rotates underneath it.
    camera.up.set(0, 1, 0);
    camera.position.copy(this.current);
    camera.lookAt(this.currentLook);
  }

  update(dt: number): void {
    const [ox, oy, oz] = CONFIG.camera.offset;
    const [lx, ly, lz] = CONFIG.camera.lookAtOffset;

    this.playerRoot.getWorldPosition(this.playerWorld);

    // v0.5 fix: offset & lookAt offset are applied in WORLD axes (not rotated
    // by tunnelAngle). This is the partner to the up=(0,1,0) decision above:
    // the camera lives in the scene root and stays world-aligned, so the player
    // (which is parented to the rotating tunnelRoot) visibly swings to a new
    // face during rotation. Player.root counter-rotates by (stableAngle - liveAngle)
    // to stay upright on screen during the 0.8s animation.
    const targetX = this.playerWorld.x + ox;
    const targetY = this.playerWorld.y + oy;
    const targetZ = this.playerWorld.z + oz;

    this.current.x = damp(this.current.x, targetX, CONFIG.camera.posDamp, dt);
    this.current.y = damp(this.current.y, targetY, CONFIG.camera.posDamp, dt);
    this.current.z = damp(this.current.z, targetZ, CONFIG.camera.posDamp, dt);

    const lookTargetX = this.playerWorld.x + lx;
    const lookTargetY = this.playerWorld.y + ly;
    const lookTargetZ = this.playerWorld.z + lz;

    this.currentLook.x = damp(this.currentLook.x, lookTargetX, CONFIG.camera.lookDamp, dt);
    this.currentLook.y = damp(this.currentLook.y, lookTargetY, CONFIG.camera.lookDamp, dt);
    this.currentLook.z = damp(this.currentLook.z, lookTargetZ, CONFIG.camera.lookDamp, dt);

    this.camera.position.copy(this.current);
    this.camera.lookAt(this.currentLook);
  }
}
