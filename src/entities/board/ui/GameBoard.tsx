import React, { useEffect, useRef, useState } from 'react';
import type { Board, Coord, Direction } from '@entities/board/model/types';
import type { Move } from '@shared/lib/game/types';
import { tileClasses, digitColorClass } from '@shared/ui/tileClasses';

/** Snap a coordinate to device pixels to avoid subpixel blur/diagonal drift. */
const snapPx = (v: number): number => {
  const dpr = window.devicePixelRatio || 1;
  return Math.round(v * dpr) / dpr;
};

/** Build a pixel-perfect translate for a grid cell using current tile/gap sizes. */
const toPxTransform = (r: number, c: number, tile: number, gap: number): string => {
  const step = tile + gap;
  const x = snapPx(c * step);
  const y = snapPx(r * step);
  return `translate3d(${x}px, ${y}px, 0)`;
};

/**
 * Animated "ghost" tile that slides from -> to.
 * - First frame: set FROM without transition (prevents initial jump).
 * - Next frames: enable transition and set TO -> smooth single-axis motion.
 * - Transform uses translate3d(px) with DPR snapping.
 */
function AnimatedTile({ move, tile, gap }: { move: Move; tile: number; gap: number }) {
  const elRef = useRef<HTMLDivElement | null>(null);

  const from = toPxTransform(move.from[0], move.from[1], tile, gap);
  const to = toPxTransform(move.to[0], move.to[1], tile, gap);

  const [run, setRun] = useState(false);
  const [transform, setTransform] = useState(from);

  useEffect(() => {
    setRun(false);
    setTransform(from);

    const node = elRef.current;
    if (node) void node.getBoundingClientRect();

    const id1 = requestAnimationFrame(() => {
      setRun(true);
      const id2 = requestAnimationFrame(() => {
        setTransform(to);
      });
      return () => cancelAnimationFrame(id2);
    });

    return () => cancelAnimationFrame(id1);
  }, [from, to]);

  const numCls =
    move.value >= 1024 ? 'tile-num tile-num--huge' : move.value >= 128 ? 'tile-num tile-num--big' : 'tile-num';

  const numColor = digitColorClass(move.value);
  const bg = tileClasses(move.value);
  const mergeFx = move.merged ? 'merge-glow' : '';

  return (
    <div ref={elRef} className={`anim-tile ${bg} ${mergeFx} ${run ? 'anim-run' : ''}`} style={{ transform }}>
      <span className={`${numCls} ${numColor} text-shadow-md`}>{move.value}</span>
    </div>
  );
}

/**
 * GameBoard view:
 * - Static 4×4 grid rendered with CSS variables (--tile, --gap).
 * - "Stage" container ensures animation layer and grid share the same origin.
 * - Touch swipe support calls onKeyDir with a Direction.
 */
export function GameBoard(props: {
  board: Board;
  lastSpawn: Coord | null;
  lastDir: Direction | null;
  won: boolean;
  over: boolean;
  onNewGame: () => void;
  onUndo: () => void;
  onContinue?: () => void;
  onKeyDir: (d: Direction) => void;
  animMoves?: Move[] | null;
}) {
  const { board, lastSpawn, won, over, onNewGame, onUndo, onContinue, onKeyDir, animMoves } = props;

  // Read current CSS var values in px to calculate transforms.
  const [sizes, setSizes] = useState<{ tile: number; gap: number }>({ tile: 96, gap: 12 });
  useEffect(() => {
    const read = () => {
      const rs = getComputedStyle(document.documentElement);
      const t = parseFloat(rs.getPropertyValue('--tile')) || 96;
      const g = parseFloat(rs.getPropertyValue('--gap')) || 12;
      setSizes({ tile: t, gap: g });
    };
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);

  // Touch swipe detection
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    const t = e.changedTouches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    const TH = 24;
    if (ax < TH && ay < TH) return;
    if (ax > ay) onKeyDir(dx > 0 ? 'right' : 'left');
    else onKeyDir(dy > 0 ? 'down' : 'up');
    touchStart.current = null;
  };

  return (
    <div
      className="relative rounded-2xl p-3 select-none
                 bg-neutral-200/80 dark:bg-neutral-700/60 inline-block"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Stage: exact board size via CSS vars; both layers share (0,0) */}
      <div className="board-stage mx-auto">
        {/* Static grid */}
        <div className="board absolute left-0 top-0" role="grid" aria-label="4 by 4 2048 board">
          {board.map((row, r) =>
            row.map((val, c) => {
              const isNew = lastSpawn && lastSpawn[0] === r && lastSpawn[1] === c;

              const numSize =
                val >= 1024 ? 'tile-num tile-num--huge' : val >= 128 ? 'tile-num tile-num--big' : 'tile-num';
              const numColor = digitColorClass(val);

              return (
                <div key={`${r}-${c}`} role="gridcell" className="relative">
                  <div className={`${tileClasses(val)} ${isNew ? 'pop' : ''}`}>
                    {val !== 0 ? (
                      <span className={`${numSize} ${numColor} text-shadow-md`}>{val}</span>
                    ) : (
                      <span className="opacity-0">0</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Animation layer aligned to the same origin */}
        {animMoves && animMoves.length > 0 && (
          <div className="anim-layer absolute left-0 top-0 z-20">
            {animMoves.map((m, i) => (
              <AnimatedTile key={i} move={m} tile={sizes.tile} gap={sizes.gap} />
            ))}
          </div>
        )}
      </div>

      {(won || over) && (
        <div
          className="absolute inset-0 rounded-2xl grid place-items-center
                        bg-white/80 dark:bg-black/40 backdrop-blur-[2px]"
        >
          <div className="text-center">
            <div className="text-3xl font-black mb-2">{won ? 'You win!' : 'Game over'}</div>
            <div className="text-sm text-neutral-700 dark:text-neutral-200 mb-3">
              {won ? 'Reach higher tiles?' : 'Try again?'}
            </div>
            <div className="flex items-center justify-center gap-2">
              {won && onContinue ? (
                <>
                  <button onClick={onContinue} className="btn btn-primary">
                    Continue
                  </button>
                  <button onClick={onNewGame} className="btn btn-ghost">
                    New Game
                  </button>
                </>
              ) : (
                <>
                  <button onClick={onNewGame} className="btn btn-primary">
                    New Game
                  </button>
                  <button onClick={onUndo} className="btn btn-ghost">
                    Undo
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
