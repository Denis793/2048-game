import React from 'react';
import { GameBoard } from '@entities/board';
import { Controls } from '@features/controls';
import { useGame } from '@entities/board/model/useGame';
import { Counter } from '@shared/ui/Counter';
import { usePlayers } from '@entities/player/model/usePlayers';
import { PlayerMenu } from '@entities/player/ui/PlayerMenu';

export function HomePage() {
  const { players, current, currentId, select, create, rename, remove } = usePlayers();
  const game = useGame(currentId ?? '');

  return (
    <div className="game-container min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[520px] flex flex-col items-center">
        {/* Header: stack on mobile, row on sm+ */}
        <div className="w-full mb-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            {/* Title/Subtitle */}
            <div className="flex-1 min-w-0">
              <h1 className="text-4xl font-black tracking-tight">2048</h1>
              <p className="text-xs text-neutral-600 dark:text-neutral-300">Use Arrow keys or swipe</p>
              {current && (
                <div className="text-xs mt-1 text-neutral-500 dark:text-neutral-400 truncate">
                  Player: <span className="font-semibold">{current.name}</span>
                </div>
              )}
            </div>

            {/* Counters: on mobile go full width side-by-side */}
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Counter label="SCORE" value={game.score} />
              <Counter label="BEST" value={game.best} />
            </div>
          </div>
        </div>

        {/* Controls: grid on mobile, row on sm+ */}
        <div className="w-full mb-4">
          <div
            className="
              grid grid-cols-2 gap-2
              sm:flex sm:flex-wrap sm:items-center
            "
          >
            <PlayerMenu
              players={players}
              currentId={currentId}
              onSelect={select}
              onCreate={create}
              onRename={rename}
              onRemove={remove}
            />
            <Controls.NewGame onClick={game.newGame} />
            <Controls.Undo onClick={game.undo} disabled={!game.canUndo} />
            <Controls.ThemeToggle onClick={game.toggleTheme} isDark={game.isDark} />
            <div className="sm:ml-auto">
              <Controls.ResetBest onClick={game.resetBest} />
            </div>
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
          />
        </div>

        <p className="mt-4 text-xs text-neutral-600 dark:text-neutral-300 text-center">
          Tip: keep the highest tile in a corner and avoid breaking your main line.
        </p>
      </div>
    </div>
  );
}
