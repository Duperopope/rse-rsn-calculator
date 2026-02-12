import { useState, useEffect } from 'react';
import { API_URL } from '../config/constants.js';

/**
 * Hook pour verifier la connexion au serveur backend
 * Ping /api/health toutes les 30 secondes
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
        const res = await fetch(API_URL + '/health', { signal: AbortSignal.timeout(5000) });
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          setOnline(true);
          setVersion(data.version || null);
        } else {
          setOnline(false);
        }
      } catch (e) {
        if (mounted) setOnline(false);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    check();
    timer = setInterval(check, 30000);

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  return { online, version, loading };
}
