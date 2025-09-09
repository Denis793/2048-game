import { createEmptyBoard, hasMoves, maxTile } from '@shared/lib/game';
import type { Board, Direction } from './types';
import { TARGET } from '@shared/config';

export type DebugDeps = {
  setBoard: (b: Board) => void;
  setScore: (n: number) => void;
  setWon: (v: boolean) => void;
  setOver: (v: boolean) => void;
  setLastSpawn: (v: [number, number] | null) => void;
  setLastDir: (v: Direction | null) => void;
  setHistory: (h: { board: Board; score: number; won: boolean; over: boolean }[]) => void;
  setReachedTarget: (v: boolean) => void;

  best: number;
  won: boolean;
  reachedTarget: boolean;

  persistAll: (
    payload?: Partial<{
      board: Board;
      score: number;
      best: number;
      won: boolean;
      over: boolean;
      lastSpawn: [number, number] | null;
      history: { board: Board; score: number; won: boolean; over: boolean }[];
      reachedTarget: boolean;
    }>
  ) => void;
};

export function createDebugHelpers(deps: DebugDeps) {
  const {
    setBoard,
    setScore,
    setWon,
    setOver,
    setLastSpawn,
    setLastDir,
    setHistory,
    setReachedTarget,
    best,
    won,
    reachedTarget,
    persistAll,
  } = deps;

  const debugSetBoard = (next: Board) => {
    const nextScore = next.flat().reduce((a, v) => a + (v > 0 ? v : 0), 0);
    const maxV = maxTile(next);
    const nextReached = reachedTarget || maxV >= TARGET;

    setBoard(next);
    setScore(nextScore);
    setWon(!nextReached && maxV >= TARGET ? true : won);
    setOver(!hasMoves(next));
    setLastSpawn(null);
    setLastDir(null);
    setHistory([]);
    setReachedTarget(nextReached);

    persistAll({
      board: next,
      score: nextScore,
      won: !nextReached && maxV >= TARGET ? true : won,
      over: !hasMoves(next),
      lastSpawn: null,
      history: [],
      reachedTarget: nextReached,
      best: Math.max(best, nextScore),
    });
  };

  const debugQuickMerge = (value: number, dir: Direction) => {
    const b = createEmptyBoard(4);
    if (dir === 'left') {
      b[0][0] = value;
      b[0][1] = value;
    } else if (dir === 'right') {
      b[0][3] = value;
      b[0][2] = value;
    } else if (dir === 'up') {
      b[0][0] = value;
      b[1][0] = value;
    } else {
      b[3][0] = value;
      b[2][0] = value;
    }
    debugSetBoard(b);
  };

  return { debugSetBoard, debugQuickMerge };
}
