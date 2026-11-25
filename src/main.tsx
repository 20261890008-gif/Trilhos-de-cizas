import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

try {
  if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        for (const r of regs) r.unregister().catch(() => {});
      })
      .catch(() => {});
  } else {
    registerSW({ immediate: true });
  }
} catch {
  // Ignore unsupported Service Worker environments on mobile in-app browsers
}

createRoot(document.getElementById('root')!).render(<App />);
