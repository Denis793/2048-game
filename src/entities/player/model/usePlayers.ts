import { useCallback, useEffect, useMemo, useState } from 'react';
import { CURRENT_PLAYER_KEY, PLAYERS_KEY } from '@shared/config';
import type { Player, PlayerId } from './types';

function loadPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(PLAYERS_KEY);
    return raw ? (JSON.parse(raw) as Player[]) : [];
  } catch {
    return [];
  }
}
function savePlayers(players: Player[]) {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
}
function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>(() => loadPlayers());
  const [currentId, setCurrentId] = useState<PlayerId | null>(() => localStorage.getItem(CURRENT_PLAYER_KEY));

  useEffect(() => {
    if (players.length === 0) {
      const p: Player = { id: uid(), name: 'Player 1' };
      const list = [p];
      setPlayers(list);
      savePlayers(list);
      localStorage.setItem(CURRENT_PLAYER_KEY, p.id);
      setCurrentId(p.id);
    } else if (!currentId) {
      localStorage.setItem(CURRENT_PLAYER_KEY, players[0].id);
      setCurrentId(players[0].id);
    }
  }, []);

  const current = useMemo(() => players.find((p) => p.id === currentId) ?? null, [players, currentId]);

  const select = useCallback((id: PlayerId) => {
    localStorage.setItem(CURRENT_PLAYER_KEY, id);
    setCurrentId(id);
  }, []);

  const create = useCallback(
    (name: string) => {
      const p: Player = { id: uid(), name: name.trim() || 'Player' };
      const list = [p, ...players];
      setPlayers(list);
      savePlayers(list);
      localStorage.setItem(CURRENT_PLAYER_KEY, p.id);
      setCurrentId(p.id);
    },
    [players]
  );

  const rename = useCallback(
    (id: PlayerId, name: string) => {
      const list = players.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p));
      setPlayers(list);
      savePlayers(list);
    },
    [players]
  );

  const remove = useCallback(
    (id: PlayerId) => {
      const list = players.filter((p) => p.id !== id);
      setPlayers(list);
      savePlayers(list);
      if (currentId === id) {
        const next = list[0]?.id ?? null;
        if (next) {
          localStorage.setItem(CURRENT_PLAYER_KEY, next);
        } else {
          localStorage.removeItem(CURRENT_PLAYER_KEY);
        }
        setCurrentId(next);
      }
    },
    [players, currentId]
  );

  return {
    players,
    current,
    currentId,
    select,
    create,
    rename,
    remove,
  };
}
