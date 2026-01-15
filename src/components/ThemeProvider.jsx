
import React, { useEffect } from 'react';
import { ThemeContextProvider, useTheme } from '@/contexts/ThemeContext';

const ThemeApplier = ({ children }) => {
  const { theme } = useTheme();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300 font-sans">
      {children}
    </div>
  );
};

const ThemeProvider = ({ children }) => {
  return (
    <ThemeContextProvider>
      <ThemeApplier>{children}</ThemeApplier>
    </ThemeContextProvider>
  );
};

export default ThemeProvider;
