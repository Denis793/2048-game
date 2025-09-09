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
  won: boolean;
  over: boolean;
  lastSpawn: Coord | null;
  history: { board: Board; score: number; won: boolean; over: boolean }[];
};

export function useGame(playerId: string) {
  /** Load persisted snapshot for current player (raw) */
  const persisted = useMemo(() => {
    try {
      const raw = localStorage.getItem(snapKey(playerId));
      return raw ? (JSON.parse(raw) as Persisted) : null;
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  /** Game state */
  const [board, setBoard] = useState<Board>(() => persisted?.board ?? createEmptyBoard(BOARD_SIZE));
  const [score, setScore] = useState<number>(() => persisted?.score ?? 0);
  const [best, setBest] = useState<number>(() => persisted?.best ?? 0);
  const [won, setWon] = useState<boolean>(() => persisted?.won ?? false);
  const [over, setOver] = useState<boolean>(() => persisted?.over ?? false);
  const [lastSpawn, setLastSpawn] = useState<Coord | null>(() => persisted?.lastSpawn ?? null);
  const [history, setHistory] = useState<{ board: Board; score: number; won: boolean; over: boolean }[]>(
    () => persisted?.history ?? []
  );
  const [lastDir, setLastDir] = useState<Direction | null>(null);

  // Animation moves
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

  /** Helpers for GLOBAL BEST */
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
        const candidate = Math.max(Number(s.best ?? 0), Number(s.score ?? 0));
        if (candidate > g) g = candidate;
      }
    } catch {
      /* ignore parse errors */
    }
    return g;
  }, []);

  const bumpGlobalBest = useCallback((candidate: number) => {
    const cur = Number(localStorage.getItem(GLOBAL_BEST_KEY) ?? 0);
    if (candidate > cur) {
      localStorage.setItem(GLOBAL_BEST_KEY, String(candidate));
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
        ...payload,
      };
      localStorage.setItem(snapKey(playerId), JSON.stringify(snapshot));

      // keep dedicated global best up to date
      bumpGlobalBest(Math.max(snapshot.best, snapshot.score));
      setBestGlobal(computeGlobalBest());
    },
    [board, score, best, won, over, lastSpawn, history, playerId, bumpGlobalBest, computeGlobalBest]
  );

  /** ▼ IMPORTANT: when playerId or persisted snapshot changes, load it into state */
  useEffect(() => {
    if (persisted) {
      setBoard(persisted.board);
      setScore(persisted.score);
      setBest(persisted.best);
      setWon(persisted.won);
      setOver(persisted.over);
      setLastSpawn(persisted.lastSpawn);
      setHistory(persisted.history);
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
        } satisfies Persisted)
      );
    }
    // also refresh global best on player switch
    setBestGlobal(computeGlobalBest());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, persisted]);

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
      if (!won && maxV >= TARGET) setWon(true);
      if (!hasMoves(nb)) setOver(true);

      persistAll({ board: nb, score: ns, best: Math.max(best, ns), lastSpawn: spawned.pos, won, over });
    },
    [board, score, best, won, over, persistAll]
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
    setLastDir(null);
    setAnimMoves(null);
    persistAll({
      board: b2.board,
      score: 0,
      lastSpawn: b2.pos,
      won: false,
      over: false,
    });
  }, [persistAll]);

  /** Continue after 2048 */
  const continueGame = useCallback(() => {
    setWon(false);
    persistAll({ won: false });
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
      // reset global key
      localStorage.setItem(GLOBAL_BEST_KEY, '0');

      setBest(0);
      setBestGlobal(0);
      persistAll({ best: 0 });
    },
    [persistAll]
  );

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
