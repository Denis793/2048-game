import { describe, it, expect } from 'vitest';
import { moveLeft, moveRight, moveUp, moveDown, hasMoves, maxTile } from '@/shared/lib/game';
import type { Board } from '@/entities/board/model/types';

describe('moveLeft', () => {
  it('merges equal neighbors once', () => {
    const start: Board = [
      [2, 2, 4, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const res = moveLeft(start);
    expect(res.board[0]).toEqual([4, 4, 0, 0]);
    expect(res.gained).toBe(4);
  });
});

describe('movement logic', () => {
  it('moveRight mirrors moveLeft', () => {
    const start: Board = [
      [2, 2, 4, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const r = moveRight(start);
    expect(r.board[0]).toEqual([0, 0, 4, 4]);
  });

  it('no double-merge in single move', () => {
    const start: Board = [
      [2, 2, 2, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const l = moveLeft(start);
    expect(l.board[0]).toEqual([4, 4, 0, 0]);
    expect(l.gained).toBe(8);
  });

  it('moveUp merges columns', () => {
    const start: Board = [
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const u = moveUp(start);
    expect(u.board[0][0]).toBe(4);
    expect(u.board[1][0]).toBe(0);
  });

  it('moveDown merges columns', () => {
    const start: Board = [
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const d = moveDown(start);
    expect(d.board[3][0]).toBe(4);
    expect(d.board[2][0]).toBe(0);
  });

  it('hasMoves false on full blocked board', () => {
    const full: Board = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];
    expect(hasMoves(full)).toBe(false);
  });

  it('maxTile returns highest number', () => {
    const b: Board = [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [512, 1024, 2048, 0],
      [0, 0, 0, 0],
    ];
    expect(maxTile(b)).toBe(2048);
  });
});
