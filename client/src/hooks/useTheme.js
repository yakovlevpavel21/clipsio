import { useEffect, useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const root = window.document.documentElement;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (theme === 'dark') {
      root.classList.add('dark');
      // Цвет твоей темной панели (например, #1a1f2e)
      metaThemeColor?.setAttribute('content', '#1a1f2e'); 
    } else {
      root.classList.remove('dark');
      // Цвет твоей светлой панели (например, #ffffff)
      metaThemeColor?.setAttribute('content', '#ffffff');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return { theme, toggleTheme };
}