import React from 'react';
import { GameBoard } from '@entities/board';
import { Controls } from '@features/controls';
import { useGame } from '@entities/board/model/useGame';
import { Counter } from '@shared/ui/Counter';
import { usePlayers } from '@entities/player/model/usePlayers';
import { PlayerMenu } from '@entities/player/ui/PlayerMenu';
import { DebugPanel } from '@features/debug/ui/DebugPanel';

export function HomePage() {
  const { players, current, currentId, select, create, rename, remove } = usePlayers();
  const game = useGame(currentId ?? '');

  /**
   * Developer Debug toggle:
   * - Initial value from URL (?debug=1) OR localStorage('2048:debug' === '1')
   * - Persist to localStorage when toggled
   */
  const [debug, setDebug] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlFlag = new URLSearchParams(window.location.search).get('debug') === '1';
    const lsFlag = localStorage.getItem('2048:debug') === '1';
    setDebug(urlFlag || lsFlag);
  }, []);

  const toggleDebug = React.useCallback(() => {
    setDebug((v) => {
      const next = !v;
      try {
        if (next) localStorage.setItem('2048:debug', '1');
        else localStorage.removeItem('2048:debug');
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  }, []);

  return (
    <>
      <div className="game-container min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-[520px] flex flex-col items-center">
          {/* Header: title + theme + developer debug toggle */}
          <div className="flex w-full justify-between items-center mb-4">
            <h1 className="text-4xl font-black tracking-tight m-6">2048</h1>
            <div className="flex items-center gap-2">
              {/* Developer: show/hide debug panel */}
              <button
                type="button"
                onClick={toggleDebug}
                className="btn btn-ghost"
                title={debug ? 'Hide debug panel' : 'Show debug panel'}
                aria-pressed={debug}
              >
                {debug ? 'Hide Debug' : 'Show Debug'}
              </button>
              <Controls.ThemeToggle onClick={game.toggleTheme} isDark={game.isDark} />
            </div>
          </div>

          {/* Debug panel (visible when debug=true) */}
          {debug && <DebugPanel onQuick={game.debugQuickMerge} onSetBoard={game.debugSetBoard} />}

          {/* Controls row */}
          <div className="w-full mb-4">
            <div className="grid grid-cols-2 gap-2">
              <PlayerMenu
                players={players}
                currentId={currentId}
                onSelect={select}
                onCreate={create}
                onRename={rename}
                onRemove={remove}
                onResetForNoPlayers={() => {
                  // Reset board & score (do not touch global BEST)
                  game.newGame();
                }}
              />

              <Controls.NewGame onClick={game.newGame} />
            </div>
          </div>

          {/* Board */}
          <div className="flex justify-center w-full">
            <GameBoard
              board={game.board}
              lastSpawn={game.lastSpawn}
              lastDir={game.lastDir}
              won={game.won}
              over={game.over}
              onNewGame={game.newGame}
              onUndo={game.undo}
              onContinue={game.continueGame}
              onKeyDir={game.applyMove}
              animMoves={game.animMoves}
              playerName={current?.name ?? 'Player'}
            />
          </div>

          {/* Bottom counters & actions */}
          <div className="w-full my-14">
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Counter label="BEST" value={game.bestGlobal} />
                <Counter label="SCORE" value={game.score} />
                <Controls.ResetBest className="py-7" onClick={game.resetBest} />
                <Controls.Undo className="py-7" onClick={game.undo} disabled={!game.canUndo} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
