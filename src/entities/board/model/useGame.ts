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
import { createDebugHelpers } from './debug';

/** Storage keys */
const SNAP_PREFIX = '2048:snapshot:';
const snapKey = (playerId: string) => `${SNAP_PREFIX}${playerId}`;
const GLOBAL_BEST_KEY = '2048:bestGlobal';

type Persisted = {
  board: Board;
  score: number;
  best: number;
  won: boolean;
  over: boolean;
  lastSpawn: Coord | null;
  history: { board: Board; score: number; won: boolean; over: boolean }[];
  reachedTarget: boolean;
};

export function useGame(playerId: string) {
  // Load persisted snapshot for current player (raw)
  const persisted = useMemo(() => {
    try {
      const raw = localStorage.getItem(snapKey(playerId));
      return raw ? (JSON.parse(raw) as Partial<Persisted>) : null;
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  // Game state
  const initialBoard = persisted?.board ?? createEmptyBoard(BOARD_SIZE);
  const [board, setBoard] = useState<Board>(initialBoard);
  const [score, setScore] = useState<number>(persisted?.score ?? 0);
  const [best, setBest] = useState<number>(persisted?.best ?? 0);
  const [won, setWon] = useState<boolean>(persisted?.won ?? false);
  const [over, setOver] = useState<boolean>(persisted?.over ?? false);
  const [lastSpawn, setLastSpawn] = useState<Coord | null>(persisted?.lastSpawn ?? null);
  const [history, setHistory] = useState<{ board: Board; score: number; won: boolean; over: boolean }[]>(
    () => persisted?.history ?? []
  );
  const [lastDir, setLastDir] = useState<Direction | null>(null);

  // One-time win flag per game (prevents re-opening the win modal)
  const [reachedTarget, setReachedTarget] = useState<boolean>(
    persisted?.reachedTarget ?? maxTile(initialBoard) >= TARGET
  );

  // Animation moves
  const [animMoves, setAnimMoves] = useState<Move[] | null>(null);

  // Theme
  const [isDark, setIsDark] = useState<boolean>(() => localStorage.getItem(THEME_KEY) === 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  // GLOBAL BEST (ONLY from `best`)
  const computeGlobalBest = useCallback(() => {
    let g = 0;
    const gb = Number(localStorage.getItem(GLOBAL_BEST_KEY) ?? 0);
    if (gb > g) g = gb;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(SNAP_PREFIX)) continue;
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const s = JSON.parse(raw) as Partial<Persisted>;
        const candidate = Number(s.best ?? 0);
        if (candidate > g) g = candidate;
      }
    } catch {
      /* ignore */
    }
    return g;
  }, []);

  const bumpGlobalBest = useCallback((candidateBest: number) => {
    const cur = Number(localStorage.getItem(GLOBAL_BEST_KEY) ?? 0);
    if (candidateBest > cur) {
      localStorage.setItem(GLOBAL_BEST_KEY, String(candidateBest));
    }
  }, []);

  const [bestGlobal, setBestGlobal] = useState<number>(() => computeGlobalBest());

  // Persist snapshot for the current player and refresh global best
  const persistAll = useCallback(
    (payload?: Partial<Persisted>) => {
      const snapshot: Persisted = {
        board,
        score,
        best,
        won,
        over,
        lastSpawn,
        history,
        reachedTarget,
        ...payload,
      } as Persisted;
      localStorage.setItem(snapKey(playerId), JSON.stringify(snapshot));
      bumpGlobalBest(snapshot.best);
      setBestGlobal(computeGlobalBest());
    },
    [board, score, best, won, over, lastSpawn, history, playerId, reachedTarget, bumpGlobalBest, computeGlobalBest]
  );

  // when playerId or persisted snapshot changes, load it into state
  useEffect(() => {
    if (persisted && persisted.board) {
      setBoard(persisted.board);
      setScore(persisted.score ?? 0);
      setBest(persisted.best ?? 0);
      setWon(persisted.won ?? false);
      setOver(persisted.over ?? false);
      setLastSpawn(persisted.lastSpawn ?? null);
      setHistory(persisted.history ?? []);
      setReachedTarget(persisted.reachedTarget ?? maxTile(persisted.board) >= TARGET);
      setLastDir(null);
      setAnimMoves(null);
    } else {
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
      setReachedTarget(maxTile(b2.board) >= TARGET);
      setLastDir(null);
      setAnimMoves(null);
      localStorage.setItem(
        snapKey(playerId),
        JSON.stringify({
          board: b2.board,
          score: 0,
          best: 0,
          won: false,
          over: false,
          lastSpawn: b2.pos,
          history: [],
          reachedTarget: maxTile(b2.board) >= TARGET,
        } satisfies Persisted)
      );
    }
    setBestGlobal(computeGlobalBest());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  // Apply move
  const applyMove = useCallback(
    (dir: Direction) => {
      if (over) return;
      const movers = { left: moveLeft, right: moveRight, up: moveUp, down: moveDown } as const;
      const { board: movedBoard, moved, gained, moves } = movers[dir](board);
      if (!moved) return;

      setHistory((h) => [{ board: board.map((r) => [...r]), score, won, over }, ...h].slice(0, 3));

      if (moves && moves.length) {
        setAnimMoves(moves);
        window.setTimeout(() => setAnimMoves(null), 180);
      }

      let nb = movedBoard;
      const ns = score + gained;
      const spawned = addRandomTile(nb);
      nb = spawned.board;

      setBoard(nb);
      setScore(ns);
      setLastSpawn(spawned.pos);
      setLastDir(dir);

      if (ns > best) setBest(ns);

      const maxV = maxTile(nb);
      if (!reachedTarget && maxV >= TARGET) {
        setWon(true);
        setReachedTarget(true);
      }
      if (!hasMoves(nb)) setOver(true);

      persistAll({
        board: nb,
        score: ns,
        best: Math.max(best, ns),
        lastSpawn: spawned.pos,
        won: won || (!reachedTarget && maxV >= TARGET),
        reachedTarget: reachedTarget || maxV >= TARGET,
        over,
      });
    },
    [board, score, best, won, over, reachedTarget, persistAll]
  );

  // New game (for current player only)
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
    setReachedTarget(false);
    setLastDir(null);
    setAnimMoves(null);
    persistAll({
      board: b2.board,
      score: 0,
      lastSpawn: b2.pos,
      won: false,
      over: false,
      reachedTarget: false,
    });
  }, [persistAll]);

  // Continue after 2048 (do not re-open the win modal later)
  const continueGame = useCallback(() => {
    setWon(false);
    persistAll({ won: false, reachedTarget: true });
  }, [persistAll]);

  // Undo
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
      setAnimMoves(null);
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

  // Reset ALL best results (every player + global).
  const resetBest = useCallback(() => {
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
    localStorage.setItem(GLOBAL_BEST_KEY, '0');
    setBest(0);
    setBestGlobal(0);
    persistAll({ best: 0 });
  }, [persistAll]);

  const toggleTheme = useCallback(() => setIsDark((v) => !v), []);
  const canUndo = history.length > 0;

  // Keyboard (arrows only)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) {
        e.preventDefault();
        const dirMap: Record<string, Direction> = {
          arrowleft: 'left',
          arrowright: 'right',
          arrowup: 'up',
          arrowdown: 'down',
        };
        applyMove(dirMap[k]);
      }
    };
    window.addEventListener('keydown', onKey, { passive: false } as unknown as AddEventListenerOptions);
    return () => window.removeEventListener('keydown', onKey as any);
  }, [applyMove]);

  // ---- Attach debug helpers from separate module ----
  const { debugSetBoard, debugQuickMerge } = createDebugHelpers({
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
  });

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

    debugSetBoard,
    debugQuickMerge,
  };
}
