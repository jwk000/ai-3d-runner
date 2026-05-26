export class HUD {
  private distEl = document.getElementById('hud-dist')!;
  private hudEl = document.getElementById('hud')!;
  private bannerEl = document.getElementById('banner')!;
  private bannerTitle = document.getElementById('banner-title')!;
  private bannerSub = document.getElementById('banner-sub')!;
  private bannerCta = document.getElementById('banner-cta') as HTMLButtonElement;
  private loadingEl = document.getElementById('loading')!;

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
}
