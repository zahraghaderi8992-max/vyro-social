import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import './refinements.css';
import './telegram-reference.css';
import './vyro-glass-neon.css';

const App = lazy(() => import('./App.jsx'));

// Cache the app shell for reopening when connectivity is unreliable.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

function BootScreen() {
  return <div className="vyro-boot" role="status" aria-live="polite">
    <div className="vyro-boot-mark">VYRO</div>
    <div className="vyro-boot-spinner" />
    <span>وایرو در حال آماده‌سازی است…</span>
  </div>;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<BootScreen />}>
      <App />
    </Suspense>
  </React.StrictMode>
);