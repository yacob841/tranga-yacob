import React, { createContext, useContext, useState, useMemo } from 'react';
import { apiClient } from '../api/client';

const SearchContext = createContext();

export const useSearchContext = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearchContext must be used within a SearchProvider');
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  console.log('SearchProvider rendering...');
  const [results, setResults] = useState([]);
  const [watchlistResults, setWatchlistResults] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedConnector, setSelectedConnector] = useState('');

  const search = async (searchQuery = '', connector = '', setLoading, setIsSearching, setError) => {
    console.log('Search called with:', searchQuery, connector);
    try {
      setError(null); // Clear error
      const client = apiClient();
      let data = [];
      if (connector === '') {
        // Global: parallel calls to enabled connectors, merge unique by key, collect connectors per manga
        const connectorsRes = await client.get('/v2/MangaConnector');
        const enabled = connectorsRes.data.filter(c => c.enabled).map(c => c.name);
        const promises = enabled.map(conn => 
          client.get(`/v2/Search/${conn}/${encodeURIComponent(searchQuery)}`).then(res => {
            const items = res.data || [];
            return items.map(item => ({...item, sourceConnector: conn}));
          })
        );
        const allDataWithSource = await Promise.all(promises);
        const flatWithSource = allDataWithSource.flat();
        const mangaMap = new Map();
        flatWithSource.forEach(item => {
          if (!mangaMap.has(item.key)) {
            mangaMap.set(item.key, {...item, availableConnectors: []});
          }
          const manga = mangaMap.get(item.key);
          if (!manga.availableConnectors.includes(item.sourceConnector)) {
            manga.availableConnectors.push(item.sourceConnector);
          }
        });
        data = Array.from(mangaMap.values());
        console.log('Global merged results:', data);
      } else {
        // Single connector
        const response = await client.get(`/v2/Search/${connector}/${encodeURIComponent(searchQuery)}`);
        data = (response.data || []).map(d => ({...d, availableConnectors: [connector]}));
        console.log('Single connector results:', data);
      }
      setResults(data);
      setQuery(searchQuery);
      setSelectedConnector(connector);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
      if (setError) setError(err.message || 'Search failed (404 or error)'); // Set error for page
    } finally {
      if (setLoading) setLoading(false);
      if (setIsSearching) setIsSearching(false); // Stop spinner
    }
  };

  const value = useMemo(() => ({
    results,
    setResults,
    watchlistResults,
    setWatchlistResults,
    search,
    query,
    setQuery,
    selectedConnector,
    setSelectedConnector
  }), [results, watchlistResults, query, selectedConnector]);

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

export default SearchContext;