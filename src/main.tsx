import React from 'react';
import { createRoot } from 'react-dom/client';
import './app/styles.css';
import { App } from './App';

const THEME_KEY = 'react-2048-theme';
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root element not found');

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
