"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import enCommon from "@/locales/en/common.json";
import enHome from "@/locales/en/home.json";
import enAssociations from "@/locales/en/associations.json";
import enLegal from "@/locales/en/legal.json";
import enCrew from "@/locales/en/crew.json";
import enRecruiter from "@/locales/en/recruiter.json";
import enAdmin from "@/locales/en/admin.json";

import mlCommon from "@/locales/ml/common.json";
import mlHome from "@/locales/ml/home.json";
import mlAssociations from "@/locales/ml/associations.json";
import mlLegal from "@/locales/ml/legal.json";
import mlCrew from "@/locales/ml/crew.json";
import mlRecruiter from "@/locales/ml/recruiter.json";
import mlAdmin from "@/locales/ml/admin.json";

const translations = {
  en: {
    ...enCrew,
    ...enCommon,
    common: { ...enCommon, ...(enCrew.common || {}) },
    home: enHome,
    associations: enAssociations,
    legal: enLegal,
    crew: enCrew,
    recruiter: enRecruiter,
    admin: enAdmin,
  },
  ml: {
    ...mlCrew,
    ...mlCommon,
    common: { ...mlCommon, ...(mlCrew.common || {}) },
    home: mlHome,
    associations: mlAssociations,
    legal: mlLegal,
    crew: mlCrew,
    recruiter: mlRecruiter,
    admin: mlAdmin,
  },
};

const STORAGE_KEY = "crewhive_lang";

export const LanguageContext = createContext({
  locale: "en",
  lang: "en",
  setLocale: () => {},
  setLang: () => {},
  toggleLocale: () => {},
  toggleLang: () => {},
  isMalayalam: false,
  isMl: false,
  t: (key) => key,
  getSection: (section) => {},
});

export function LanguageProvider({ children, initialLocale = "en" }) {
  const [locale, setLocaleState] = useState(initialLocale);
  const [isMounted, setIsMounted] = useState(false);

  const applyDomAttributes = useCallback((langCode) => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = langCode;
      document.documentElement.setAttribute("data-lang", langCode);
      const isMalayalam = langCode === "ml";
      document.documentElement.classList.toggle("lang-ml", isMalayalam);
      if (document.body) {
        document.body.classList.toggle("lang-ml", isMalayalam);
      }
    }
  }, []);

  // Restore saved language preference on mount, with query string priority
  useEffect(() => {
    setIsMounted(true);
    try {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const queryLang = urlParams.get("lang");
        if (queryLang === "en" || queryLang === "ml") {
          setLocaleState(queryLang);
          localStorage.setItem(STORAGE_KEY, queryLang);
          applyDomAttributes(queryLang);
          return;
        }
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "ml") {
        setLocaleState(saved);
        applyDomAttributes(saved);
      } else {
        applyDomAttributes("en");
      }
    } catch (_) {}
  }, [applyDomAttributes]);

  const setLocale = useCallback((newLocale) => {
    if (newLocale !== "en" && newLocale !== "ml") return;
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      applyDomAttributes(newLocale);
      if (typeof document !== "undefined") {
        document.cookie = `${STORAGE_KEY}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch (_) {}
  }, [applyDomAttributes]);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "ml" : "en");
  }, [locale, setLocale]);

  // Resolves dot-notated key: "home.hero.headline" or "common.nav.home"
  const t = useCallback(
    (keyPath, fallback = "") => {
      if (!keyPath || typeof keyPath !== "string") return fallback;
      const parts = keyPath.split(".");

      const resolveFrom = (dict) => {
        if (!dict) return undefined;
        let cur = dict;
        for (const part of parts) {
          if (cur && typeof cur === "object" && part in cur) {
            cur = cur[part];
          } else {
            return undefined;
          }
        }
        return typeof cur !== "object" ? cur : undefined;
      };

      // 1. Try direct path in current locale (e.g. "common.nav.createProfile", "home.hero.title")
      let current = resolveFrom(translations[locale]);
      if (current !== undefined) return current;

      // 2. Try under common if key doesn't start with common. (e.g. "nav.createProfile")
      if (!keyPath.startsWith("common.")) {
        current = resolveFrom(translations[locale]?.common);
        if (current !== undefined) return current;
      }

      // 3. Fallback to English direct path
      let fallbackCurrent = resolveFrom(translations.en);
      if (fallbackCurrent !== undefined) return fallbackCurrent;

      // 4. Fallback to English under common
      if (!keyPath.startsWith("common.")) {
        fallbackCurrent = resolveFrom(translations.en?.common);
        if (fallbackCurrent !== undefined) return fallbackCurrent;
      }

      return fallback || keyPath;
    },
    [locale]
  );

  // Helper to get structured arrays/objects, e.g. "home.crewBenefits.items"
  const getSection = useCallback(
    (keyPath) => {
      if (!keyPath || typeof keyPath !== "string") return null;
      const parts = keyPath.split(".");

      const resolveFrom = (dict) => {
        if (!dict) return undefined;
        let cur = dict;
        for (const part of parts) {
          if (cur && typeof cur === "object" && part in cur) {
            cur = cur[part];
          } else {
            return undefined;
          }
        }
        return cur;
      };

      let current = resolveFrom(translations[locale]);
      if (current !== undefined) return current;

      if (!keyPath.startsWith("common.")) {
        current = resolveFrom(translations[locale]?.common);
        if (current !== undefined) return current;
      }

      let fallbackCurrent = resolveFrom(translations.en);
      if (fallbackCurrent !== undefined) return fallbackCurrent;

      if (!keyPath.startsWith("common.")) {
        fallbackCurrent = resolveFrom(translations.en?.common);
        if (fallbackCurrent !== undefined) return fallbackCurrent;
      }

      return null;
    },
    [locale]
  );

  const contextValue = useMemo(
    () => ({
      locale,
      lang: locale,
      setLocale,
      setLang: setLocale,
      toggleLocale,
      toggleLang: toggleLocale,
      isMalayalam: locale === "ml",
      isMl: locale === "ml",
      t,
      getSection,
      isMounted,
    }),
    [locale, setLocale, toggleLocale, t, getSection, isMounted]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      locale: "en",
      lang: "en",
      setLocale: () => {},
      setLang: () => {},
      toggleLocale: () => {},
      toggleLang: () => {},
      isMalayalam: false,
      isMl: false,
      t: (k, fb = "") => fb || k,
      getSection: () => null,
      isMounted: false,
    };
  }
  return context;
}

export default LanguageProvider;
