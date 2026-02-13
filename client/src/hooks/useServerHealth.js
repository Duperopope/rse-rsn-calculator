import { useState, useEffect } from 'react';
import { API_URL } from '../config/constants.js';

/**
 * Hook pour verifier la connexion au serveur backend
 * v7.1.3 - Retry automatique pour gerer le cold start Render (free tier)
 * Fait 3 tentatives espacees de 3s au demarrage, puis ping toutes les 30s
 * @returns {{ online: boolean, version: string|null, loading: boolean }}
 */
export function useServerHealth() {
  const [online, setOnline] = useState(false);
  const [version, setVersion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let timer = null;

    async function check() {
      try {
        const res = await fetch(API_URL + '/health', { signal: AbortSignal.timeout(8000) });
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          setOnline(true);
          setVersion(data.version || null);
          return true;
        } else {
          setOnline(false);
          return false;
        }
      } catch (e) {
        if (mounted) setOnline(false);
        return false;
      }
    }

    async function initWithRetry() {
      // Tentative 1
      let ok = await check();
      if (ok || !mounted) { if (mounted) setLoading(false); return; }

      // Tentative 2 apres 3s
      await new Promise(r => setTimeout(r, 3000));
      if (!mounted) return;
      ok = await check();
      if (ok || !mounted) { if (mounted) setLoading(false); return; }

      // Tentative 3 apres 3s
      await new Promise(r => setTimeout(r, 3000));
      if (!mounted) return;
      ok = await check();
      if (mounted) setLoading(false);
    }

    initWithRetry();
    timer = setInterval(check, 30000);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  return { online, version, loading };
}
