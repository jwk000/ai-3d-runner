import type { FaceIndex, LaneIndex } from '../config';
import type { GapInstance } from './Tunnel/TunnelChunk';

const GAP_COLLISION_INSET = 0.75;

export interface PlayerStateForCollision {
  faceIndex: FaceIndex;
  lane: LaneIndex;
  zWorld: number;
  isAirborne: boolean;
  localY: number;
}

export function checkGap(gaps: GapInstance[], ps: PlayerStateForCollision): boolean {
  if (ps.isAirborne) return false;
  for (const g of gaps) {
    if (g.face !== ps.faceIndex) continue;
    if (!g.laneMask[ps.lane]) continue;
    const fallStart = g.zStart + GAP_COLLISION_INSET;
    const fallEnd = g.zEnd - GAP_COLLISION_INSET;
    if (fallStart >= fallEnd) continue;
    if (ps.zWorld >= fallStart && ps.zWorld <= fallEnd) return true;
  }
  return false;
}
