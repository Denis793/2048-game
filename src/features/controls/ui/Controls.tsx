import React from 'react';

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { label?: string };

export function NewGame(props: BtnProps) {
  return (
    <button {...props} className={`btn btn-primary ${props.className ?? ''}`}>
      New Game
    </button>
  );
}

export function Undo(props: BtnProps) {
  return (
    <button {...props} className={`btn btn-ghost ${props.className ?? ''}`}>
      Undo
    </button>
  );
}

export function ResetBest(props: BtnProps) {
  return (
    <button {...props} className={`btn btn-ghost ${props.className ?? ''}`} title="Reset BEST">
      Reset Best
    </button>
  );
}

export function ThemeToggle(props: { onClick: () => void; isDark: boolean }) {
  const { onClick, isDark } = props;
  return (
    <button onClick={onClick} className="btn btn-ghost" title="Toggle theme">
      {isDark ? 'Light' : 'Dark'}
    </button>
  );
}
