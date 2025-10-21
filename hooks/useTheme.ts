"use client";

import { useEffect, useState } from "react";

export function useTheme() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof document !== "undefined") {
      return document.cookie.includes("theme=dark");
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;

    if (darkMode) {
      root.classList.add("dark-mode");
      document.cookie = "theme=dark; path=/; max-age=31536000";
    } else {
      root.classList.remove("dark-mode");
      document.cookie = "theme=light; path=/; max-age=31536000";
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode((prev) => !prev);

  return { darkMode, toggleTheme };
}
