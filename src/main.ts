import { Game } from './game/Game';
import { RendererInitError } from './engine/Renderer';

const host = document.getElementById('app')!;
try {
  const game = new Game(host);
  // Headless smoke tests inspect runtime state via window.__game (e.g. tunnel
  // rotation angle, player.lane). No-op for end users; trivial cost.
  (window as Window & { __game?: unknown }).__game = game;
  game.start();
} catch (e) {
  const loading = document.getElementById('loading');
  if (loading) {
    if (e instanceof RendererInitError) {
      loading.innerHTML = `<div style="text-align:center;line-height:1.6">
        <div style="font-size:18px;letter-spacing:.1em;color:#ff5a6e">WebGL 不可用</div>
        <div style="font-size:13px;opacity:.7;margin-top:8px">${e.message}</div>
      </div>`;
    } else {
      loading.textContent = `启动失败：${(e as Error).message ?? String(e)}`;
    }
  }
  console.error(e);
}
