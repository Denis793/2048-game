import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Board, Coord, Direction } from '@entities/board/model/types';
import type { Move } from '@shared/lib/game/types';
import { tileClasses, digitColorClass } from '@shared/ui/tileClasses';

/** Pixel coordinates inside the grid (relative to grid's top-left). */
type Pos = { x: number; y: number };

/** Animated ghost tile uses measured pixel positions (no math drifts). */
function AnimatedTile({ move, fromPos, toPos }: { move: Move; fromPos: Pos; toPos: Pos }) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const [run, setRun] = useState(false);
  const [transform, setTransform] = useState<string>(`translate3d(${fromPos.x}px, ${fromPos.y}px, 0)`);

  useEffect(() => {
    // Reset transform to the start point and force layout, then run to the target
    setRun(false);
    setTransform(`translate3d(${fromPos.x}px, ${fromPos.y}px, 0)`);

    const node = elRef.current;
    if (node) void node.getBoundingClientRect();

    const id1 = requestAnimationFrame(() => {
      setRun(true);
      const id2 = requestAnimationFrame(() => {
        setTransform(`translate3d(${toPos.x}px, ${toPos.y}px, 0)`);
      });
      return () => cancelAnimationFrame(id2);
    });

    return () => cancelAnimationFrame(id1);
  }, [fromPos.x, fromPos.y, toPos.x, toPos.y]);

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

/** Main GameBoard component. */
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
  /** Player name to display in the win/lose modal. */
  playerName?: string;
}) {
  const { board, lastSpawn, won, over, onNewGame, onUndo, onContinue, onKeyDir, animMoves, playerName } = props;

  /** Refs to grid and every static cell (for measuring). */
  const gridRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[][]>(
    Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => null))
  );

  /** Measured pixel positions (relative to grid top-left). */
  const [pos, setPos] = useState<Pos[][]>(() =>
    Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => ({ x: 0, y: 0 })))
  );

  /** Measure cells after layout (mount, resize, tile size change). */
  const measure = () => {
    const grid = gridRef.current;
    if (!grid) return;
    const base = grid.getBoundingClientRect();
    const next: Pos[][] = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => ({ x: 0, y: 0 })));

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const el = cellRefs.current[r][c];
        if (!el) continue;
        const rc = el.getBoundingClientRect();
        next[r][c] = { x: rc.left - base.left, y: rc.top - base.top };
      }
    }
    setPos(next);
  };

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (gridRef.current) ro.observe(gridRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  /** Pointer (touch) swipe handling with axis lock. */
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef<{
    id: number | null;
    sx: number;
    sy: number;
    t0: number;
    axis?: 'x' | 'y';
    handled: boolean;
  }>({ id: null, sx: 0, sy: 0, t0: 0, handled: false });

  const BASE_PX = 18;
  const PCT_OF_STAGE = 0.06;
  const AXIS_RATIO = 1.25;
  const MIN_VELOCITY = 0.35;

  const getThreshold = () => {
    const w = stageRef.current?.offsetWidth ?? gridRef.current?.offsetWidth ?? 320;
    return Math.max(BASE_PX, w * PCT_OF_STAGE);
  };

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!e.isPrimary) return;
    pointer.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, t0: performance.now(), handled: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const p = pointer.current;
    if (p.id !== e.pointerId || p.handled) return;
    const dx = e.clientX - p.sx;
    const dy = e.clientY - p.sy;

    if (!p.axis) {
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      const thr = getThreshold() * 0.5;
      if (ax < thr && ay < thr) return;
      p.axis = ax > ay * AXIS_RATIO ? 'x' : ay > ax * AXIS_RATIO ? 'y' : undefined;
    }
    if (p.axis) e.preventDefault(); // lock scroll once axis chosen
  };

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
    if (
      (Math.abs(dx) >= thr || vx >= MIN_VELOCITY) &&
      (!p.axis || p.axis === 'x') &&
      Math.abs(dx) > Math.abs(dy) * (p.axis ? 1 : AXIS_RATIO)
    ) {
      dir = dx > 0 ? 'right' : 'left';
    } else if (
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
    pointer.current = { id: null, sx: 0, sy: 0, t0: 0, handled: false };
  };

  /** Stage size used only to size the animation layer; grid is measured anyway. */
  const stageSize = useMemo(() => {
    const grid = gridRef.current;
    if (!grid) return { w: 0, h: 0 };
    const r = grid.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }, [pos]);

  return (
    <div
      className="relative rounded-2xl p-3 select-none
                 bg-neutral-200/80 dark:bg-neutral-700/60 inline-block"
    >
      {/* Stage wraps grid and handles pointer gestures */}
      <div
        ref={stageRef}
        className="board-stage mx-auto"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Static grid; each cell has its own ref for precise measuring */}
        <div ref={gridRef} className="board absolute left-0 top-0" role="grid" aria-label="4 by 4 2048 board">
          {board.map((row, r) =>
            row.map((val, c) => {
              const isNew = lastSpawn && lastSpawn[0] === r && lastSpawn[1] === c;
              const numCls =
                val >= 1024 ? 'tile-num tile-num--huge' : val >= 128 ? 'tile-num tile-num--big' : 'tile-num';
              const numColor = digitColorClass(val);
              return (
                <div key={`${r}-${c}`} role="gridcell" className="relative" ref={(el) => (cellRefs.current[r][c] = el)}>
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

        {/* Animation layer aligned to the same origin; ghosts use measured positions */}
        {animMoves && animMoves.length > 0 && (
          <div className="anim-layer absolute left-0 top-0 z-20" style={{ width: stageSize.w, height: stageSize.h }}>
            {animMoves.map((m, i) => (
              <AnimatedTile key={i} move={m} fromPos={pos[m.from[0]][m.from[1]]} toPos={pos[m.to[0]][m.to[1]]} />
            ))}
          </div>
        )}
      </div>

      {/* --- Overlay for win/lose modal --- */}
      {(won || over) && (
        <div
          className="absolute inset-0 rounded-2xl grid place-items-center
               bg-white/80 dark:bg-black/40 backdrop-blur-[2px]"
        >
          <div className="text-center">
            <div className="text-3xl font-black mb-2">
              {won ? `${playerName ?? 'Player'} wins!` : `${playerName ?? 'Player'} lost`}
            </div>
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
