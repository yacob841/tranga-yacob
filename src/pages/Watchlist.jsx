import React, { useState, useEffect, useMemo } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useSearchContext } from '../context/SearchContext';
import { Filter, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';
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
  const [connectors, setConnectors] = useState(cachedConns); // Fallback to cached
  const [showFilters, setShowFilters] = useState(false);

  // Filter states - Default to 'last-chap' desc for flipped order
  const [filters, setFilters] = useState({
    connector: '',
    status: '',
    sortBy: 'title',
    sortDirection: 'asc',
  });

  // Update local from cached on change
  useEffect(() => {
    setLibraries(cachedLibs || []);
  }, [cachedLibs]);

  useEffect(() => {
    setConnectors(cachedConns || []);
  }, [cachedConns]);

  // Initial load on mount (/v2/Manga/Downloading, all results)
  useEffect(() => {
    console.log('Library mount effect');
    const loadLibrary = async () => {
      try {
        const client = apiClient();
        const response = await client.get('/v2/Manga/Downloading');
        const data = response.data || [];

        // Enrich with lastDownloadedChapter
        const enrichedManga = await Promise.all(
          data.map(async (m) => {
            try {
              const downloadedChapters = await useApi(`/v2/Chapters/Manga/${m.key}`, 'POST', JSON.stringify({ downloaded: true }));
              const lastDownloaded = downloadedChapters?.length > 0 
                ? Math.max(...downloadedChapters.map(ch => ch.chapterNumber || 0))
                : 0;
              return { ...m, lastDownloadedChapter: lastDownloaded };
            } catch (err) {
              console.error(`Error fetching chapters for ${m.key}:`, err);
              return { ...m, lastDownloadedChapter: 0 };
            }
          })
        );

        if (setWatchlistResults) {
          setWatchlistResults(enrichedManga);
        }
      } catch (err) {
        console.error('Library load error:', err);
        if (setWatchlistResults) {
          setWatchlistResults([]);
        }
      }
    };
    loadLibrary();
  }, [setWatchlistResults]);

  // Comprehensive filter logic with useMemo
  const filteredWatchlist = useMemo(() => {
    let filtered = [...(watchlistResults || [])];

    // Connector filter (exclude Global)
    if (filters.connector) {
      filtered = filtered.filter(m => {
        const primary = m.mangaConnectorIds?.find(c => c.useForDownload) || m.mangaConnectorIds?.[0];
        return primary?.mangaConnectorName === filters.connector;
      });
    }

    // Status filter
    if (filters.status !== '') {
      filtered = filtered.filter(m => m.releaseStatus === parseInt(filters.status));
    }

    // Sort
    filtered.sort((a, b) => {
      let valA, valB;
      if (filters.sortBy === 'title') {
        valA = a.name || '';
        valB = b.name || '';
        return filters.sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else if (filters.sortBy === 'last-chap') {
        valB = a.lastDownloadedChapter || 0;
        valA = b.lastDownloadedChapter || 0;
        return filters.sortDirection === 'asc' 
          ? valA - valB 
          : valB - valA;
      }
      return 0;
    });

    return filtered;
  }, [watchlistResults, filters]);

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

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleSortDirection = () => {
    setFilters(prev => ({
      ...prev,
      sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc'
    }));
  };

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: '0', label: 'Continuing' },
    { value: '1', label: 'Completed' },
    { value: '2', label: 'Hiatus' },
    { value: '3', label: 'Cancelled' },
    { value: '4', label: 'Unreleased' }
  ];

  const sortFieldOptions = [
    { value: 'title', label: 'Alphabetical' },
    { value: 'last-chap', label: 'Latest Download' }
  ];

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Watchlist ({filteredWatchlist.length})</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center"
        >
          <Filter size={16} className="mr-2" />
          Filters
          {showFilters ? <ChevronUp size={16} className="ml-2" /> : <ChevronDown size={16} className="ml-2" />}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-md space-y-4 mb-6" style={{ minHeight: '200px' }}>
          {/* Connector Filter - Exclude Global */}
          <div>
            <label className="block text-sm font-medium mb-2">Connector</label>
            <select
              value={filters.connector}
              onChange={(e) => updateFilter('connector', e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700"
            >
              <option value="">All Connectors</option>
              {connectors.filter(c => c.enabled && c.name !== 'Global').map(c => (
                <option key={c.key} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Sort Filter */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
                className="w-full p-2 border rounded-md dark:bg-gray-700"
              >
                {sortFieldOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={toggleSortDirection}
              className="p-2 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center"
              title="Toggle Sort Direction"
            >
              {filters.sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            </button>
          </div>
        </div>
      )}

      {selected.length > 0 && <QuickActions selected={selected} onBulkDownload={bulkDownload} />}
      <div {...handlers} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[600px]">
        {filteredWatchlist.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-lg text-gray-500 dark:text-gray-400">No manga found matching the filters.</p>
          </div>
        ) : (
          filteredWatchlist.map(mangaItem => (
            <MangaCard 
              key={mangaItem.providerId || mangaItem.key || Math.random()} 
              manga={mangaItem} 
              checkbox={true}
              onSelect={handleSelect}
              mode="watchlist"
              libraries={libraries}
              connectors={connectors}
              selectedLibrary={filters.library}
              setSelectedLibrary={() => {}} // No-op since integrated
            />
          ))
        )}
      </div>
      <div>
        {toast.message && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />}
      </div>
    </div>
  );
}