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
import { BOARD_SIZE, TARGET, THEME_KEY, getPlayerKeys } from '@shared/config';
import type { Board, Coord, Direction } from './types';
import type { Move } from '@shared/lib/game/types';

const ANIM_MS = 150;

type Persisted = {
  board: Board;
  score: number;
  won: boolean;
  everWon: boolean;
  over: boolean;
  lastSpawn: Coord | null;
  history: { board: Board; score: number; won: boolean; over: boolean }[];
};

function loadPersist(playerId: string): Persisted | null {
  try {
    const k = getPlayerKeys(playerId).persist;
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

export function useGame(playerId: string) {
  // theme remains global
  const [isDark, setIsDark] = useState<boolean>(() => localStorage.getItem(THEME_KEY) === 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  const keys = useMemo(() => getPlayerKeys(playerId), [playerId]);
  const persisted = useMemo(() => loadPersist(playerId), [playerId]);

  // core state (per player)
  const [board, setBoard] = useState<Board>(() => persisted?.board ?? createEmptyBoard(BOARD_SIZE));
  const [score, setScore] = useState<number>(() => persisted?.score ?? 0);
  const [best, setBest] = useState<number>(() => Number(localStorage.getItem(keys.best) ?? 0));
  const [won, setWon] = useState<boolean>(() => persisted?.won ?? false);
  const [everWon, setEverWon] = useState<boolean>(() => persisted?.everWon ?? false);
  const [over, setOver] = useState<boolean>(() => persisted?.over ?? false);
  const [lastSpawn, setLastSpawn] = useState<Coord | null>(() => persisted?.lastSpawn ?? null);
  const [history, setHistory] = useState<{ board: Board; score: number; won: boolean; over: boolean }[]>(
    () => persisted?.history ?? []
  );
  const [lastDir, setLastDir] = useState<Direction | null>(null);

  // animation
  const [animMoves, setAnimMoves] = useState<Move[] | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // re-hydrate when player changes
  useEffect(() => {
    setBoard(persisted?.board ?? createEmptyBoard(BOARD_SIZE));
    setScore(persisted?.score ?? 0);
    setBest(Number(localStorage.getItem(keys.best) ?? 0));
    setWon(persisted?.won ?? false);
    setEverWon(persisted?.everWon ?? false);
    setOver(persisted?.over ?? false);
    setLastSpawn(persisted?.lastSpawn ?? null);
    setHistory(persisted?.history ?? []);
    setLastDir(null);
    setAnimMoves(null);
    setIsAnimating(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const persistAll = useCallback(
    (payload?: Partial<Persisted>) => {
      const snapshot: Persisted = {
        board,
        score,
        won,
        everWon,
        over,
        lastSpawn,
        history,
        ...payload,
      };
      localStorage.setItem(keys.persist, JSON.stringify(snapshot));
    },
    [board, score, won, everWon, over, lastSpawn, history, keys.persist]
  );

  // init new board if none saved for this player
  useEffect(() => {
    if (!persisted) newGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const applyMove = useCallback(
    (dir: Direction) => {
      if (over || won || isAnimating) return;

      const movers = { left: moveLeft, right: moveRight, up: moveUp, down: moveDown } as const;
      const { board: movedBoard, moved, gained, moves } = movers[dir](board);
      if (!moved) return;

      setHistory((h) => [{ board: board.map((r) => [...r]), score, won, over }, ...h].slice(0, 3));

      setIsAnimating(true);
      setAnimMoves(moves);
      setLastDir(dir);

      window.setTimeout(() => {
        let nb = movedBoard;
        const ns = score + gained;
        const spawned = addRandomTile(nb);
        nb = spawned.board;

        setBoard(nb);
        setScore(ns);
        setLastSpawn(spawned.pos);
        setAnimMoves(null);
        setIsAnimating(false);

        if (ns > best) {
          setBest(ns);
          localStorage.setItem(keys.best, String(ns));
        }

        const maxV = maxTile(nb);
        if (!everWon && maxV >= TARGET) {
          setWon(true);
          setEverWon(true);
          persistAll({ board: nb, score: ns, lastSpawn: spawned.pos, won: true, everWon: true, over });
          return;
        }

        if (!hasMoves(nb)) setOver(true);
        persistAll({ board: nb, score: ns, lastSpawn: spawned.pos, won, everWon, over });
      }, ANIM_MS);
    },
    [board, score, best, won, everWon, over, isAnimating, keys.best, persistAll]
  );

  const continueGame = useCallback(() => {
    setWon(false);
    persistAll({ won: false });
  }, [persistAll]);

  const newGame = useCallback(() => {
    let b = createEmptyBoard(BOARD_SIZE);
    b = addRandomTile(b).board;
    const b2 = addRandomTile(b);

    setBoard(b2.board);
    setLastSpawn(b2.pos);
    setScore(0);
    setWon(false);
    setEverWon(false);
    setOver(false);
    setHistory([]);
    setLastDir(null);
    setAnimMoves(null);
    setIsAnimating(false);

    persistAll({
      board: b2.board,
      score: 0,
      won: false,
      everWon: false,
      over: false,
      lastSpawn: b2.pos,
      history: [],
    });
  }, [persistAll]);

  const undo = useCallback(() => {
    if (isAnimating) return;
    setHistory((h) => {
      if (h.length === 0) return h;
      const [prev, ...rest] = h;
      setBoard(prev.board);
      setScore(prev.score);
      setWon(prev.won);
      setOver(prev.over);
      setLastSpawn(null);
      setLastDir(null);
      const next: Persisted = {
        board: prev.board,
        score: prev.score,
        won: prev.won,
        everWon,
        over: prev.over,
        lastSpawn: null,
        history: rest,
      };
      localStorage.setItem(keys.persist, JSON.stringify(next));
      return rest;
    });
  }, [isAnimating, everWon, keys.persist]);

  const resetBest = useCallback(() => {
    localStorage.removeItem(keys.best);
    setBest(0);
  }, [keys.best]);

  const toggleTheme = useCallback(() => setIsDark((v) => !v), []);

  const canUndo = history.length > 0;

  /** Keyboard controls: ONLY arrow keys. Ignore when focus is in an editable field. */
  useEffect(() => {
    const isEditableTarget = (el: EventTarget | null): boolean => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (node as HTMLElement).isContentEditable) return true;
      return false;
    };

    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          applyMove('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          applyMove('right');
          break;
        case 'ArrowUp':
          e.preventDefault();
          applyMove('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          applyMove('down');
          break;
        default:
          // WASD and other keys are ignored
          break;
      }
    };

    window.addEventListener('keydown', onKey, { passive: false });
    return () => window.removeEventListener('keydown', onKey);
  }, [applyMove]);

  return {
    // state
    board,
    score,
    best,
    won,
    everWon,
    over,
    lastSpawn,
    lastDir,
    isDark,
    animMoves,
    isAnimating,

    // actions
    applyMove,
    newGame,
    undo,
    resetBest,
    toggleTheme,
    continueGame,

    // ui
    canUndo,
  };
}
