import React from 'react';
import type { Direction } from '@entities/board/model/types';

type Props = {
  onQuick: (value: number, dir: Direction) => void;
  onSetBoard: (b: number[][]) => void;
};

const values = [1024, 2048, 4096, 8192] as const;
const dirs: Direction[] = ['left', 'right', 'up', 'down'];

export function DebugPanel({ onQuick, onSetBoard }: Props) {
  const [custom, setCustom] = React.useState<string>('[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]');

  return (
    <div className="w-full mb-3 p-3 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600">
      <div className="text-xs font-semibold mb-2">Debug panel</div>

      <div className="flex flex-wrap gap-2 items-center mb-2">
        {values.map((v) => (
          <div key={v} className="flex items-center gap-1">
            <span className="text-xs">
              {v}+{v}
            </span>
            {dirs.map((d) => (
              <button key={d} className="btn btn-ghost px-2 py-1 text-xs" onClick={() => onQuick(v, d)}>
                {d}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <input
          className="w-full rounded-md px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-700"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Paste 4x4 matrix, e.g. [[2,2,0,0],[...],...]"
        />
        <button
          className="btn btn-primary text-xs"
          onClick={() => {
            try {
              const parsed = JSON.parse(custom) as number[][];
              if (
                !Array.isArray(parsed) ||
                parsed.length !== 4 ||
                parsed.some((r) => !Array.isArray(r) || r.length !== 4)
              ) {
                alert('Matrix must be 4x4 array of numbers');
                return;
              }
              onSetBoard(parsed);
            } catch {
              alert('Invalid JSON');
            }
          }}
        >
          Set board
        </button>
      </div>
    </div>
  );
}
