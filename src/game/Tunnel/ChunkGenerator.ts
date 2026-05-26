import { CONFIG, type FaceIndex } from '../../config';
import type { PRNG } from '../../util/PRNG';

export type LaneMask = [boolean, boolean, boolean];

export interface GapSpec {
  face: FaceIndex;
  laneMask: LaneMask;
  zStart: number;
  zEnd: number;
}

export interface ChunkData {
  zStart: number;
  length: number;
  gaps: GapSpec[];
}

export interface GenerateOptions {
  zStart: number;
  difficulty: number;
  currentFace: FaceIndex;
}

const FACES: readonly FaceIndex[] = [0, 1, 2, 3];
const GAP_MIN_LEN = 3.1;
const GAP_MAX_LEN = 6.1;
const GAP_MAX_SPACING = 5;
const GAP_MIN_SPACING = 1.5;
const TEACHING_MASKS: LaneMask[] = [
  [true, false, false],
  [false, true, false],
  [false, false, true],
];
const STANDARD_MASKS: LaneMask[] = [
  ...TEACHING_MASKS,
  [true, true, false],
  [true, false, true],
  [false, true, true],
];
const ROTATION_MASKS: LaneMask[] = [[true, true, true]];

export class ChunkGenerator {
  constructor(private rng: PRNG) {}

  generate(opts: GenerateOptions): ChunkData {
    const data: ChunkData = {
      zStart: opts.zStart,
      length: CONFIG.tunnel.chunkLength,
      gaps: [],
    };

    this.fillGapChunk(data, opts);
    return data;
  }

  private fillGapChunk(data: ChunkData, opts: GenerateOptions): void {
    const isTeaching = opts.zStart < CONFIG.tunnel.chunkLength * 2;
    const diff = opts.difficulty;
    for (const face of FACES) {
      const countRoll = diff * 3.15 + this.rng.range(-0.15, 0.75);
      const baseCount = isTeaching ? 1 : Math.max(1, Math.min(4, 1 + Math.floor(countRoll)));
      const gapCount = isTeaching || baseCount >= 4 || !this.rng.bool(0.18 + diff * 0.3) ? baseCount : baseCount + 1;
      this.placeRandomGaps(data, face, gapCount, diff, isTeaching, face === opts.currentFace);
    }
  }

  private placeRandomGaps(
    data: ChunkData,
    currentFace: FaceIndex,
    count: number,
    difficulty: number,
    isTeaching: boolean,
    isCurrentFace: boolean,
  ): void {
    const frontMargin = data.zStart === 0 ? 18 : 4;
    const backMargin = 4;
    const spacing = GAP_MAX_SPACING + (GAP_MIN_SPACING - GAP_MAX_SPACING) * difficulty;
    let attempts = 0;
    let placed = 0;

    while (placed < count && attempts < count * 20) {
      attempts++;
      const minLen = GAP_MIN_LEN + difficulty * 1.5;
      const maxLen = GAP_MAX_LEN + difficulty * 5.4;
      const len = this.rng.range(minLen, maxLen);
      const zStart = frontMargin + this.rng.range(0, data.length - frontMargin - backMargin - len);
      const zEnd = zStart + len;
      const conflict = data.gaps.some(
        (g) =>
          g.face === currentFace &&
          !(zEnd + spacing < g.zStart || zStart > g.zEnd + spacing),
      );
      if (conflict) continue;
      data.gaps.push({
        face: currentFace,
        laneMask: this.pickLaneMask(difficulty, isTeaching, placed, isCurrentFace),
        zStart,
        zEnd,
      });
      placed++;
    }
  }

  private pickLaneMask(
    difficulty: number,
    isTeaching: boolean,
    gapIndex: number,
    isCurrentFace: boolean,
  ): LaneMask {
    if (isTeaching && isCurrentFace) return this.rng.pick(TEACHING_MASKS);
    if (gapIndex === 0 && !isCurrentFace && this.rng.bool(0.35 + difficulty * 0.25)) {
      return this.rng.pick(ROTATION_MASKS);
    }
    if (gapIndex === 0 && this.rng.bool(0.2 + difficulty * 0.25)) {
      return this.rng.pick(ROTATION_MASKS);
    }
    if (difficulty > 0.45 && this.rng.bool(0.3 + difficulty * 0.2)) {
      return this.rng.pick(STANDARD_MASKS);
    }
    return this.rng.pick(TEACHING_MASKS);
  }
}
