import type { FaceIndex, LaneIndex } from '../config';
import type { GapInstance } from './Tunnel/TunnelChunk';

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
    if (ps.zWorld >= g.zStart && ps.zWorld <= g.zEnd) return true;
  }
  return false;
}
