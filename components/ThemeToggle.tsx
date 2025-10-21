"use client";

import { useTheme } from "@/hooks/useTheme";
import { Switch } from "@/components/ui/switch";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      {darkMode ? <Moon size={18} /> : <Sun size={18} />}
      <Switch checked={darkMode} onCheckedChange={toggleTheme} />
    </div>
  );
}
