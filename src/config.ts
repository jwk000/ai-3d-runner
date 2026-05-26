export const CONFIG = {
  tunnel: {
    size: 10,
    laneCount: 3,
    laneOffsets: [3, 0, -3] as const,
    chunkLength: 34,
    chunksAhead: 6,
    chunksBehind: 1,
  },
  player: {
    startSpeed: 12,
    maxSpeed: 12,
    accelPerSec: 0,
    laneSwitchTime: 0.15,
    jumpHeight: 1.2,
    gravity: 38.4,
    width: 0.22,
    height: 0.6,
    depth: 0.15,
  },
  camera: {
    offset: [0, 2.8, -4.0] as [number, number, number],
    lookAtOffset: [0, 0.3, 10] as [number, number, number],
    posDamp: 12,
    lookDamp: 18,
    rotateDuration: 0.8,
    rotateSlowFactor: 0.5,
    fovNormal: 74,
    fovBoost: 86,
  },
} as const;

export type FaceIndex = 0 | 1 | 2 | 3;
export type LaneIndex = 0 | 1 | 2;
