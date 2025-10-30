import React, { StrictMode } from 'react';
import Navbar from './components/Navbar';
import Search from './pages/Search';
import Watchlist from './pages/Watchlist';
import Settings from './pages/Settings';
import Jobs from './pages/Jobs';
import ErrorBoundary from './components/ErrorBoundary';
import { Routes, Route } from 'react-router-dom';
import './index.css';
import { DataProvider } from './context/DataContext';
import MangaDetails from './pages/MangaDetails';

function App() {
  console.log('App rendering...');
  return (
    <DataProvider>
      <StrictMode>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 app-root">
          <Navbar />
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Search />} />
              <Route path="/search" element={<Search />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/manga/:id" element={<MangaDetails />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </StrictMode>
    </DataProvider>
  );
}

export default App;