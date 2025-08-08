import { useThemeStore } from "../store/useThemeStore";
import { Moon, Sun } from "lucide-react";

const ThemeToggle = () => {
  const { theme, setTheme } = useThemeStore();
  const isDark = theme === "coffee" || theme === "black" || theme === "dracula" || theme === "night" || theme === "dim" || theme === "forest";

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "coffee";
    setTheme(newTheme);
  };

  return (
    <button onClick={toggleTheme} className="btn btn-ghost btn-circle">
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
};

export default ThemeToggle;