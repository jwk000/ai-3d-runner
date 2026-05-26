import { CONFIG, type FaceIndex, type LaneIndex } from '../config';
import { AudioManager } from '../audio/AudioManager';
import { Engine } from '../engine/Engine';
import { Input } from '../engine/Input';
import { Renderer } from '../engine/Renderer';
import { HUD } from '../ui/HUD';
import { PRNG } from '../util/PRNG';
import { EventBus, type GameEvents } from '../util/EventBus';
import { FollowCamera } from './Camera';
import { checkGap, type PlayerStateForCollision } from './Collision';
import { GameState } from './GameState';
import { Player } from './Player';
import { TunnelRotator } from './Tunnel/Rotator';
import { TunnelManager } from './Tunnel/TunnelManager';

export class Game {
  private engine = new Engine(60);
  private renderer: Renderer;
  private input = new Input();
  private hud: HUD;
  private bus = new EventBus<GameEvents>();
  private state = new GameState();
  private rng: PRNG;
  private player: Player;
  private tunnel: TunnelManager;
  private rotator = new TunnelRotator();
  private camera: FollowCamera;
  private audio: AudioManager;
  private queuedDir: -1 | 1 | null = null;

  constructor(host: HTMLElement) {
    this.hud = new HUD(host);
    this.renderer = new Renderer(host, CONFIG.camera.fovNormal);
    const seed = (Math.random() * 2 ** 31) >>> 0;
    this.rng = new PRNG(seed);
    this.tunnel = new TunnelManager(this.rng);
    this.player = new Player();
    this.renderer.scene.add(this.tunnel.root);
    this.renderer.scene.add(this.player.root);
    this.camera = new FollowCamera(this.renderer.camera, this.player.root);
    this.audio = new AudioManager(this.bus);
    this.hud.setButtonClickSound(() => this.audio.playClick());

    this.engine.fixedUpdate = (dt) => this.fixedUpdate(dt);
    this.engine.lateUpdate = (dt) => this.lateUpdate(dt);
    this.engine.render = () => this.renderer.render();
  }

  start(): void {
    this.tunnel.init();
    this.input.attach((a) => this.onAction(a));
    this.engine.start();
    this.hud.show();
    this.showMenu();
  }

  private showMenu(): void {
    this.state.phase = 'menu';
    this.hud.showBanner(
      'Gap Runner',
      `<p>Run forward, read the gaps, jump and rotate to survive.</p>
       <p style="opacity:.6;font-size:14px;margin-top:10px">← / → switch lane &nbsp;·&nbsp; edge + airborne: rotate tunnel<br/>SPACE jump &nbsp;·&nbsp; ESC pause</p>`,
      'Start',
      () => this.beginRun(),
    );
  }

  private beginRun(): void {
    this.state.reset();
    this.state.phase = 'running';
    this.queuedDir = null;
    this.tunnel.currentFace = 0;
    this.rotator.reset(0, 0);
    this.tunnel.setRotationZ(0);
    this.input.unlock();
    this.player.resetForRun(12);
    this.tunnel.init();
    this.bus.emit('game.start', {});
  }

  private onAction(a: import('../engine/Input').ActionType): void {
    if (a === 'pause') {
      if (this.state.phase === 'running') this.pause();
      else if (this.state.phase === 'paused') this.resume();
      return;
    }
    if (this.state.phase !== 'running') return;

    if (this.rotator.isActive()) {
      if (a === 'left') this.queuedDir = -1;
      else if (a === 'right') this.queuedDir = 1;
      return;
    }

    switch (a) {
      case 'left':
        this.tryMove(-1);
        break;
      case 'right':
        this.tryMove(1);
        break;
      case 'jump':
        this.player.jump();
        this.bus.emit('player.jump', {});
        break;
    }
  }

  private tryMove(dir: -1 | 1): void {
    const lane = this.player.lane;
    if (dir === -1) {
      if (lane > 0) this.player.trySetLane((lane - 1) as LaneIndex);
      else this.requestRotation(-1);
    } else {
      if (lane < 2) this.player.trySetLane((lane + 1) as LaneIndex);
      else this.requestRotation(1);
    }
  }

  private requestRotation(dir: -1 | 1): void {
    if (this.player.isGrounded) {
      this.hud.flashToast('JUMP TO ROTATE');
      return;
    }
    this.beginRotation(dir);
  }

  private beginRotation(dir: -1 | 1): void {
    const cur = this.tunnel.currentFace;
    const target = ((cur + (dir === -1 ? 1 : 3)) % 4) as FaceIndex;
    const deltaAngle = dir === -1 ? -Math.PI / 2 : Math.PI / 2;
    const newLane: LaneIndex = dir === -1 ? 2 : 0;
    this.input.lock();
    this.player.beginRotationLock();
    this.player.setFaceInstant(target);
    this.player.trySetLane(newLane);
    this.player.setSurfaceAngle(this.rotator.getAngle());
    this.rotator.startRotation(target, deltaAngle, () => {
      this.tunnel.currentFace = target;
      this.rotator.currentFace = target;
      this.tunnel.setRotationZ(this.rotator.getAngle());
      this.player.setSurfaceAngle(this.rotator.getAngle());
      this.player.endRotationLock();
      this.input.unlock();
      this.bus.emit('tunnel.rotated', { direction: dir, newFace: target });
      if (this.queuedDir != null) {
        const q = this.queuedDir;
        this.queuedDir = null;
        setTimeout(() => this.tryMove(q), 0);
      }
    });
  }

  private pause(): void {
    this.state.phase = 'paused';
    this.bus.emit('game.pause', { paused: true });
    this.hud.showBanner('Paused', 'Take a breath.', 'Resume', () => this.resume());
  }

  private resume(): void {
    this.state.phase = 'running';
    this.bus.emit('game.pause', { paused: false });
    this.hud.hideBanner();
  }

  private gameOver(reason: string): void {
    this.state.phase = 'gameover';
    this.state.bestDistance = Math.max(this.state.bestDistance, this.state.distance);
    this.bus.emit('game.over', { distance: this.state.distance });
    this.hud.showBanner(
      'Game Over',
      `<p>${reason}</p>
       <p>Distance <strong>${this.state.distance.toFixed(0)}m</strong></p>
       <p style="opacity:.6">Best: ${this.state.bestDistance.toFixed(0)}m</p>`,
      'Run Again',
      () => this.beginRun(),
    );
  }

  private beginFallout(): void {
    this.state.phase = 'falling';
    this.queuedDir = null;
    this.input.lock();
    this.player.velocityY = -2;
    this.player.isGrounded = false;
    this.bus.emit('player.fallout', {});
  }

  private fixedUpdate(dt: number): void {
    if (this.state.phase === 'falling') {
      if (this.player.fall(dt)) {
        this.input.unlock();
        this.gameOver('You fell out of the tunnel.');
      }
      this.camera.update(dt);
      return;
    }
    if (this.state.phase !== 'running') return;
    this.state.elapsed += dt;

    const speedTarget = Math.min(
      CONFIG.player.maxSpeed,
      CONFIG.player.startSpeed + CONFIG.player.accelPerSec * this.state.elapsed,
    );
    this.player.setSpeed(this.player.speed + (speedTarget - this.player.speed) * dt * 1.5);

    this.player.update(dt);
    const advanceFactor = this.rotator.isActive() ? CONFIG.camera.rotateSlowFactor : 1;
    this.player.advance(dt * advanceFactor);
    this.rotator.update(dt);
    this.player.setSurfaceAngle(this.rotator.getAngle());

    this.tunnel.maybeRebase(this.player);
    const playerZ = this.player.worldZ();
    this.state.distance = playerZ + this.tunnel.worldOffsetZ;
    this.tunnel.update(playerZ, this.state.difficulty());

    const ps: PlayerStateForCollision = {
      faceIndex: this.player.face,
      lane: this.player.lane,
      zWorld: playerZ,
      isAirborne: !this.player.isGrounded,
      localY: this.player.localY,
    };

    if (checkGap(this.tunnel.visibleGaps(), ps)) {
      this.beginFallout();
    }
  }

  private lateUpdate(_dt: number): void {
    if (this.state.phase === 'falling') {
      this.camera.update(_dt);
      this.hud.setStats(this.state.distance);
      return;
    }
    if (this.rotator.isActive()) this.tunnel.setRotationZ(this.rotator.getAngle());
    this.player.setSurfaceAngle(this.rotator.getAngle());
    this.camera.update(_dt);
    this.hud.setStats(this.state.distance);
  }
}
