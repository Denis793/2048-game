import type { Board } from '@entities/board/model/types';
import { BOARD_SIZE } from '@shared/config';
import type { Move, MoveResult } from './types';

export const createEmptyBoard = (size = BOARD_SIZE): Board => Array.from({ length: size }, () => Array(size).fill(0));
export const copyBoard = (b: Board): Board => b.map((row) => [...row]);

function slideAndCombineRowLeftWithMoves(
  row: number[],
  rowIndex: number,
  size = BOARD_SIZE
): { newRow: number[]; gained: number; moved: boolean; moves: Move[] } {
  const nonZero: Array<{ v: number; c: number }> = [];
  for (let c = 0; c < row.length; c++) if (row[c] !== 0) nonZero.push({ v: row[c], c });

  const moves: Move[] = [];
  let gained = 0;
  const out: number[] = [];
  let writeCol = 0;

  for (let i = 0; i < nonZero.length; i++) {
    const cur = nonZero[i];

    if (i + 1 < nonZero.length && cur.v === nonZero[i + 1].v) {
      const sum = cur.v * 2;
      out.push(sum);
      gained += sum;

      moves.push({
        from: [rowIndex, cur.c] as [number, number],
        to: [rowIndex, writeCol] as [number, number],
        value: cur.v,
        merged: true,
      });
      moves.push({
        from: [rowIndex, nonZero[i + 1].c] as [number, number],
        to: [rowIndex, writeCol] as [number, number],
        value: cur.v,
        merged: true,
      });

      writeCol++;
      i++;
    } else {
      out.push(cur.v);
      moves.push({
        from: [rowIndex, cur.c] as [number, number],
        to: [rowIndex, writeCol] as [number, number],
        value: cur.v,
      });
      writeCol++;
    }
  }

  while (out.length < size) out.push(0);

  const moved = !out.every((v, c) => v === row[c]);
  return { newRow: out, gained, moved, moves };
}

export const moveLeft = (b: Board): MoveResult => {
  let moved = false;
  let gained = 0;
  const allMoves: Move[] = [];

  const out = b.map((row, r) => {
    const { newRow, gained: g, moved: m, moves } = slideAndCombineRowLeftWithMoves(row, r, b.length);
    if (m) moved = true;
    gained += g;
    allMoves.push(...moves);
    return newRow;
  });

  return { board: out, moved, gained, moves: allMoves };
};

const reverseRows = (b: Board): Board => b.map((row) => [...row].reverse());

const transpose = (b: Board): Board => {
  const size = b.length;
  const out = createEmptyBoard(size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      out[r][c] = b[c][r];
    }
  }
  return out;
};

export const moveRight = (b: Board): MoveResult => {
  const reversed = reverseRows(b);
  const left = moveLeft(reversed);
  const size = b.length;

  const fixMoves: Move[] = left.moves.map((m) => ({
    ...m,
    from: [m.from[0], size - 1 - m.from[1]] as [number, number],
    to: [m.to[0], size - 1 - m.to[1]] as [number, number],
  }));

  return {
    board: reverseRows(left.board),
    moved: left.moved,
    gained: left.gained,
    moves: fixMoves,
  };
};

export const moveUp = (b: Board): MoveResult => {
  const t = transpose(b);
  const left = moveLeft(t);

  const fixMoves: Move[] = left.moves.map((m) => ({
    ...m,
    from: [m.from[1], m.from[0]] as [number, number],
    to: [m.to[1], m.to[0]] as [number, number],
  }));

  return {
    board: transpose(left.board),
    moved: left.moved,
    gained: left.gained,
    moves: fixMoves,
  };
};

export const moveDown = (b: Board): MoveResult => {
  const t = transpose(b);
  const right = moveRight(t);

  const fixMoves: Move[] = right.moves.map((m) => ({
    ...m,
    from: [m.from[1], m.from[0]] as [number, number],
    to: [m.to[1], m.to[0]] as [number, number],
  }));

  return {
    board: transpose(right.board),
    moved: right.moved,
    gained: right.gained,
    moves: fixMoves,
  };
};

export const addRandomTile = (b: Board): { board: Board; pos: [number, number] | null } => {
  const empties: Array<[number, number]> = [];
  for (let r = 0; r < b.length; r++) {
    for (let c = 0; c < b.length; c++) {
      if (b[r][c] === 0) empties.push([r, c]);
    }
  }
  if (empties.length === 0) return { board: b, pos: null };
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  const val = Math.random() < 0.9 ? 2 : 4;
  const nb = copyBoard(b);
  nb[r][c] = val;
  return { board: nb, pos: [r, c] };
};

export const hasMoves = (b: Board): boolean => {
  for (let r = 0; r < b.length; r++) {
    for (let c = 0; c < b.length; c++) {
      if (b[r][c] === 0) return true;
    }
  }
  for (let r = 0; r < b.length; r++) {
    for (let c = 0; c < b.length; c++) {
      if (r + 1 < b.length && b[r][c] === b[r + 1][c]) return true;
      if (c + 1 < b.length && b[r][c] === b[r][c + 1]) return true;
    }
  }
  return false;
};

export const maxTile = (b: Board): number => Math.max(...b.flat());
