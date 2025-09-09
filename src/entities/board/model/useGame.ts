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

/** Storage keys */
const SNAP_PREFIX = '2048:snapshot:'; // per-player snapshot
const snapKey = (playerId: string) => `${SNAP_PREFIX}${playerId}`;
const GLOBAL_BEST_KEY = '2048:bestGlobal'; // persistent global best (survives player deletion)

type Persisted = {
  board: Board;
  score: number;
  best: number;
  won: boolean; // whether the win modal is currently shown
  over: boolean;
  lastSpawn: Coord | null;
  history: { board: Board; score: number; won: boolean; over: boolean }[];
  reachedTarget: boolean; // set once when TARGET first reached; never re-triggers within same game
};

export function useGame(playerId: string) {
  /** Load persisted snapshot for current player (raw) */
  const persisted = useMemo(() => {
    try {
      const raw = localStorage.getItem(snapKey(playerId));
      return raw ? (JSON.parse(raw) as Partial<Persisted>) : null;
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  /** Game state */
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

  /** Theme */
  const [isDark, setIsDark] = useState<boolean>(() => localStorage.getItem(THEME_KEY) === 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  /** Helpers for GLOBAL BEST (ONLY from `best`) */
  const computeGlobalBest = useCallback(() => {
    let g = 0;

    const gb = Number(localStorage.getItem(GLOBAL_BEST_KEY) ?? 0);
    if (gb > g) g = gb;

    // scan snapshots (best only)
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

  /** Persist snapshot for the current player and refresh global best */
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

      // update global best ONLY from best
      bumpGlobalBest(snapshot.best);
      setBestGlobal(computeGlobalBest());
    },
    [board, score, best, won, over, lastSpawn, history, playerId, reachedTarget, bumpGlobalBest, computeGlobalBest]
  );

  /** when playerId or persisted snapshot changes, load it into state */
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

  /** Apply move */
  const applyMove = useCallback(
    (dir: Direction) => {
      if (over) return;
      const movers = { left: moveLeft, right: moveRight, up: moveUp, down: moveDown } as const;
      const { board: movedBoard, moved, gained, moves } = movers[dir](board);
      if (!moved) return;

      // remember previous state for undo (max 3)
      setHistory((h) => [{ board: board.map((r) => [...r]), score, won, over }, ...h].slice(0, 3));

      // animate ghost tiles
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
      // Show win only once per game:
      if (!reachedTarget && maxV >= TARGET) {
        setWon(true);
        setReachedTarget(true); // lock
      }
      if (!hasMoves(nb)) setOver(true);

      // persist
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

  /** New game (for current player only) */
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
    setReachedTarget(false); // reset one-time flag
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

  /** Continue after 2048 (do not re-open the win modal later) */
  const continueGame = useCallback(() => {
    setWon(false);
    // keep reachedTarget = true
    persistAll({ won: false, reachedTarget: true });
  }, [persistAll]);

  /** Undo */
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
      // keep reachedTarget as-is (it is a game-level latch)
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

  /** Reset ALL best results (every player + global). */
  const resetBest = useCallback(() => {
    // 1) zero out every snapshot's 'best'
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
    // 2) reset dedicated global key
    localStorage.setItem(GLOBAL_BEST_KEY, '0');

    // 3) update current state + persist snapshot of current player
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

  /** ---------- DEBUG UTILITIES ---------- */

  /** Replace entire board & recompute derived flags. */
  const debugSetBoard = useCallback(
    (next: Board) => {
      const nextScore = next.flat().reduce((a, v) => a + (v > 0 ? v : 0), 0);
      const maxV = maxTile(next);
      const nextReached = reachedTarget || maxV >= TARGET;
      setBoard(next);
      setScore(nextScore);
      setWon(!nextReached && maxV >= TARGET ? true : won); // if first reach occurs exactly now
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
    },
    [best, won, reachedTarget, persistAll]
  );

  /** Quick scenario: place two equal tiles to be merged on next move in given direction. */
  const debugQuickMerge = useCallback(
    (value: number, dir: Direction) => {
      // start from empty
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
    },
    [debugSetBoard]
  );

  return {
    board,
    score,
    best, // per-player best
    bestGlobal, // global best across all players (from 'best' only)
    won,
    over,
    lastSpawn,
    lastDir,
    isDark,
    applyMove,
    newGame,
    continueGame, // will not re-open the win modal later
    undo,
    resetBest, // resets ALL bests to 0
    toggleTheme,
    canUndo,
    animMoves,
    // DEBUG:
    debugSetBoard,
    debugQuickMerge,
  };
}
