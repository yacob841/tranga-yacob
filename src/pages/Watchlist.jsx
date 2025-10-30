import React, { useState, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useSearchContext } from '../context/SearchContext';
import MangaCard from '../components/MangaCard';
import QuickActions from '../components/QuickActions';
import Toast from '../components/Toast';
import useApi from '../api/client';
import { apiClient } from '../api/client';
import { useData } from '../context/DataContext';

export default function Watchlist() {
  console.log('Watchlist rendering...');
  const { watchlistResults, setWatchlistResults } = useSearchContext();
  const { libraries: cachedLibs, connectors: cachedConns } = useData(); // Use cached
  const [toast, setToast] = useState({ message: '', type: '' });
  const [selected, setSelected] = useState([]);
  const [libraries, setLibraries] = useState(cachedLibs); // Fallback to cached
  const [selectedLibrary, setSelectedLibrary] = useState('all'); // 'all', 'unassigned', or key
  const [connectors, setConnectors] = useState(cachedConns); // Fallback to cached

  // Update local from cached on change
  useEffect(() => {
    setLibraries(cachedLibs);
    if (cachedLibs.length > 0 && selectedLibrary === '') setSelectedLibrary(cachedLibs[0].key);
  }, [cachedLibs]);

  useEffect(() => {
    setConnectors(cachedConns);
  }, [cachedConns]);

  // Initial library load on mount (/v2/Manga/Downloading, all results) - refresh on selectedLibrary change
  useEffect(() => {
    console.log('Library mount effect');
    const loadLibrary = async () => {
      try {
        const client = apiClient();
        const response = await client.get('/v2/Manga/Downloading');
        const data = response.data || [];
        if (setWatchlistResults) {
          setWatchlistResults(data);
        }
      } catch (err) {
        console.error('Library load error:', err);
        if (setWatchlistResults) {
          setWatchlistResults([]);
        }
      }
    };
    loadLibrary();
  }, [setWatchlistResults, selectedLibrary]); // Add selectedLibrary dep for refresh

  // Issue 7: Filter logic
  const filteredWatchlist = (watchlistResults || []).filter((manga) => {
    const libId = manga.fileLibraryId?.key;
    if (selectedLibrary === 'all') return true;
    if (selectedLibrary === 'unassigned') return !libId;
    return libId === selectedLibrary;
  });

  const showToast = (msg, type) => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const handleSelect = (id) => {
    setSelected(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id) 
        : [...prev, id]
    );
  };

  const bulkDownload = async () => {
    try {
      await Promise.all(selected.map(id => useApi(`/v2/Manga/${id}/Download`, 'POST')));
      showToast(`Downloaded ${selected.length} manga`, 'success');
      setSelected([]);
    } catch (err) {
      console.error('Bulk download error:', err);
      showToast('Bulk download failed', 'error');
    }
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => console.log('Swipe left'),
    onSwipedRight: () => console.log('Swipe right'),
    trackMouse: true,
  });

  if (!watchlistResults) {
    console.log('Library: No results, showing loading');
    return <div className="p-4">Loading library...</div>;
  }

  console.log('Library: Rendering grid with', filteredWatchlist.length, 'items');

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Library Dropdown with filter options (updated styles) */}
      <select 
        value={selectedLibrary} 
        onChange={(e) => setSelectedLibrary(e.target.value)}
        className="py-2.5 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all h-10 appearance-none bg-no-repeat bg-right pr-8 text-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDEgTDYgNiBMMTExIDEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=')]"
        aria-label="Select library"
      >
        <option value="all">All Libraries</option>
        <option value="unassigned">Unassigned</option>
        {libraries.map(lib => (
          <option key={lib.key} value={lib.key}>{lib.libraryName}</option>
        ))}
      </select>

      {selected.length > 0 && <QuickActions selected={selected} onBulkDownload={bulkDownload} />}
      <div {...handlers} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWatchlist.map(mangaItem => (
          <MangaCard 
            key={mangaItem.providerId || mangaItem.key || Math.random()} 
            manga={mangaItem} 
            checkbox={true}
            onSelect={handleSelect}
            mode="watchlist"
            libraries={libraries}
            connectors={connectors}
            selectedLibrary={selectedLibrary}
            setSelectedLibrary={setSelectedLibrary}
          />
        ))}
      </div>
      <div>
        {toast.message && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />}
      </div>
    </div>
  );
}