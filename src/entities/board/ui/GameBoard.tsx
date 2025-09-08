import React, { useEffect, useRef, useState } from 'react';
import type { Board, Coord, Direction } from '@entities/board/model/types';
import type { Move } from '@shared/lib/game/types';
import { tileClasses, digitColorClass } from '@shared/ui/tileClasses';

/* --- Utility: convert row/col into pixel transform string.
   IMPORTANT: use exact fractional values (no device-pixel snapping) so
   animation coordinates match CSS Grid positions on mobile screens. --- */
const toPxTransform = (r: number, c: number, tile: number, gap: number) => {
  const step = tile + gap;
  const x = c * step;
  const y = r * step;
  return `translate3d(${x}px, ${y}px, 0)`;
};

/* --- Animated ghost tile used during movement animations --- */
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

    // Start animation on the next frame
    const id1 = requestAnimationFrame(() => {
      setRun(true);
      const id2 = requestAnimationFrame(() => setTransform(to));
      return () => cancelAnimationFrame(id2);
    });

    return () => cancelAnimationFrame(id1);
  }, [from, to]);

  const numCls =
    move.value >= 1024 ? 'tile-num tile-num--huge' : move.value >= 128 ? 'tile-num tile-num--big' : 'tile-num';

  const numColor = digitColorClass(move.value);
  const bg = tileClasses(move.value);

  return (
    <div ref={elRef} className={`anim-tile ${bg} ${run ? 'anim-run' : ''}`} style={{ transform }}>
      <span className={`${numCls} ${numColor} text-shadow-md`}>{move.value}</span>
    </div>
  );
}

/* --- Main GameBoard component --- */
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

  /* --- Read CSS variables for tile/gap size --- */
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

  /* --- Improved swipe detection (Pointer Events) --- */
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef<{
    id: number | null;
    sx: number;
    sy: number;
    t0: number;
    axis?: 'x' | 'y';
    handled: boolean;
  }>({ id: null, sx: 0, sy: 0, t0: 0, handled: false });

  // Swipe thresholds
  const BASE_PX = 18;
  const PCT_OF_STAGE = 0.06;
  const AXIS_RATIO = 1.25;
  const MIN_VELOCITY = 0.35;

  const getThreshold = () => {
    const w = stageRef.current?.offsetWidth ?? sizes.tile * 4 + sizes.gap * 3;
    return Math.max(BASE_PX, w * PCT_OF_STAGE);
  };

  /* --- Pointer down: start tracking gesture --- */
  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!e.isPrimary) return;
    pointer.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, t0: performance.now(), handled: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  /* --- Pointer move: detect dominant axis and block scroll --- */
  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const p = pointer.current;
    if (p.id !== e.pointerId || p.handled) return;

    const dx = e.clientX - p.sx;
    const dy = e.clientY - p.sy;

    if (!p.axis) {
      const ax = Math.abs(dx),
        ay = Math.abs(dy);
      const thr = getThreshold() * 0.5;
      if (ax < thr && ay < thr) return;
      p.axis = ax > ay * AXIS_RATIO ? 'x' : ay > ax * AXIS_RATIO ? 'y' : undefined;
    }

    if (p.axis) e.preventDefault();
  };

  /* --- Pointer up: finalize gesture and trigger move --- */
  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const p = pointer.current;
    if (p.id !== e.pointerId || p.handled) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    const dx = e.clientX - p.sx;
    const dy = e.clientY - p.sy;
    const dt = Math.max(1, performance.now() - p.t0);

    const vx = Math.abs(dx) / dt;
    const vy = Math.abs(dy) / dt;

    const thr = getThreshold();

    let dir: Direction | null = null;

    // Horizontal swipe
    if (
      (Math.abs(dx) >= thr || vx >= MIN_VELOCITY) &&
      (!p.axis || p.axis === 'x') &&
      Math.abs(dx) > Math.abs(dy) * (p.axis ? 1 : AXIS_RATIO)
    ) {
      dir = dx > 0 ? 'right' : 'left';
    }
    // Vertical swipe
    else if (
      (Math.abs(dy) >= thr || vy >= MIN_VELOCITY) &&
      (!p.axis || p.axis === 'y') &&
      Math.abs(dy) > Math.abs(dx) * (p.axis ? 1 : AXIS_RATIO)
    ) {
      dir = dy > 0 ? 'down' : 'up';
    }

    if (dir) {
      e.preventDefault();
      p.handled = true;
      onKeyDir(dir);
    }

    // Reset pointer state
    pointer.current = { id: null, sx: 0, sy: 0, t0: 0, handled: false };
  };

  const stagePx = sizes.tile * 4 + sizes.gap * 3;

  return (
    <div
      className="relative rounded-2xl p-3 select-none
                 bg-neutral-200/80 dark:bg-neutral-700/60 inline-block"
    >
      {/* Stage: main square area (responsive on mobile) */}
      <div
        ref={stageRef}
        className="board-stage mx-auto"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Static grid of tiles */}
        <div className="board absolute left-0 top-0" role="grid" aria-label="4 by 4 2048 board">
          {board.map((row, r) =>
            row.map((val, c) => {
              const isNew = lastSpawn && lastSpawn[0] === r && lastSpawn[1] === c;
              const numCls =
                val >= 1024 ? 'tile-num tile-num--huge' : val >= 128 ? 'tile-num tile-num--big' : 'tile-num';
              const numColor = digitColorClass(val);

              return (
                <div key={`${r}-${c}`} role="gridcell" className="relative">
                  <div className={`${tileClasses(val)} ${isNew ? 'pop' : ''}`}>
                    {val !== 0 ? (
                      <span className={`${numCls} ${numColor} text-shadow-md`}>{val}</span>
                    ) : (
                      <span className="opacity-0">0</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Animation layer: ghost tiles move here */}
        {animMoves && animMoves.length > 0 && (
          <div className="anim-layer absolute left-0 top-0 z-20" style={{ width: stagePx, height: stagePx }}>
            {animMoves.map((m, i) => (
              <AnimatedTile key={i} move={m} tile={sizes.tile} gap={sizes.gap} />
            ))}
          </div>
        )}
      </div>

      {/* Overlay for win/lose modal */}
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
