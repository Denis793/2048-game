# 2048 Game (React + TypeScript + Tailwind)

A modern implementation of the classic **2048 puzzle game**, built with **React, TypeScript, and TailwindCSS**.  
Supports multiple players, persistent saves, animations, responsive design, theme switching, and a built-in debug mode for testing.

---

## 📸 Preview

<p align="center">
  <a href="https://2048-game-pi-ten.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/View%20Project-Click%20Here-blue?style=for-the-badge" alt="View Project">
  </a>
</p>

---

## 🖼️ Screenshot

<div align="center">
  <img src="https://github.com/Denis793/2048-game/blob/main/public/img/Screen.png" alt="View click" height="auto" width="100%">
</div>

---

## 🎮 Features

- **Classic 2048 Mechanics**

  - Slide tiles with **arrow keys** or **swipes (mobile)**.
  - Matching tiles merge into the sum (2 + 2 → 4).
  - The goal: reach **2048** — but you can continue to chase higher scores.

- **Player Profiles**

  - Create, rename, delete multiple players.
  - Each player has an independent save (board, score, best score, undo history).
  - Switch between players without losing progress.

- **Persistent Storage**

  - State is saved in **localStorage**:
    - Board
    - Score
    - Best score
    - Undo history
    - Theme preference
  - Progress is **not lost** after reload.

- **Undo System**

  - Roll back up to **3 moves**.

- **Continue After 2048**

  - When you reach 2048, you see a one-time modal with "Continue" / "New Game".
  - Continue allows playing beyond 2048 (4096, 8192…).

- **Animations**

  - Smooth tile movement animations.
  - Spawn animation for new tiles.
  - Merge animations.

- **Themes**

  - Light / Dark mode toggle (global).
  - Menu and all UI elements adapt automatically.

- **Responsive UI**

  - Board scales with screen width (desktop, tablet, mobile).
  - Font size adjusts to tile size.
  - Controls rearrange:
    - **Grid layout** on small screens.
    - **Inline layout** on larger screens.

- **🧩 Debug Mode**
  - A built-in debug panel to test high-value merges without grinding.
  - Enable via:
    - URL: `?debug=1`
    - Or: `localStorage.setItem('2048:debug', '1')`
  - Features:
    - Quick merge buttons (`1024+1024`, `2048+2048`, etc.) in any direction.
    - Custom board setter: paste a 4×4 JSON matrix.

---

## 🛠 Technologies Used

- **React 18** — UI library
- **TypeScript** — type safety
- **Vite** — fast build & dev server
- **TailwindCSS v4** — styling & responsive design
- **PostCSS + Autoprefixer** — CSS tooling
- **Vitest** — unit testing (movement logic, merge rules)
- **ESLint + Prettier** — linting & formatting
- **LocalStorage API** — persistence across sessions

---

## ⚙️ Installation & Setup

Clone repo and install dependencies:

```bash
git clone https://github.com/your-username/2048-react-ts.git
cd 2048-react-ts
npm install
```

Start dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

Run tests:

```bash
npm run test
```

---

## 🧪 Tests

- **Movement Logic**
  - `moveLeft`, `moveRight`, `moveUp`, `moveDown` tested with multiple scenarios.
  - Verifies merges, no double merges, gained score.
- **Board State**
  - Detects `hasMoves`, `maxTile`.
- **Undo**
  - Ensures rollback works correctly up to 3 steps.

---

## 📱 Responsive Design

- Tile size adapts via CSS variables:
  - Desktop: 96px
  - Tablet: 76–88px
  - Mobile: 56–64px
- Font scales with tile size.
- Controls switch from **row** to **grid** on mobile.

---

## 👨‍💻 Author

Developed by **Denys Shevchenko** as a portfolio project.  
Perfect for demonstrating **React + TypeScript + Tailwind** skills and clean architecture.
