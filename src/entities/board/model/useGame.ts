import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addRandomTile,
  createEmptyBoard,
  hasMoves,
  maxTile,
  moveDown,
  moveLeft,
  moveRight,
  moveUp,
} from '@shared/lib/game';
import { BOARD_SIZE, TARGET, THEME_KEY } from '@shared/config';
import type { Board, Coord, Direction } from './types';
import type { Move } from '@shared/lib/game/types';

const SNAP_PREFIX = '2048:snapshot:';
const snapKey = (playerId: string) => `${SNAP_PREFIX}${playerId}`;

type HistoryItem = { board: Board; score: number; won: boolean; over: boolean };

type Persisted = {
  board: Board;
  score: number;
  best: number;
  won: boolean;
  over: boolean;
  lastSpawn: Coord | null;
  history: HistoryItem[];
};

export function useGame(playerId: string) {
  const persisted = useMemo(() => {
    try {
      const raw = localStorage.getItem(snapKey(playerId));
      return raw ? (JSON.parse(raw) as Persisted) : null;
    } catch {
      return null;
    }
  }, [playerId]);

  const [board, setBoard] = useState<Board>(() => persisted?.board ?? createEmptyBoard(BOARD_SIZE));
  const [score, setScore] = useState<number>(() => persisted?.score ?? 0);
  const [best, setBest] = useState<number>(() => persisted?.best ?? 0);
  const [won, setWon] = useState<boolean>(() => persisted?.won ?? false);
  const [over, setOver] = useState<boolean>(() => persisted?.over ?? false);
  const [lastSpawn, setLastSpawn] = useState<Coord | null>(() => persisted?.lastSpawn ?? null);
  const [history, setHistory] = useState<HistoryItem[]>(() => persisted?.history ?? []);
  const [lastDir, setLastDir] = useState<Direction | null>(null);

  /** Animation moves passed to GameBoard for smooth movement */
  const [animMoves, setAnimMoves] = useState<Move[] | null>(null);

  /** Theme */
  const [isDark, setIsDark] = useState<boolean>(() => {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'dark';
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  /** Compute GLOBAL best by scanning all players' snapshots */
  const computeGlobalBest = useCallback((): number => {
    let global = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(SNAP_PREFIX)) continue;
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const s = JSON.parse(raw) as Partial<Persisted>;
        const candidate = Math.max(Number(s.best ?? 0), Number(s.score ?? 0));
        if (candidate > global) global = candidate;
      }
    } catch {}
    return global;
  }, []);
  const [bestGlobal, setBestGlobal] = useState<number>(() => computeGlobalBest());

  /** Persist current player's snapshot and refresh global best */
  const persistAll = useCallback(
    (patch?: Partial<Persisted>) => {
      const snap: Persisted = {
        board,
        score,
        best,
        won,
        over,
        lastSpawn,
        history,
        ...patch,
      };
      localStorage.setItem(snapKey(playerId), JSON.stringify(snap));
      setBestGlobal(computeGlobalBest());
    },
    [board, score, best, won, over, lastSpawn, history, playerId, computeGlobalBest]
  );

  /** Initialize a new game if there is no snapshot for this player */
  useEffect(() => {
    if (!persisted) {
      let b = createEmptyBoard(BOARD_SIZE);
      b = addRandomTile(b).board;
      const b2 = addRandomTile(b);
      setBoard(b2.board);
      setLastSpawn(b2.pos);
      setScore(0);
      setBest(0);
      setWon(false);
      setOver(false);
      setHistory([]);
      setLastDir(null);
      persistAll({
        board: b2.board,
        score: 0,
        best: 0,
        won: false,
        over: false,
        lastSpawn: b2.pos,
        history: [],
      });
    } else {
      // refresh global best when player changes
      setBestGlobal(computeGlobalBest());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  /** Apply move in given direction */
  const applyMove = useCallback(
    (dir: Direction) => {
      if (over) return;
      const movers = { left: moveLeft, right: moveRight, up: moveUp, down: moveDown } as const;
      const { board: movedBoard, moved, gained, moves } = movers[dir](board);
      if (!moved) return;

      setHistory((h) => [{ board: board.map((r) => [...r]), score, won, over }, ...h].slice(0, 3));
      setAnimMoves(moves);
      window.setTimeout(() => setAnimMoves(null), 180);

      let nb = movedBoard;
      const ns = score + gained;
      const spawned = addRandomTile(nb);
      nb = spawned.board;

      setBoard(nb);
      setScore(ns);
      setLastSpawn(spawned.pos);
      setLastDir(dir);

      const nextBest = Math.max(best, ns);
      if (nextBest !== best) setBest(nextBest);

      if (!won && maxTile(nb) >= TARGET) setWon(true);
      if (!hasMoves(nb)) setOver(true);

      persistAll({
        board: nb,
        score: ns,
        best: nextBest,
        lastSpawn: spawned.pos,
      });
    },
    [board, score, best, won, over, persistAll]
  );

  /** Start a brand new board but keep player's best */
  const newGame = useCallback(() => {
    let b = createEmptyBoard(BOARD_SIZE);
    b = addRandomTile(b).board;
    const b2 = addRandomTile(b);
    setBoard(b2.board);
    setLastSpawn(b2.pos);
    setScore(0);
    setWon(false);
    setOver(false);
    setHistory([]);
    setLastDir(null);
    persistAll({
      board: b2.board,
      score: 0,
      won: false,
      over: false,
      lastSpawn: b2.pos,
      history: [],
    });
  }, [persistAll]);

  /** Continue playing after reaching TARGET (remove win overlay) */
  const continueGame = useCallback(() => {
    if (won) {
      setWon(false);
      persistAll({ won: false });
    }
  }, [won, persistAll]);

  /** Undo one step (max 3 steps kept) */
  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const [prev, ...rest] = h;
      setBoard(prev.board);
      setScore(prev.score);
      setWon(prev.won);
      setOver(prev.over);
      setLastSpawn(null);
      setLastDir(null);
      persistAll({
        board: prev.board,
        score: prev.score,
        won: prev.won,
        over: prev.over,
        lastSpawn: null,
        history: rest,
      });
      return rest;
    });
  }, [persistAll]);

  const resetBest = useCallback(
    (scope: 'current' | 'all' = 'all') => {
      if (scope === 'current') {
        setBest(0);
        persistAll({ best: 0 });
        return;
      }
      // reset ALL players' bests
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(SNAP_PREFIX)) continue;
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
          const s = JSON.parse(raw) as Persisted;
          s.best = 0;
          localStorage.setItem(k, JSON.stringify(s));
        } catch {
          /* ignore */
        }
      }
      setBest(0);
      setBestGlobal(computeGlobalBest());
      persistAll({ best: 0 });
    },
    [persistAll, computeGlobalBest]
  );

  /** Arrows-only keyboard control (WASD disabled so input fields work) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'arrowright' || k === 'arrowup' || k === 'arrowdown') {
        e.preventDefault();
        const map: Record<string, Direction> = {
          arrowleft: 'left',
          arrowright: 'right',
          arrowup: 'up',
          arrowdown: 'down',
        };
        applyMove(map[k]);
      }
    };
    const opts: AddEventListenerOptions = { passive: false };
    window.addEventListener('keydown', onKey, opts);
    return () => window.removeEventListener('keydown', onKey, opts);
  }, [applyMove]);

  const toggleTheme = useCallback(() => setIsDark((v) => !v), []);
  const canUndo = history.length > 0;

  return {
    board,
    score,
    best,
    bestGlobal,
    won,
    over,
    lastSpawn,
    lastDir,
    isDark,

    applyMove,
    newGame,
    continueGame,
    undo,
    resetBest,
    toggleTheme,

    canUndo,
    animMoves,
  };
}
