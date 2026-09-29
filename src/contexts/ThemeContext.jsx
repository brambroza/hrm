import React, { createContext, useContext, useEffect } from 'react';

/** The application has one theme. */
export const THEME = 'light';

const ThemeContext = createContext({
  theme: THEME,
  toggleTheme: () => {},
});

/**
 * The current theme. Always light; kept as a hook so components that ask for
 * the theme, such as the charts, need no change.
 * @returns {{theme: 'light', toggleTheme: () => void}}
 */
export const useTheme = () => useContext(ThemeContext);

/**
 * Provides the theme to the application.
 *
 * There used to be a dark theme, chosen from a saved preference or from the
 * operating system. It was removed: anyone who had chosen it, or whose system
 * is set to dark, now gets the light theme too, and the saved choice is cleared
 * so it cannot come back.
 *
 * @param {{children: React.ReactNode}} props
 * @returns {JSX.Element}
 */
export const ThemeContextProvider = ({ children }) => {
  useEffect(() => {
    try {
      localStorage.removeItem('theme');
    } catch (_) {
      // Storage can be unavailable in private windows; the theme does not depend on it.
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: THEME, toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
};
