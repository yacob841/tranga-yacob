import React, { useState, useEffect, useRef } from 'react';
import useApi, { getCoverAsBlob } from '../api/client';

const MangaDetailsModal = ({ isOpen, onClose, manga, mode = 'search', libraries = [], connectors = [], onAddToWatchlist, coverUrl: propCoverUrl, selectedConnector = '' }) => {
  const [loading, setLoading] = useState(true);
  const [fullManga, setFullManga] = useState(null);
  const [internalCoverUrl, setInternalCoverUrl] = useState('');
  const [chapters, setChapters] = useState([]);
  const [selectedLib, setSelectedLib] = useState('');
  const [selectedConn, setSelectedConn] = useState('');
  const isMountedRef = useRef(true);

  const statusMap = {
    0: 'Continuing',
    1: 'Completed',
    2: 'Hiatus',
    3: 'Cancelled',
    4: 'Unreleased'
  };

  // Filter relevant connectors for search mode
  const relevantConnectors = mode === 'search' ? 
    (manga.availableConnectors?.length > 0 ? 
      connectors.filter(c => manga.availableConnectors.includes(c.name)) 
    : selectedConnector ? 
      connectors.filter(c => c.name === selectedConnector)
    : connectors // fallback all
    ) : connectors;

  // Retry wrapper for cover fetch
  const fetchCoverWithRetry = async (key, size, retries = 2) => { // Increased retries
    try {
      return await getCoverAsBlob(key, size);
    } catch (err) {
      if (retries > 0 && (err.message?.includes('503') || err.message?.includes('timeout'))) {
        console.log(`Retrying cover fetch for ${key}, retries left: ${retries}`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
        return fetchCoverWithRetry(key, size, retries - 1);
      }
      throw err;
    }
  };

  const loadData = async () => {
    console.log('loadData started, isMounted:', isMountedRef.current);
    if (!isOpen || !manga?.key) {
      console.log('Early return in loadData');
      return;
    }

    try {
      // For search mode, prioritize manga.coverUrl as remote URL
      if (mode === 'search' && manga.coverUrl) {
        if (isMountedRef.current) {
          setInternalCoverUrl(manga.coverUrl);
          console.log('Using search coverUrl:', manga.coverUrl);
        }
      }

      // Fetch full manga with fallback for search mode
      let fullMangaRes;
      try {
        fullMangaRes = await useApi(`/v2/Manga/${manga.key}`, 'GET');
        console.log('Fetched fullManga in modal:', fullMangaRes);
      } catch (fetchErr) {
        if (fetchErr.message?.includes('404')) {
          console.log('Manga not cached (search mode), using props');
          fullMangaRes = manga;  // Fallback to search/watchlist prop
        } else {
          console.error('Unexpected fetch error:', fetchErr);
          throw fetchErr;  // Re-throw non-404
        }
      }
      if (isMountedRef.current) {
        console.log('Setting fullManga');
        setFullManga(fullMangaRes);
        // Preselect current library for watchlist
        if (mode === 'watchlist' && fullMangaRes.fileLibraryId) {
          setSelectedLib(fullMangaRes.fileLibraryId);
        } else if (libraries.length > 0) {
          setSelectedLib(libraries[0].key);
        }
        // Preselect connector for search
        if (mode === 'search' && relevantConnectors.length > 0) {
          setSelectedConn(relevantConnectors[0].key);
        }
      } else {
        console.log('Skipped setFullManga, unmounted');
      }

      // Fetch chapters for downloaded count
      if (mode === 'watchlist') {
        try {
          const chaptersRes = await useApi(`/v2/Chapters/Manga/${manga.key}`, 'GET');
          if (isMountedRef.current) {
            setChapters(chaptersRes || []);
          }
        } catch (chapErr) {
          console.error('Chapters fetch error:', chapErr);
        }
      }

      // Fetch cover for watchlist (with retry), only if no URL set
      const finalCoverUrl = propCoverUrl || internalCoverUrl;
      if (!finalCoverUrl && mode === 'watchlist') {
        try {
          const blob = await fetchCoverWithRetry(manga.key, 'Original');
          if (isMountedRef.current && blob) {
            // Enhanced validation and fallback
            let validBlob = blob;
            if (!(blob instanceof Blob)) {
              // If it's a buffer or array, create Blob
              if (blob.buffer || Array.isArray(blob)) {
                validBlob = new Blob([blob], { type: 'image/jpeg' });
              } else {
                console.warn('Unexpected blob type, skipping:', typeof blob);
                return;
              }
            }
            // Always create URL if Blob-like
            const url = URL.createObjectURL(validBlob);
            console.log('Cover loaded for', manga.key, ':', url, 'blob type:', validBlob.type, 'size:', validBlob.size || 'unknown');
            setInternalCoverUrl(url);
          } else {
            console.warn('No valid blob returned for cover');
          }
        } catch (coverErr) {
          console.error('Cover fetch error:', coverErr);
          // Fallback to placeholder or search URL if available
          if (manga.coverUrl) {
            setInternalCoverUrl(manga.coverUrl);
          }
        }
      }
    } catch (err) {
      console.error('Modal load error:', err);
    } finally {
      console.log('Finally block: setting loading to false, isMounted:', isMountedRef.current);
      if (isMountedRef.current) {
        setLoading(false);
      } else {
        console.log('Skipped setLoading false, unmounted');
      }
    }
  };

  useEffect(() => {
    console.log('useEffect triggered, isOpen:', isOpen, 'manga.key:', manga?.key);
    if (isOpen) {
      isMountedRef.current = true;  // Reset mounted state when opening
      loadData().catch(err => {
        console.error('Modal load failed:', err);
        if (isMountedRef.current) setLoading(false);
      });
    } else {
      // Cleanup URL on close
      if (internalCoverUrl.startsWith('blob:')) {
        URL.revokeObjectURL(internalCoverUrl);
      }
      isMountedRef.current = false;
    }
    return () => {
      console.log('useEffect cleanup: setting unmounted');
      if (internalCoverUrl.startsWith('blob:')) {
        URL.revokeObjectURL(internalCoverUrl);
      }
      isMountedRef.current = false;
    };
  }, [isOpen, manga?.key]);

  const displayManga = fullManga || manga;
  console.log('Render: loading=', loading, 'displayManga=', !!displayManga ? 'exists' : 'null', 'fullManga=', !!fullManga);
  const { year, originalLanguage, fileLibraryId, releaseStatus } = displayManga || {};
  const displayStatus = statusMap[releaseStatus] || 'Unknown';
  const currentLibName = libraries.find(lib => lib.key === fileLibraryId)?.libraryName || 'Unassigned';
  const isCurrentlyUnassigned = !fileLibraryId;
  const showUnassignedOption = mode === 'watchlist' && isCurrentlyUnassigned;
  const totalChapters = displayManga.chapterIds?.length || 0;
  const downloadedChapters = chapters.filter(ch => ch.downloaded).length;

  // Deduplicate and filter alt titles
  const filteredAltTitles = React.useMemo(() => {
    if (!displayManga.altTitles) return [];
    const uniqueTitles = new Map();
    displayManga.altTitles.forEach(alt => {
      if (['Korean', 'Chinese', 'Japanese'].some(lang => alt.language.toLowerCase().includes(lang.toLowerCase()))) {
        if (!uniqueTitles.has(alt.title)) {
          uniqueTitles.set(alt.title, alt);
        }
      }
    });
    return Array.from(uniqueTitles.values());
  }, [displayManga.altTitles]);

  const filterEnglishDescription = (desc) => {
    if (!desc) return '';
    // Common non-English indicators (expand as needed)
    const nonEnglishRegex = /(German\s*\/\s*Deutsch|Japanese|French|Spanish|Italian|Chinese|Korean|Deutsch|Français|Español|Italiano|中文|日本語|한국어)/i;
    const match = desc.match(nonEnglishRegex);
    if (match) {
      return desc.substring(0, match.index).trim();  // Keep up to indicator
    }
    return desc;  // No match, full text
  };

  const handleAdd = async () => {
    if (!selectedLib || !selectedConn || libraries.length === 0) {
      alert('Missing library or connector');
      return;
    }
    console.log('handleAdd: selectedLib=', selectedLib, 'selectedConn=', selectedConn); // Debug
    setLoading(true);
    try {
      // First, set as download from connector (creates manga)
      await useApi(`/v2/Manga/${manga.key}/DownloadFrom/${selectedConn}/true`, 'POST');
      console.log('SetAsDownloadFrom completed for', manga.key); // Log after SetAsDownloadFrom
      // Wait time increased to 1000ms
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Then assign library (send empty string body for POST)
      await useApi(`/v2/Manga/${manga.key}/ChangeLibrary/${selectedLib}`, 'POST', '');
      console.log('ChangeLibrary completed for', manga.key); // Log after ChangeLibrary
      // Refetch full manga to update UI immediately and log library
      const updatedManga = await useApi(`/v2/Manga/${manga.key}`, 'GET');
      console.log('Fetched manga after add: fileLibraryId =', updatedManga.fileLibraryId); // Log after GET
      setFullManga(updatedManga);
      onClose(true);  // Close modal, signal parent to refresh list
    } catch (err) {
      console.error('Add error:', err);
      alert(`Failed to add: ${err.message}`);  // Temporary
    } finally {
      setLoading(false);
    }
  };

  const handleAssignLibrary = async (newLib) => {
    if (!manga?.key || !newLib || newLib === '') {
      console.error('Invalid params:', { mangaKey: manga?.key, newLib });
      alert('Invalid manga or library selected');
      return;
    }
    console.log('Assigning library:', newLib, 'for manga:', manga.key);
    try {
      setLoading(true);
      // Send empty string body for POST
      await useApi(`/v2/Manga/${manga.key}/ChangeLibrary/${newLib}`, 'POST', '');
      console.log('API call succeeded for assign');
      // Refetch to update display and log
      const updatedManga = await useApi(`/v2/Manga/${manga.key}`, 'GET');
      console.log('Updated manga fileLibraryId after assign:', updatedManga.fileLibraryId); // Debug
      setFullManga(updatedManga);
    } catch (err) {
      console.error('Assign library error:', err);
      if (err.response?.status === 404) {
        alert(`404: Check if manga ID \"${manga.key}\" and library ID \"${newLib}\" exist (test in Swagger)`);
      }
      alert(`Failed to assign library: ${err.message}`);  // Temporary
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWatchlist = async () => {
    if (!manga?.key || !displayManga.mangaConnectorIds?.[0]?.mangaConnectorName) {
      alert(`Cannot remove: Missing connector info`);
      return;
    }
    const connId = displayManga.mangaConnectorIds[0].mangaConnectorName;
    try {
      setLoading(true);
      await useApi(`/v2/Manga/${manga.key}/DownloadFrom/${connId}/false`, 'POST');
      console.log('Removed from watchlist:', manga.key);
      alert('Removed from watchlist!');  // Temporary
      onClose(true);  // Close and refresh
    } catch (err) {
      console.error('Remove error:', err);
      alert(`Failed to remove: ${err.message}`);  // Temporary
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const currentCoverUrl = propCoverUrl || internalCoverUrl;

  if (!isOpen || !manga) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleOverlayClick}>
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto flex flex-col lg:flex-row">
        {/* Left: Cover (full width on mobile, sticky scroll on lg) */}
        <div className="w-full lg:w-80 p-6 lg:sticky lg:top-0 lg:h-full overflow-y-auto bg-white dark:bg-gray-800">
          <div className="relative">
            <img
              src={currentCoverUrl || '/placeholder.jpg'}
              alt={`${displayManga.name} cover`}
              className="w-full max-h-96 object-cover rounded-lg"
              onError={(e) => {
                console.warn('Cover img load error, fallback to placeholder');
                e.target.src = '/placeholder.jpg';
              }}
            />
            {displayManga.mangaConnectorIds?.[0]?.websiteUrl && (
              <a
                href={displayManga.mangaConnectorIds[0].websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-2 right-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-transparent text-primary dark:text-primary border border-primary hover:bg-primary/10"
                title="Open on Connector"
              >
                {displayManga.mangaConnectorIds[0].mangaConnectorName} ↗
              </a>
            )}
          </div>

          {/* Tags under cover */}
          <div className="flex flex-wrap gap-2 justify-start mt-4">
            {displayManga.tags?.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border border-primary text-primary dark:border-primary dark:text-primary"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Filtered Alt Titles (renamed to Other Titles for brevity) */}
          {filteredAltTitles.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Other Titles</label>
              <ul className="space-y-1">
                {filteredAltTitles.map((alt, i) => (
                  <li key={i} className="text-sm text-gray-900 dark:text-gray-100">{alt.title} ({alt.language})</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: Content */}
        <div className="flex-1 p-6 min-w-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{displayManga?.name || 'Loading...'}</h2>
            <button onClick={() => onClose()} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200">
              ✕
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="space-y-6">
              {/* Status */}
              <div className="mb-4">
                <p className="text-sm text-gray-900 dark:text-gray-100">Status: {displayStatus}</p>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <div className="prose dark:prose-invert max-w-none mt-1">
                  <p>{filterEnglishDescription(displayManga.description)}</p>
                </div>
              </div>

              {/* Chapters */}
              {totalChapters > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-900 dark:text-gray-100">Chapters: {downloadedChapters}/{totalChapters} Downloaded</p>
                </div>
              )}

              {year && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Year</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{year}</p>
                </div>
              )}

              {originalLanguage && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Original Language</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{originalLanguage}</p>
                </div>
              )}

              {mode === 'search' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Library</label>
                    <select
                      value={selectedLib}
                      onChange={(e) => setSelectedLib(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                    >
                      {libraries.map(lib => (
                        <option key={lib.key} value={lib.key}>{lib.libraryName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Connector</label>
                    <select
                      value={selectedConn}
                      onChange={(e) => setSelectedConn(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                    >
                      {relevantConnectors.map(conn => (
                        <option key={conn.key} value={conn.key}>{conn.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleAdd}
                    disabled={loading}
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add to Library'}
                  </button>
                </div>
              )}

              {mode === 'watchlist' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Library</label>
                    <select
                      value={selectedLib}
                      onChange={(e) => setSelectedLib(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                    >
                      {showUnassignedOption && <option value="">Unassigned</option>}
                      {libraries.map(lib => (
                        <option key={lib.key} value={lib.key}>{lib.libraryName}</option>
                      ))}
                    </select>
                    {selectedLib && selectedLib !== fileLibraryId && (
                      <button
                        onClick={() => handleAssignLibrary(selectedLib)}
                        disabled={loading}
                        className="w-full mt-2 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:opacity-50"
                      >
                        {loading ? 'Assigning...' : 'Assign to Library'}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleRemoveFromWatchlist}
                    disabled={loading}
                    className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 disabled:opacity-50"
                  >
                    {loading ? 'Removing...' : 'Remove from Watchlist'}
                  </button>
                </div>
              )}

              {/* Website Links (no label) */}
              {displayManga.links?.length > 0 && (
                <div className="mb-4">
                  <ul className="space-y-1">
                    {displayManga.links.map((link, i) => (
                      <li key={i}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {link.provider}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MangaDetailsModal;