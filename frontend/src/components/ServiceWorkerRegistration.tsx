'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    let controllerChangeHandler: () => void;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });

        controllerChangeHandler = () => {
          window.location.reload();
        };
        navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler);
      })
      .catch((err) => console.error('SW registration failed:', err));

    return () => {
      if (controllerChangeHandler) {
        navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler);
      }
    };
  }, []);

  return null;
}
