# Gap Runner — Minimal 3D Tunnel Runner

A minimal 3D tunnel runner built around one core idea: run forward inside a 4-face square tunnel, switch between 3 lanes, and rotate the whole tunnel 90° when you jump and push past an edge lane.

> Design docs live in [`doc/`](./doc/). The canonical spec is [`doc/mini-gdd-ai-gap-only.md`](./doc/mini-gdd-ai-gap-only.md).

## Quickstart

```bash
pnpm install
pnpm dev          # → http://127.0.0.1:5173
```

Build for production:

```bash
pnpm build        # → dist/
pnpm preview      # serve the built bundle
```

## Controls

| Key | Action |
|---|---|
| `←` / `A` | Step left lane · on left edge while airborne: rotate tunnel |
| `→` / `D` | Step right lane · on right edge while airborne: rotate tunnel |
| `Space` | Jump |
| `Esc` | Pause / resume |

The directional keys are context-sensitive: in the middle of the floor they change lane; on an edge, they flip the whole tunnel so an adjacent wall becomes the new floor.

## Current game scope

- Four-faced tunnel: floor / right / ceiling / left
- Three discrete lanes on the current face
- Auto-run forward
- Single jump
- Airborne edge-triggered 90° tunnel rotation
- Gaps as the only hazard
- Distance-only scoring
- Main menu, pause, and restart flow

## Explicitly not included

- Coins
- Obstacles
- Speed pads
- Boss segments
- Combo or meta systems
- Audio pipeline and external asset planning
- Legacy roadmap and production-scale design scope

## Project layout

```text
src/
├── main.ts                     # bootstrap
├── config.ts                   # tuning constants for tunnel/player/camera
├── engine/
│   ├── Engine.ts               # fixed-step main loop
│   ├── Renderer.ts             # Three.js wrapper with WebGL fail handling
│   └── Input.ts                # keyboard → action mapping
├── game/
│   ├── Game.ts                 # gameplay loop, phase flow, input routing
│   ├── GameState.ts            # distance / elapsed / phase
│   ├── Player.ts               # movement, jump, lane transitions, run anim
│   ├── Camera.ts               # third-person follow camera
│   ├── Collision.ts            # gap-only failure checks
│   └── Tunnel/
│       ├── TunnelManager.ts    # chunk streaming + floating-origin support
│       ├── TunnelChunk.ts      # tunnel geometry + gap rendering
│       ├── ChunkGenerator.ts   # gap-only procedural generation
│       └── Rotator.ts          # 90° tunnel rotation
├── ui/
│   └── HUD.ts                  # distance HUD + banners + toast
└── util/
    ├── math.ts
    ├── PRNG.ts
    └── EventBus.ts

doc/
├── README.md
└── mini-gdd-ai-gap-only.md
```

## Tech stack

- **Three.js r160** — WebGL rendering
- **TypeScript 5.4** strict
- **Vite 5** — dev server + bundler

## Verified status

- ✅ `tsc --noEmit` clean
- ✅ `vite build` succeeds

## License

CC0 / public domain for the code in this repository.
