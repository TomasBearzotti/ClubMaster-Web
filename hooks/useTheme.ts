"use client";
import { useEffect, useState } from "react";

export function useTheme() {
  const [darkMode, setDarkMode] = useState<boolean>(() =>
    typeof document !== "undefined"
      ? document.cookie.includes("theme=dark")
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Importar darkreader dinámicamente solo en el cliente
    import("darkreader").then(
      ({ enable: enableDark, disable: disableDark, setFetchMethod }) => {
        setFetchMethod(window.fetch);

        const mode = darkMode ? "dark" : "light";
        document.cookie = `theme=${mode}; path=/; max-age=31536000`;

        // aplica inmediatamente en la misma página
        if (darkMode) {
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

        // notifica globalmente para que el resto de las pages reaccionen
        window.dispatchEvent(
          new CustomEvent("theme:changed", { detail: { theme: mode } })
        );
      }
    );
  }, [darkMode]);

  const toggleTheme = () => setDarkMode((v) => !v);

  return { darkMode, toggleTheme };
}
