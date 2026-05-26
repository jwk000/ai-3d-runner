export class HUD {
  private readonly distEl: HTMLElement;
  private readonly hudEl: HTMLDivElement;
  private readonly bannerEl: HTMLDivElement;
  private readonly bannerTitle: HTMLHeadingElement;
  private readonly bannerSub: HTMLParagraphElement;
  private readonly bannerCta: HTMLButtonElement;
  private readonly loadingEl: HTMLDivElement;
  private onButtonClick: (() => void) | null = null;

  constructor(host: HTMLElement) {
    this.loadingEl = this.ensureLoading(host);
    this.hudEl = this.ensureHud(host);
    this.distEl = this.ensureDistance(this.hudEl);
    this.bannerEl = this.ensureBanner(host);
    this.bannerTitle = this.ensureBannerTitle(this.bannerEl);
    this.bannerSub = this.ensureBannerSub(this.bannerEl);
    this.bannerCta = this.ensureBannerButton(this.bannerEl);
  }

  setButtonClickSound(fn: () => void): void {
    this.onButtonClick = fn;
  }

  show(): void {
    this.loadingEl.style.display = 'none';
    this.hudEl.style.display = 'block';
  }

  setStats(distance: number): void {
    this.distEl.textContent = `${distance.toFixed(0)}m`;
  }

  showBanner(title: string, sub: string, ctaLabel: string, onCta: () => void): void {
    this.bannerTitle.textContent = title;
    this.bannerSub.innerHTML = sub;
    this.bannerCta.textContent = ctaLabel;
    this.bannerEl.classList.add('visible');
    this.bannerCta.onclick = () => {
      this.onButtonClick?.();
      this.hideBanner();
      onCta();
    };
  }

  hideBanner(): void {
    this.bannerEl.classList.remove('visible');
  }

  private toastEl: HTMLDivElement | null = null;
  private toastTimer: number | null = null;

  flashToast(text: string, durationMs = 700): void {
    if (!this.toastEl) {
      const el = document.createElement('div');
      el.style.cssText = [
        'position:absolute',
        'top:42%',
        'left:50%',
        'transform:translate(-50%,-50%)',
        'pointer-events:none',
        'font-size:22px',
        'letter-spacing:0.22em',
        'font-weight:700',
        'color:#fff',
        'text-shadow:0 2px 12px rgba(0,0,0,0.65)',
        'background:rgba(20,28,48,0.55)',
        'padding:10px 22px',
        'border-radius:6px',
        'border:1px solid rgba(255,255,255,0.18)',
        'opacity:0',
        'transition:opacity 120ms ease-out',
      ].join(';');
      this.hudEl.appendChild(el);
      this.toastEl = el;
    }
    this.toastEl.textContent = text;
    this.toastEl.style.opacity = '1';
    if (this.toastTimer != null) clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      if (this.toastEl) this.toastEl.style.opacity = '0';
    }, durationMs);
  }

  private ensureLoading(host: HTMLElement): HTMLDivElement {
    return this.ensureElement({
      id: 'loading',
      host,
      selector: '#loading',
      create: () => {
        const el = document.createElement('div');
        el.id = 'loading';
        el.textContent = 'Booting tunnel…';
        return el;
      },
    });
  }

  private ensureHud(host: HTMLElement): HTMLDivElement {
    return this.ensureElement({
      id: 'hud',
      host,
      selector: '#hud',
      create: () => {
        const el = document.createElement('div');
        el.id = 'hud';
        el.style.display = 'none';

        const top = document.createElement('div');
        top.className = 'hud-top';

        const pill = document.createElement('div');
        pill.className = 'pill';
        pill.append('DIST');

        const dist = document.createElement('strong');
        dist.id = 'hud-dist';
        dist.textContent = '0m';
        pill.appendChild(dist);
        top.appendChild(pill);

        const help = document.createElement('div');
        help.className = 'hud-help';
        help.innerHTML =
          '<kbd>←</kbd> <kbd>→</kbd> switch lane / rotate tunnel · <kbd>Space</kbd> jump · <kbd>Esc</kbd> pause';

        el.append(top, help);
        return el;
      },
    });
  }

  private ensureDistance(hudEl: HTMLDivElement): HTMLElement {
    let distEl = hudEl.querySelector<HTMLElement>('#hud-dist');
    if (!distEl) {
      const top = hudEl.querySelector('.hud-top') ?? hudEl.appendChild(document.createElement('div'));
      if (top instanceof HTMLDivElement && !top.className) top.className = 'hud-top';

      const pill = top.querySelector('.pill') ?? top.appendChild(document.createElement('div'));
      if (pill instanceof HTMLDivElement && !pill.className) pill.className = 'pill';
      if (!pill.textContent?.includes('DIST')) pill.append('DIST');

      distEl = document.createElement('strong');
      distEl.id = 'hud-dist';
      distEl.textContent = '0m';
      pill.appendChild(distEl);
    }
    return distEl;
  }

  private ensureBanner(host: HTMLElement): HTMLDivElement {
    return this.ensureElement({
      id: 'banner',
      host,
      selector: '#banner',
      create: () => {
        const el = document.createElement('div');
        el.id = 'banner';

        const title = document.createElement('h1');
        title.id = 'banner-title';
        title.textContent = 'Gap Runner';

        const sub = document.createElement('p');
        sub.id = 'banner-sub';

        const cta = document.createElement('button');
        cta.id = 'banner-cta';
        cta.className = 'cta';
        cta.type = 'button';
        cta.textContent = 'Start';

        el.append(title, sub, cta);
        return el;
      },
    });
  }

  private ensureBannerTitle(bannerEl: HTMLDivElement): HTMLHeadingElement {
    let title = bannerEl.querySelector<HTMLHeadingElement>('#banner-title');
    if (!title) {
      title = document.createElement('h1');
      title.id = 'banner-title';
      bannerEl.prepend(title);
    }
    return title;
  }

  private ensureBannerSub(bannerEl: HTMLDivElement): HTMLParagraphElement {
    let sub = bannerEl.querySelector<HTMLParagraphElement>('#banner-sub');
    if (!sub) {
      sub = document.createElement('p');
      sub.id = 'banner-sub';
      const cta = bannerEl.querySelector('#banner-cta');
      if (cta) bannerEl.insertBefore(sub, cta);
      else bannerEl.appendChild(sub);
    }
    return sub;
  }

  private ensureBannerButton(bannerEl: HTMLDivElement): HTMLButtonElement {
    let button = bannerEl.querySelector<HTMLButtonElement>('#banner-cta');
    if (!button) {
      button = document.createElement('button');
      button.id = 'banner-cta';
      button.className = 'cta';
      button.type = 'button';
      button.textContent = 'Start';
      bannerEl.appendChild(button);
    }
    return button;
  }

  private ensureElement<T extends HTMLElement>(options: {
    id: string;
    host: HTMLElement;
    selector: string;
    create: () => T;
  }): T {
    const existing = document.querySelector<T>(options.selector);
    if (existing) return existing;

    const created = options.create();
    if (!created.id) created.id = options.id;
    options.host.appendChild(created);
    return created;
  }
}
