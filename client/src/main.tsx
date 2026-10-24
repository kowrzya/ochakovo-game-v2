import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Game from './game/Game';
import Admin from './admin/Admin';
import './styles.css';

const isAdmin = location.pathname.startsWith('/admin');

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isAdmin ? <Admin /> : <Game />}</StrictMode>,
);
