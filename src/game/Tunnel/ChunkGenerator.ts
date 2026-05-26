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

const GAP_MIN_LEN = 2;
const GAP_MAX_LEN = 3.5;
const GAP_MIN_SPACING = 8;
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
    const baseCount = isTeaching ? 1 : this.rng.bool(0.45 + diff * 0.25) ? 2 : 1;
    const gapCount = this.rng.bool(0.15 + diff * 0.2) ? baseCount + 1 : baseCount;
    this.placeRandomGaps(data, opts.currentFace, gapCount, diff, isTeaching);
  }

  private placeRandomGaps(
    data: ChunkData,
    currentFace: FaceIndex,
    count: number,
    difficulty: number,
    isTeaching: boolean,
  ): void {
    const margin = data.zStart === 0 ? 10 : 4;
    let attempts = 0;
    let placed = 0;

    while (placed < count && attempts < count * 8) {
      attempts++;
      const len = GAP_MIN_LEN + this.rng.range(0, GAP_MAX_LEN - GAP_MIN_LEN);
      const zStart = margin + this.rng.range(0, data.length - margin * 2 - len);
      const zEnd = zStart + len;
      const conflict = data.gaps.some(
        (g) => !(zEnd + GAP_MIN_SPACING < g.zStart || zStart > g.zEnd + GAP_MIN_SPACING),
      );
      if (conflict) continue;
      data.gaps.push({
        face: currentFace,
        laneMask: this.pickLaneMask(difficulty, isTeaching, placed),
        zStart,
        zEnd,
      });
      placed++;
    }
  }

  private pickLaneMask(difficulty: number, isTeaching: boolean, gapIndex: number): LaneMask {
    if (isTeaching) return this.rng.pick(TEACHING_MASKS);
    if (gapIndex === 0 && this.rng.bool(0.2 + difficulty * 0.25)) {
      return this.rng.pick(ROTATION_MASKS);
    }
    if (difficulty > 0.45 && this.rng.bool(0.3 + difficulty * 0.2)) {
      return this.rng.pick(STANDARD_MASKS);
    }
    return this.rng.pick(TEACHING_MASKS);
  }
}
