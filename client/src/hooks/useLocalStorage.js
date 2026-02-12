import { useState, useCallback } from 'react';

/**
 * Hook generique pour persister un etat dans localStorage
 * @param {string} key - Cle localStorage
 * @param {*} initialValue - Valeur par defaut
 * @returns {[value, setValue, removeValue]}
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (e) {
      console.warn('[useLocalStorage] Erreur lecture "' + key + '":', e);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (e) {
      console.warn('[useLocalStorage] Erreur ecriture "' + key + '":', e);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (e) {
      console.warn('[useLocalStorage] Erreur suppression "' + key + '":', e);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
