"use client";

import { useEffect } from "react";
import {
  enable as enableDark,
  disable as disableDark,
  setFetchMethod,
} from "darkreader";

export function useGlobalDarkReader() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    setFetchMethod(window.fetch);

    const applyDark = () => {
      const isDark = document.cookie.includes("theme=dark");
      if (isDark) {
        enableDark(
          { brightness: 100, contrast: 100, sepia: 0 },
          {
            ignoreInlineStyle: [],
            disableStyleSheetsProxy: false,
            invert: [],
            css: "",
            ignoreImageAnalysis: [],
          }
        );
      } else {
        disableDark();
      }
    };

    // ✅ Aplicar apenas carga la app
    applyDark();

    // ✅ Escuchar cambios de cookie (propagados por el switch)
    const observer = new MutationObserver(() => applyDark());
    observer.observe(document, { subtree: true, childList: true });

    // ✅ Escuchar evento manual disparado desde el switch
    const onThemeChanged = (e: Event) => {
      const mode = (e as CustomEvent).detail?.theme;
      if (mode === "dark" || mode === "light") applyDark();
    };
    window.addEventListener("theme:changed", onThemeChanged);

    return () => {
      observer.disconnect();
      window.removeEventListener("theme:changed", onThemeChanged);
      disableDark();
    };
  }, []);
}
