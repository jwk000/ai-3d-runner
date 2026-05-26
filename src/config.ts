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
    trail: {
      // 同时保留的拖尾粒子总数
      particleCount: 36,
      // 粒子最短生命周期（秒）
      lifeMin: 0.28,
      // 粒子最长生命周期（秒）
      lifeMax: 0.58,
      // 发射率速度缩放的最小系数
      speedFactorMin: 0.7,
      // 发射率速度缩放的最大系数
      speedFactorMax: 1.25,
      // 落地状态每秒发射粒子数
      emissionRateGrounded: 33,
      // 空中状态每秒发射粒子数
      emissionRateAir: 26,
      // 落地状态粒子衰减透明度上限
      alphaGrounded: 0.32,
      // 空中状态粒子衰减透明度上限
      alphaAir: 0.24,
      // 落地状态粒子出生透明度
      spawnAlphaGrounded: 0.42,
      // 空中状态粒子出生透明度
      spawnAlphaAir: 0.3,
      // 粒子衰减后的基础尺寸
      scaleMin: 4,
      // 粒子从出生到衰减的尺寸增量
      scaleGain: 8,
      // 空中状态粒子尺寸缩放系数
      scaleAirMultiplier: 0.88,
      // 粒子出生瞬间的初始尺寸
      spawnScale: 8,
      // 向后拖拽的基础速度
      backwardBase: 2.5,
      // 受角色速度影响的最小后向速度系数
      backwardSpeedMin: 0.08,
      // 后向速度随机扰动增量
      backwardSpeedGain: 0.1,
      // 横向散开的基础速度
      lateralBase: 0.11,
      // 横向散开的随机扰动幅度
      lateralJitter: 0.08,
      // 法线对横向散开速度的影响
      lateralNormalInfluence: 0.52,
      // 法线对前后速度的影响
      depthNormalInfluence: 0.2,
      // 落地时的向上抬升速度
      liftGrounded: 0.05,
      // 空中时的向上抬升速度
      liftAir: 0.1,
      // 点精灵透视缩放基准
      pointSizePerspective: 180,
      // 点精灵裁切半径
      pointDiscardRadius: 0.25,
      // 点精灵中心开始衰减的位置
      pointFadeInner: 0.03,
      // 点精灵边缘完全衰减的位置
      pointFadeOuter: 0.25,
      // 身体采样球的基础半径
      bodyRadius: 0.42,
      // 身体采样在 X 方向的缩放
      bodyScaleX: 1.08,
      // 身体采样在 Y 方向的缩放
      bodyScaleY: 1.02,
      // 身体采样在 Z 方向的缩放
      bodyScaleZ: 0.92,
      // 身体采样球心的基础高度
      bodyCenterY: 0.52,
      // 重置粒子时的默认 Z 偏移
      resetOffsetZ: -0.18,
      // 后半球采样允许的最靠后法线 Z
      rearHemisphereMinZ: -0.82,
      // 后半球采样允许的最靠前法线 Z，用于阻止前半身出粒子
      rearHemisphereMaxZ: -0.08,
      // 粒子中心亮部颜色
      colorBright: [1, 0.56, 0.16] as const,
      // 粒子主体颜色
      colorMid: [1, 0.48, 0.11] as const,
      // 粒子边缘与衰减暗部颜色
      colorDark: [0.86, 0.29, 0.06] as const,
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
