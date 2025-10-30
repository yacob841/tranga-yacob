import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'forestNight');

  useEffect(() => {
    // Apply theme instantly
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.add(theme);
    // Remove other theme classes
    ['forestNight', 'studioDashboard', 'darkCyber', 'softManga', 'sakuraDream'].forEach(t => {
      if (t !== theme) document.documentElement.classList.remove(t);
    });
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;