export const CONFIG = {
  tunnel: {
    // 方形隧道的边长
    size: 9,
    // 当前地面上的跑道数量
    laneCount: 3,
    // 三条跑道相对中心线的横向偏移
    laneOffsets: [3, 0, -3] as const,
    // 单个隧道分块的长度
    chunkLength: 34,
    // 玩家前方预生成的分块数量
    chunksAhead: 6,
    // 玩家后方保留的分块数量
    chunksBehind: 1,
  },
  player: {
    // 开局前进速度
    startSpeed: 0,
    // 允许达到的最大速度
    maxSpeed: 12,
    // 从静止加速到最大速度所需时长（秒）
    accelDuration: 5,
    // 切换跑道的目标时长
    laneSwitchTime: 0.15,
    // 理想跳跃高度
    jumpHeight: 1.5,
    // 上升阶段重力
    jumpGravityUp: 38.4,
    // 下落阶段重力
    jumpGravityDown: 52,
    // 翻面结束后额外下坠速度
    rotationExitFallSpeed: 4.8,
    // 角色碰撞宽度
    width: 0.22,
    // 角色碰撞高度
    height: 0.6,
    // 角色碰撞深度
    depth: 0.15,
    dust: {
      // 同时保留的脚底尘土粒子总数
      particleCount: 28,
      // 粒子最短生命周期（秒）
      lifeMin: 0.2,
      // 粒子最长生命周期（秒）
      lifeMax: 0.42,
      // 发射率速度缩放的最小系数
      speedFactorMin: 0.6,
      // 发射率速度缩放的最大系数
      speedFactorMax: 1.2,
      // 落地奔跑时每秒发射粒子数
      emissionRateGrounded: 24,
      // 粒子衰减透明度上限
      alpha: 0.24,
      // 粒子出生透明度
      spawnAlpha: 0.34,
      // 粒子衰减后的基础尺寸
      scaleMin: 5,
      // 粒子从出生到衰减的尺寸增量
      scaleGain: 7,
      // 粒子出生瞬间的初始尺寸
      spawnScale: 7,
      // 向后带出的基础速度
      backwardBase: 1.15,
      // 受角色速度影响的最小后向速度系数
      backwardSpeedMin: 0.04,
      // 后向速度随机扰动增量
      backwardSpeedGain: 0.07,
      // 横向散开的基础速度
      lateralBase: 0.08,
      // 横向散开的随机扰动幅度
      lateralJitter: 0.1,
      // 向上扬起的基础速度
      liftBase: 0.28,
      // 向上扬起的随机扰动幅度
      liftJitter: 0.12,
      // 向前后深度方向的随机扰动幅度
      depthJitter: 0.08,
      // 点精灵透视缩放基准
      pointSizePerspective: 180,
      // 点精灵裁切半径
      pointDiscardRadius: 0.25,
      // 点精灵中心开始衰减的位置
      pointFadeInner: 0.03,
      // 点精灵边缘完全衰减的位置
      pointFadeOuter: 0.25,
      // 左右脚底相对腿部根节点的横向偏移微调
      footOffsetX: 0.02,
      // 脚底相对腿部根节点的高度偏移
      footOffsetY: -0.34,
      // 脚底相对腿部根节点的前后偏移
      footOffsetZ: 0.03,
      // 重置粒子时的默认高度
      resetY: -0.18,
      // 粒子中心亮部颜色
      colorBright: [0.8, 0.72, 0.56] as const,
      // 粒子主体颜色
      colorMid: [0.58, 0.5, 0.37] as const,
      // 粒子边缘与衰减暗部颜色
      colorDark: [0.33, 0.28, 0.21] as const,
    },
  },
  camera: {
    // 相机相对玩家的跟随偏移
    offset: [0, 2.8, -4.0] as [number, number, number],
    // 相机观察目标相对玩家的前方偏移
    lookAtOffset: [0, 0.3, 10] as [number, number, number],
    // 相机位置阻尼
    posDamp: 12,
    // 相机朝向阻尼
    lookDamp: 18,
    // 翻面旋转持续时间
    rotateDuration: 0.8,
    // 翻面时的时间减速系数
    rotateSlowFactor: 0.5,
    // 常规视角 FOV
    fovNormal: 74,
    // 速度强化时的 FOV
    fovBoost: 86,
  },
} as const;

export type FaceIndex = 0 | 1 | 2 | 3;
export type LaneIndex = 0 | 1 | 2;
