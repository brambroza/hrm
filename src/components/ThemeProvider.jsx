import React, { useEffect } from 'react';
import { THEME, ThemeContextProvider } from '@/contexts/ThemeContext';

/**
 * Puts the light theme on the document. The `dark` class is what switches
 * Tailwind's dark styles on, so it is removed and never added.
 * @param {{children: React.ReactNode}} props
 * @returns {JSX.Element}
 */
const ThemeApplier = ({ children }) => {
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.add(THEME);
    root.style.colorScheme = THEME;
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {children}
    </div>
  );
};

const ThemeProvider = ({ children }) => (
  <ThemeContextProvider>
    <ThemeApplier>{children}</ThemeApplier>
  </ThemeContextProvider>
);

export default ThemeProvider;
