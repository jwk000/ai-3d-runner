import * as THREE from 'three';

export class RendererInitError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
  }
}

export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;

  constructor(host: HTMLElement, fov: number) {
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      throw new RendererInitError(
        'WebGL is not available. Please use a modern browser with hardware acceleration enabled.',
        e,
      );
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    host.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf2f4f8);
    this.scene.fog = new THREE.Fog(0xf2f4f8, 60, 180);

    this.camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 400);

    this.addLights();

    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private addLights(): void {
    const hemi = new THREE.HemisphereLight(0xffffff, 0xbfc6d6, 1.6);
    this.scene.add(hemi);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(4, 10, -6);
    this.scene.add(dir);

    const fill = new THREE.DirectionalLight(0xc8d8ff, 0.7);
    fill.position.set(-5, 6, 4);
    this.scene.add(fill);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
