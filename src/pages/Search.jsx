import React, { useState, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useSearchContext } from '../context/SearchContext';
import MangaCard from '../components/MangaCard';
import SearchBar from '../components/SearchBar';
import Toast from '../components/Toast';
import useApi from '../api/client';
import Skeleton from '../components/Skeleton';
import { useData } from '../context/DataContext';

export default function Search() {
  console.log('Search rendering...');
  const { results, setResults, search: contextSearch, selectedConnector, setSelectedConnector, query, setQuery } = useSearchContext();
  const { connectors } = useData(); // Dynamic enabled connectors
  const [toast, setToast] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false); // Ensure defined
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: '', year: '' });
  const [localFilteredResults, setLocalFilteredResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [libraries, setLibraries] = useState([]);
  const [selectedLibrary, setSelectedLibrary] = useState(''); // Note: lowercase 'l' for consistency

  // Dynamic connectors: Filter enabled, map to names
  const enabledConnectors = (connectors || []).filter(c => c.enabled).map(c => c.name).sort();
  // Default to 'Global' if available
  useEffect(() => {
    if (enabledConnectors.includes('Global') && !selectedConnector) {
      setSelectedConnector('Global');
    }
  }, [enabledConnectors, selectedConnector]);

  useEffect(() => {
    const fetchLibraries = async () => {
      try {
        const data = await useApi('/v2/FileLibrary', 'GET');
        setLibraries(data || []);
        if (data.length > 0) setSelectedLibrary(data[0].key);
      } catch (err) {
        console.error('Libraries fetch error:', err);
      }
    };
    fetchLibraries();
  }, []);

  useEffect(() => {
    console.log('Filtering results:', results?.length);
    let filtered = (results || []);
    if (filters.status) {
      filtered = filtered.filter(m => m && m.releaseStatus === filters.status); // Guard m
    }
    if (filters.year) {
      filtered = filtered.filter(m => m && m.year?.toString() === filters.year); // Guard m
    }
    setLocalFilteredResults(filtered);
  }, [results, filters]);

  const showToast = (msg, type) => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const handleSearch = async () => {
    if (!query?.trim()) return;
    console.log('Handle search:', query, selectedConnector);
    setError(null);
    setHasSearched(true);
    setLoading(true);
    setIsSearching(true);
    try {
      if (query.startsWith('http://') || query.startsWith('https://')) {
        // URL search: POST /v2/Search/Url with body as plain JSON string (URL)
        const response = await useApi('/v2/Search/Url', 'POST', query); // Send string directly
        console.log('Full URL response:', response); // Debug full response
        console.log('Raw response.data:', response.data); // Debug data
        console.log('Has key?', response.data?.key); // Debug key existence
        const mangaData = response.data ? (Array.isArray(response.data) ? response.data : [response.data]) : [];
        console.log('Raw mangaData:', mangaData); // Debug before filter
        // Temporarily skip filter to test setter
        setResults(mangaData);
        console.log('Set results to:', mangaData); // Debug after set
        showToast('URL search completed', 'success');
      } else {
        // Regular search: Use contextSearch for connector/query, pass dummy setters for loading/isSearching
        await contextSearch(query, selectedConnector, () => {}, () => {}, setError);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Search failed');
      showToast(`Search failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const onAdd = async (manga) => {
    if (!selectedLibrary || libraries.length === 0) {
      showToast('Select a library first', 'error');
      return;
    }
    console.log('onAdd: selectedLibrary=', selectedLibrary, 'selectedConnector=', selectedConnector); // Debug
    try {
      await useApi(`/v2/Manga/${manga.key}/DownloadFrom/${selectedConnector}/true`, 'POST', {});
      console.log('DownloadFrom completed for', manga.key); // Log after SetAsDownloadFrom
      // Wait time increased to 1000ms
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Then assign library (send empty string body for POST)
      await useApi(`/v2/Manga/${manga.key}/ChangeLibrary/${selectedLibrary}`, 'POST', {});
      console.log('ChangeLibrary completed for', manga.key); // Log after ChangeLibrary
      // Refetch manga and log library
      const updatedManga = await useApi(`/v2/Manga/${manga.key}`, 'GET');
      console.log('Fetched manga after add: fileLibraryId =', updatedManga.fileLibraryId); // Log after GET
      showToast(`Added ${manga.name} to library`, 'success');
    } catch (err) {
      console.error('Add manga error:', err);
      showToast(`Failed to add: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => console.log('Swipe left'),
    onSwipedRight: () => console.log('Swipe right'),
    trackMouse: true,
  });

  console.log('Search: Rendering grid with', localFilteredResults.length, 'items');
  console.log('localFilteredResults data:', localFilteredResults);
  
  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Single row, uniform height */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch">
        <input
          type="text"
          value={query || ''}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          placeholder="Search manga..."
          className="flex-1 py-2.5 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all h-10 appearance-none"
        />
        <select 
          value={selectedConnector} 
          onChange={(e) => setSelectedConnector(e.target.value)}
          className="py-2.5 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all h-10 appearance-none bg-no-repeat bg-right pr-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDEgTDYgNiBMMTExIDEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=')]"
        >
          {enabledConnectors.map(conn => (
            <option key={conn} value={conn}>{conn}</option>
          ))}
        </select>
        <select 
          value={filters.status} 
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="py-2.5 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all h-10 appearance-none bg-no-repeat bg-right pr-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDEgTDYgNiBMMTExIDEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=')]"
        >
          <option value="">All Status</option>
          <option value="0">Continuing</option>
          <option value="1">Completed</option>
          <option value="2">Hiatus</option>
          <option value="3">Cancelled</option>
          <option value="4">Unreleased</option>
        </select>
        <button 
          onClick={handleSearch} 
          className="px-4 py-2.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all h-10"
        >
          Search
        </button>
      </div>

      {(loading || isSearching) && (
        <div className="flex flex-col items-center py-4 gap-2">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Searching...</span>
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-lg text-red-500 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {!(loading || isSearching) && (
        !hasSearched ? (
          <div className="text-center py-8">
            <p className="text-lg text-gray-500 dark:text-gray-400">Try searching!</p>
          </div>
        ) : localFilteredResults.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-lg text-gray-500 dark:text-gray-400">No manga found.</p>
          </div>
        ) : (
          <div {...handlers} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(localFilteredResults || []).map((mangaItem, index) => (
              <MangaCard 
                key={mangaItem.key || mangaItem.providerId || index} 
                manga={mangaItem} 
                onAdd={onAdd} 
                mode="search"
                libraries={libraries}
                connectors={connectors}
                selectedLibrary={selectedLibrary}
                setSelectedLibrary={setSelectedLibrary}
                selectedConnector={selectedConnector}
              />
            ))}
          </div>
        )
      )}
      <div>
        {toast.message && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />}
      </div>
    </div>
  );
}