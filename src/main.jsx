import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./context/ThemeContext";
import { SearchProvider } from "./context/SearchContext"; // Add this import

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SearchProvider> {/* Wrap outside BrowserRouter */}
      <BrowserRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </SearchProvider>
  </React.StrictMode>
);