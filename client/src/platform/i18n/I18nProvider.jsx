import React, { createContext, useContext, useMemo, useState } from "react";
import fr from "./catalogs/fr.js";
import en from "./catalogs/en.js";

const catalogs = { fr, en };
export const supportedLocales = Object.freeze(["fr", "en"]);
const I18nContext = createContext(null);

function normalizeLocale(value) {
  const language = String(value || "").toLowerCase().split("-")[0];
  return supportedLocales.includes(language) ? language : "fr";
}

function initialLocale() {
  try {
    const saved = localStorage.getItem("kairos_locale");
    if (saved) return normalizeLocale(saved);
  } catch {}
  return normalizeLocale(navigator.languages?.[0] || navigator.language);
}

export function resolveMessage(catalog, key) {
  return key.split(".").reduce((value, part) => value?.[part], catalog);
}

export function interpolate(message, variables = {}) {
  return String(message).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : match,
  );
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(initialLocale);
  const value = useMemo(() => {
    const setLocale = (next) => {
      const normalized = normalizeLocale(next);
      setLocaleState(normalized);
      document.documentElement.lang = normalized;
      document.documentElement.dir = "ltr";
      try { localStorage.setItem("kairos_locale", normalized); } catch {}
    };
    const t = (key, variables) => {
      const message = resolveMessage(catalogs[locale], key) ?? resolveMessage(fr, key);
      if (message == null) return `⟦${key}⟧`;
      return interpolate(message, variables);
    };
    return {
      locale,
      setLocale,
      t,
      formatNumber: (number, options) => new Intl.NumberFormat(locale, options).format(number),
      formatDate: (date, options) => new Intl.DateTimeFormat(locale, options).format(date),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n doit être utilisé dans I18nProvider");
  return value;
}
