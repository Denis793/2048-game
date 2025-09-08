export const BOARD_SIZE = 4;
export const TARGET = 2048;
export const THEME_KEY = 'react-2048-theme';
export const PLAYERS_KEY = 'react-2048-players';
export const CURRENT_PLAYER_KEY = 'react-2048-current-player';
export const PERSIST_KEY = 'react-2048-state';
export const BEST_KEY = 'react-2048-best';
export function getPlayerKeys(playerId: string) {
  const base = `react-2048:${playerId}`;
  return {
    persist: `${base}:state`,
    best: `${base}:best`,
  };
}
