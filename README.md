# Gap Runner — 极简 3D 方形隧道跑酷

这是一个基于 **Three.js + TypeScript + Vite** 开发的极简 3D 跑酷原型。玩家会在一个持续向前延伸的四面方形隧道中自动奔跑，默认通过左右键切换跑道；当角色处于边缘跑道且已经起跳时，左右键会触发整条隧道旋转 90°，让相邻墙面翻转成新的地面。

项目目标是只保留一条最小可玩的核心循环：**奔跑 → 观察前方空洞 → 切道 / 跳跃 / 空中翻面 → 尽量跑得更远**。

> 设计文档位于 [`doc/`](./doc/)，当前唯一有效规格是 [`doc/mini-gdd-ai-gap-only.md`](./doc/mini-gdd-ai-gap-only.md)。

## 功能概览

- 四面方形隧道：地面 / 右墙 / 天花板 / 左墙
- 当前地面固定 3 条离散跑道
- 角色自动前进
- 单次跳跃
- 空中边缘触发 90° 翻面
- 仅保留“地面空洞”这一种危险
- 仅按距离计分
- 包含开始、暂停、失败与重开流程

## 本地开发

先安装依赖：

```bash
pnpm install
```

启动开发服务器：

```bash
pnpm dev
```

默认会打开本地地址：`http://127.0.0.1:5173`

## 构建与预览

普通生产构建：

```bash
pnpm build
```

构建产物输出到：`dist/`

本地预览生产包：

```bash
pnpm preview
```

## GitHub Pages 构建与发布

这个仓库已经补充了 GitHub Pages 所需的两部分支持：

1. **Pages 专用构建脚本**：自动使用仓库子路径 ` /ai-3d-runner/ ` 作为资源基础路径。
2. **GitHub Actions 发布工作流**：推送到默认分支后，可以自动构建并部署 `dist/` 到 GitHub Pages。

### 本地构建 GitHub Pages 版本

如果你想先在本地验证 Pages 版本的资源路径，可以运行：

```bash
pnpm build:pages
pnpm preview:pages
```

其中：

- `build:pages` 会使用 GitHub Pages 所需的仓库子路径构建
- `preview:pages` 会先执行 `build:pages`，再启动本地预览

启动 `preview:pages` 之后，请优先打开带仓库子路径的地址，例如：

```text
http://127.0.0.1:4173/ai-3d-runner/
```

如果你只打开根路径 `/`，看到的结果可能和 GitHub Pages 的实际访问路径不一致。

### 启用自动发布

1. 将仓库推送到 GitHub。
2. 进入仓库的 **Settings → Pages**。
3. 在 **Build and deployment** 里选择 **Source: GitHub Actions**。
4. 确保默认分支包含本仓库中的 `.github/workflows/deploy-pages.yml`。
5. 之后每次推送到默认分支，GitHub 都会自动构建并发布站点。

发布成功后，页面地址通常是：

```text
https://jwk000.github.io/ai-3d-runner/
```

> 如果你之后修改了仓库名，需要同步更新 `vite.config.ts` 里的 `githubPagesBase`。
> 如果本地第一次安装依赖时遇到 `ERR_PNPM_IGNORED_BUILDS`，先检查仓库里的 `pnpm-workspace.yaml` 是否已经允许 `esbuild` 执行构建脚本。

## 操作方式

| 按键 | 功能 |
| --- | --- |
| `←` / `A` | 向左切道；若角色已在左边缘且处于空中，则触发向左翻面 |
| `→` / `D` | 向右切道；若角色已在右边缘且处于空中，则触发向右翻面 |
| `Space` | 跳跃 |
| `Esc` | 暂停 / 继续 |

左右键是上下文相关输入：

- 正常情况下用于切换跑道
- 在边缘跑道并且角色已经起跳时，用于让整条隧道翻面

## 当前玩法范围

- 四面隧道
- 三条跑道
- 自动前进
- 单次跳跃
- 空中边缘翻面
- 地面空洞
- 距离计分
- 暂停、失败、重开

## 项目结构

```text
src/
├── main.ts                     # 程序入口
├── config.ts                   # 隧道、角色、镜头等调参常量
├── engine/
│   ├── Engine.ts               # 固定步长主循环
│   ├── Renderer.ts             # Three.js 渲染包装与 WebGL 失败处理
│   └── Input.ts                # 键盘输入映射
├── game/
│   ├── Game.ts                 # 游戏流程与主玩法逻辑
│   ├── GameState.ts            # 距离、时间、阶段状态
│   ├── Player.ts               # 移动、跳跃、切道、跑步动画
│   ├── Camera.ts               # 第三人称跟随镜头
│   ├── Collision.ts            # 空洞失败判定
│   └── Tunnel/
│       ├── TunnelManager.ts    # 隧道分块流式管理
│       ├── TunnelChunk.ts      # 隧道几何与空洞渲染
│       ├── ChunkGenerator.ts   # 极简程序化生成
│       └── Rotator.ts          # 90° 翻面逻辑
├── ui/
│   └── HUD.ts                  # HUD、提示与横幅
└── util/
    ├── math.ts
    ├── PRNG.ts
    └── EventBus.ts

doc/
├── README.md
└── mini-gdd-ai-gap-only.md
```

## 技术栈

- **Three.js r160**：WebGL 渲染
- **TypeScript 5.4**：严格类型检查
- **Vite 5**：开发服务器与生产构建
- **pnpm**：依赖管理

## 校验状态

完成这轮改动后，建议至少验证以下命令：

```bash
pnpm typecheck
pnpm build
pnpm build:pages
```

如果你准备正式发布，再到 GitHub Actions 页面确认部署任务成功。

## 许可证

本仓库代码采用 **CC0 / Public Domain**。
