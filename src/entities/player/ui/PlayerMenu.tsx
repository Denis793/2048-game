import React, { useState } from 'react';
import type { Player } from '@entities/player/model/types';

export function PlayerMenu(props: {
  players: Player[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename?: (id: string, name: string) => void;
  onRemove?: (id: string) => void;
}) {
  const { players, currentId, onSelect, onCreate, onRename, onRemove } = props;
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');

  return (
    <div className="relative">
      <button className="btn btn-ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Players
      </button>

      {open && (
        <div
          className="absolute z-30 mt-2 w-64 rounded-xl shadow-lg p-3
                     bg-white text-neutral-900
                     dark:bg-neutral-800 dark:text-neutral-100
                     border border-neutral-200 dark:border-neutral-700"
        >
          <div className="mb-3">
            <div
              className="text-xs font-semibold tracking-wide
                            text-neutral-600 dark:text-neutral-400 mb-1"
            >
              Select player
            </div>
            <ul className="space-y-1 max-h-56 overflow-auto">
              {players.map((p) => (
                <li
                  key={p.id}
                  className={`flex items-center justify-between rounded-lg px-2 py-1 cursor-pointer
                              ${
                                currentId === p.id
                                  ? 'bg-neutral-100 dark:bg-neutral-700'
                                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
                              }`}
                  onClick={() => {
                    onSelect(p.id);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{p.name}</span>
                  {(onRename || onRemove) && (
                    <span className="flex items-center gap-1 text-xs">
                      {onRename && (
                        <button
                          title="Rename"
                          className="px-1 py-0.5 rounded
                                     hover:bg-neutral-200 dark:hover:bg-neutral-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            const name = prompt('New name', p.name);
                            if (name != null) onRename(p.id, name);
                          }}
                        >
                          Rename
                        </button>
                      )}
                      {onRemove && (
                        <button
                          title="Delete"
                          className="px-1 py-0.5 rounded
                                     hover:bg-neutral-200 dark:hover:bg-neutral-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete player "${p.name}"? Progress will be lost.`)) {
                              onRemove(p.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2">
            <div
              className="text-xs font-semibold tracking-wide
                            text-neutral-600 dark:text-neutral-400 mb-1"
            >
              Create new
            </div>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                className="flex-1 rounded-md px-2 py-1
                           bg-neutral-100 text-neutral-900
                           dark:bg-neutral-700 dark:text-neutral-100
                           outline-none"
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (newName.trim().length === 0) return;
                  onCreate(newName.trim());
                  setNewName('');
                  setOpen(false);
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
