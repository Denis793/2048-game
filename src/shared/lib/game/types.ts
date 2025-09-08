import type { Board } from '@entities/board/model/types';

export type Move = {
  from: [number, number];
  to: [number, number];
  value: number;
  merged?: boolean;
};

export type MoveResult = {
  board: Board;
  moved: boolean;
  gained: number;
  moves: Move[];
};
