import { useState, useEffect, useCallback } from 'react';
import { THEME_COLORS } from '../config/constants.js';

/**
 * Hook pour gerer le theme dark/light
 * Persiste le choix dans localStorage
 * Applique les variables CSS sur :root
 * @returns {{ theme: string, colors: Object, toggleTheme: Function }}
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return window.localStorage.getItem('rse_theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  const colors = THEME_COLORS[theme] || THEME_COLORS.dark;

  useEffect(() => {
    try {
      window.localStorage.setItem('rse_theme', theme);
    } catch (e) {
      // silencieux
    }

    // Appliquer les variables CSS sur :root
    const root = document.documentElement;
    root.style.setProperty('--bg', colors.bg);
    root.style.setProperty('--bg-card', colors.bgCard);
    root.style.setProperty('--bg-input', colors.bgInput);
    root.style.setProperty('--text', colors.text);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--border', colors.border);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--accent-green', colors.accentGreen);
    root.style.setProperty('--accent-red', colors.accentRed);
    root.style.setProperty('--accent-orange', colors.accentOrange);
    root.style.setProperty('--accent-purple', colors.accentPurple);
    root.style.setProperty('--gradient-start', colors.gradientStart);
    root.style.setProperty('--gradient-end', colors.gradientEnd);
    root.setAttribute('data-theme', theme);
  }, [theme, colors]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, colors, toggleTheme };
}
