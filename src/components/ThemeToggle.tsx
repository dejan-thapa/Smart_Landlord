"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
    setMounted(true);

    const observer = new MutationObserver(() => {
      const nowDark = document.documentElement.classList.contains("dark");
      setTheme(nowDark ? "dark" : "light");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    try {
      localStorage.setItem("theme", nextTheme);
    } catch {
      // Ignore storage errors
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={mounted ? `Switch to ${theme === "dark" ? "light" : "dark"} mode` : "Toggle theme"}
        title={mounted ? `Switch to ${theme === "dark" ? "light" : "dark"} mode` : "Toggle theme"}
        className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
      >
        {mounted && theme === "dark" ? (
          <Sun size={16} className="text-amber-400" />
        ) : (
          <Moon size={16} className="text-teal-400" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={mounted ? `Switch to ${theme === "dark" ? "light" : "dark"} mode` : "Toggle theme"}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer group"
    >
      <span className="flex items-center gap-2.5">
        {mounted && theme === "dark" ? (
          <Moon size={15} className="text-teal-400 shrink-0" />
        ) : (
          <Sun size={15} className="text-amber-400 shrink-0" />
        )}
        <span>{mounted ? (theme === "dark" ? "Dark Theme" : "Light Theme") : "Appearance"}</span>
      </span>
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700 group-hover:border-teal-500/40 group-hover:text-teal-300 transition-colors">
        {mounted ? (theme === "dark" ? "Dark" : "Light") : "Auto"}
      </span>
    </button>
  );
}
