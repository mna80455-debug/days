import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('neutral');
  const [isManual, setIsManual] = useState(false);

  const getThemeByHour = (hour) => {
    if (hour >= 5 && hour < 11) {
      return 'morning';
    } else if (hour >= 11 && hour < 17) {
      return 'neutral';
    } else {
      return 'evening';
    }
  };

  const updateThemeAutomatically = () => {
    if (isManual) return;
    const currentHour = new Date().getHours();
    const calculatedTheme = getThemeByHour(currentHour);
    setTheme(calculatedTheme);
  };

  useEffect(() => {
    // Initial check
    updateThemeAutomatically();

    // Check every minute
    const interval = setInterval(updateThemeAutomatically, 60000);
    return () => clearInterval(interval);
  }, [isManual]);

  // Apply theme class to document element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-morning', 'theme-neutral', 'theme-evening');
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  // Manual override for testing/verification
  const setManualTheme = (newTheme) => {
    setIsManual(true);
    setTheme(newTheme);
  };

  const resetToAutomatic = () => {
    setIsManual(false);
    const currentHour = new Date().getHours();
    setTheme(getThemeByHour(currentHour));
  };

  return (
    <ThemeContext.Provider value={{ theme, isManual, setManualTheme, resetToAutomatic }}>
      {children}
    </ThemeContext.Provider>
  );
};
