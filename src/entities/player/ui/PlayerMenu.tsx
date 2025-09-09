import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Player } from '@entities/player/model/types';

type Props = {
  players: Player[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename?: (id: string, name: string) => void;
  onRemove?: (id: string) => void;
  onResetForNoPlayers?: () => void;
};

export function PlayerMenu({ players, currentId, onSelect, onCreate, onRename, onRemove, onResetForNoPlayers }: Props) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [firstModalOpen, setFirstModalOpen] = useState(players.length === 0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const current = useMemo(() => players.find((p) => p.id === currentId) ?? null, [players, currentId]);

  useEffect(() => {
    setFirstModalOpen(players.length === 0);
  }, [players.length]);

  useEffect(() => {
    if (firstModalOpen) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [firstModalOpen]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      const root = rootRef.current;
      if (root && target && !root.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown, { passive: true });
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown as EventListener);
      document.removeEventListener('touchstart', onDown as EventListener);
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (firstModalOpen) setFirstModalOpen(false);
        else setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [firstModalOpen]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onCreate(name);
    setNewName('');
    setFirstModalOpen(false);
    setOpen(false);
  };

  const handleRemove = (id: string, name: string) => {
    if (!onRemove) return;
    if (!confirm(`Delete player "${name}"? Progress will be lost.`)) return;

    const willBeEmpty = players.length === 1;
    onRemove(id);

    if (willBeEmpty) {
      onResetForNoPlayers?.();
      setFirstModalOpen(true);
    }
  };

  return (
    <>
      <div className="relative" ref={rootRef}>
        <button
          ref={btnRef}
          className="btn btn-ghost w-full"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          title="Players"
        >
          {current ? `Player: ${current.name}` : 'Players'}
        </button>

        {/* Dropdown */}
        {open && (
          <>
            <div className="fixed inset-0 z-20 bg-transparent" aria-hidden="true" onClick={() => setOpen(false)} />
            <div
              className="
              absolute z-30 mt-2 w-64 rounded-xl shadow-lg p-3
              bg-white text-neutral-900
              dark:bg-neutral-800 dark:text-neutral-100
              border border-neutral-200 dark:border-neutral-700
            "
              role="menu"
              aria-label="Players"
            >
              <div className="mb-3">
                <div className="text-xs font-semibold tracking-wide text-neutral-600 dark:text-neutral-400 mb-1">
                  Select player
                </div>

                <ul className="space-y-1 max-h-56 overflow-auto">
                  {players.length === 0 && (
                    <li className="px-2 py-1 text-sm text-neutral-500 dark:text-neutral-300">No players yet.</li>
                  )}
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
                        btnRef.current?.focus();
                      }}
                    >
                      <span className="truncate">{p.name}</span>

                      {(onRename || onRemove) && (
                        <span className="flex items-center gap-1 text-xs">
                          {onRename && (
                            <button
                              title="Rename"
                              className="px-1 py-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                const name = prompt('New name', p.name)?.trim();
                                if (name && name !== p.name) onRename(p.id, name);
                              }}
                            >
                              Rename
                            </button>
                          )}
                          {onRemove && (
                            <button
                              title="Delete"
                              className="px-1 py-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemove(p.id, p.name);
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

              {/* Quick create (inside dropdown) */}
              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2">
                <div className="text-xs font-semibold tracking-wide text-neutral-600 dark:text-neutral-400 mb-1">
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreate();
                    }}
                  />
                  <button className="btn btn-primary" onClick={handleCreate}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal: create first player (styled like win modal) */}
        {firstModalOpen && (
          <div
            className="fixed inset-0 z-40 grid place-items-center
          bg-white/80 dark:bg-black/40 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-label="Create first player"
          >
            <div className="card w-[min(92vw,420px)]" onClick={(e) => e.stopPropagation()}>
              <div className="text-center">
                <div className="text-2xl font-black mb-2">Create player</div>
                <div className="text-sm text-neutral-700 dark:text-neutral-200 mb-3">
                  Please enter a name to start playing.
                </div>

                <div className="flex gap-2 items-center mb-3">
                  <input
                    ref={inputRef}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Player name"
                    className="flex-1 rounded-md px-3 py-2
                  bg-neutral-100 text-neutral-900
                  dark:bg-neutral-700 dark:text-neutral-100
                    outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreate();
                    }}
                  />
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button className="btn btn-primary" onClick={handleCreate}>
                    Create
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setFirstModalOpen(false);
                    }}
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
