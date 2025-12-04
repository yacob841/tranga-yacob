import React, { useState, useEffect } from 'react';
import { ExternalLink, Download, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useApi, { getCoverAsBlob } from '../api/client';
import MangaDetailsModal from './MangaDetailsModal';

const MangaCard = ({ 
  manga, 
  isLoading = false, 
  onAdd, 
  mode = 'watchlist', 
  libraries = [], 
  connectors = [], 
  selectedLibrary, 
  setSelectedLibrary,
  selectedConnector // Pass from parent for search mode
}) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [isCoverLoading, setIsCoverLoading] = useState(true);
  const [downloadedChapters, setDownloadedChapters] = useState(0);
  const [totalChapters, setTotalChapters] = useState(0);

  // Status map for display and colors
  const statusMap = {
    0: { text: 'Continuing', color: 'bg-green-500' },
    1: { text: 'Completed', color: 'bg-blue-500' },
    2: { text: 'Hiatus', color: 'bg-yellow-500' },
    3: { text: 'Cancelled', color: 'bg-red-500' },
    4: { text: 'Unreleased', color: 'bg-white border border-gray-300' }
  };

  const statusInfo = statusMap[manga.releaseStatus] || { text: 'Unknown', color: 'bg-gray-500' };

  // Connector badge info
  const primaryConnector = manga.mangaConnectorIds?.find(c => c.useForDownload) || manga.mangaConnectorIds?.[0];
  const connectorName = primaryConnector?.mangaConnectorName || 'Unknown';
  const websiteUrl = primaryConnector?.websiteUrl;

  // Retry wrapper for cover fetch (shared logic)
  const fetchCoverWithRetry = async (key, size, retries = 2) => {
    try {
      return await getCoverAsBlob(key, size);
    } catch (err) {
      if (retries > 0 && (err.message?.includes('503') || err.message?.includes('timeout'))) {
        console.log(`Retrying cover fetch for ${key} in card, retries left: ${retries}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchCoverWithRetry(key, size, retries - 1);
      }
      throw err;
    }
  };

  // Fetch downloaded chapters for watchlist
  const fetchChapters = async () => {
    if (mode !== 'watchlist' || !manga?.key) return;
    try {
      const [allChaptersRes, downloadedRes] = await Promise.all([
        useApi(`/v2/Chapters/Manga/${manga.key}?page=1&pageSize=1000`, 'POST', ''),
        useApi(`/v2/Chapters/Manga/${manga.key}?page=1&pageSize=1000`, 'POST', JSON.stringify({ downloaded: true }))
      ]);
      setTotalChapters(allChaptersRes.length || 0);
      setDownloadedChapters(downloadedRes.length || 0);
    } catch (err) {
      console.error('Chapters fetch error in card:', err);
      setTotalChapters(0);
      setDownloadedChapters(0);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadCover = async () => {
      if (!manga?.key || isLoading) {
        setIsCoverLoading(false);
        return;
      }

      try {
        setIsCoverLoading(true);
        // For search mode, use remote coverUrl if available
        if (mode === 'search' && manga.coverUrl) {
          if (mounted) {
            setCoverUrl(manga.coverUrl);
            console.log('Using search coverUrl in card:', manga.coverUrl);
          }
          setIsCoverLoading(false);
          return;
        }

        // Fetch blob for watchlist/local
        const blob = await fetchCoverWithRetry(manga.key, 'Original');
        if (mounted && blob) {
          let validBlob = blob;
          if (!(blob instanceof Blob)) {
            if (blob.buffer || Array.isArray(blob)) {
              validBlob = new Blob([blob], { type: 'image/jpeg' });
            } else {
              console.warn('Unexpected blob type in card, skipping:', typeof blob);
              setIsCoverLoading(false);
              return;
            }
          }
          const url = URL.createObjectURL(validBlob);
          console.log('Cover loaded for card', manga.key, ':', url, 'blob type:', validBlob.type, 'size:', validBlob.size || 'unknown');
          setCoverUrl(url);
        } else {
          console.warn('No valid blob returned for cover in card');
        }
      } catch (coverErr) {
        console.error('Cover fetch error in card for', manga.key, ':', coverErr);
        // Fallback to placeholder or search URL
        if (mode === 'search' && manga.coverUrl) {
          setCoverUrl(manga.coverUrl);
        }
      } finally {
        if (mounted) {
          setIsCoverLoading(false);
        }
      }
    };

    loadCover();
    if (mode === 'watchlist') fetchChapters();

    return () => {
      mounted = false;
      if (coverUrl.startsWith('blob:')) {
        URL.revokeObjectURL(coverUrl);
      }
    };
  }, [manga?.key, mode, isLoading]);

  const handleCardClick = (e) => {
    // Prevent propagation if clicking buttons
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('select')) return;
    if (mode === 'watchlist') {
      navigate(`/manga/${manga.key}`);
    } else {
      setShowModal(true);
    }
  };

  const handleAddClick = () => {
    if (mode === 'search' && onAdd && selectedLibrary) {
      onAdd(manga);
    }
  };

  const handleRemoveClick = async () => {
    if (!primaryConnector?.mangaConnectorName) return;
    try {
      await useApi(`/v2/Manga/${manga.key}/DownloadFrom/${primaryConnector.mangaConnectorName}/false`, 'POST', {});
      // Refresh or notify parent to refetch
      window.location.reload(); // Simple refresh for now
    } catch (err) {
      console.error('Remove error:', err);
      alert('Failed to remove from watchlist');
    }
  };

  if (isLoading) {
    return <div className="animate-pulse bg-var-surface rounded-lg h-96"></div>; // Taller skeleton
  }

  return (
    <>
      <div 
        className="bg-var-surface rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative flex flex-col" 
        onClick={handleCardClick}
      >
        <div className="relative flex-shrink-0">
          <img
            src={coverUrl || '/placeholder.jpg'}
            alt={`${manga.name} cover`}
            className="w-full h-96 object-cover" // Longer rectangular (h-96)
            onError={(e) => {
              console.warn('Cover img load error in card, fallback to placeholder');
              e.target.src = '/placeholder.jpg';
            }}
          />
          {isCoverLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
          {/* Status dot in top right */}
          <div 
            className={`absolute top-2 right-2 w-3 h-3 rounded-full ${statusInfo.color} shadow-lg`}
            title={`Status: ${statusInfo.text}`}
          ></div>
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <div className="title-section" style={{ height: '3em', overflow: 'hidden', display: 'flex', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <h3 
              className="font-bold text-lg text-var-text line-clamp-2" 
              style={{
                lineHeight: '1.5em',
                marginBottom: 0
              }}
            >
              {manga.name}
            </h3>
          </div>
          <div className="flex-1 flex flex-col justify-end">
            {/* Chapters display per mode, tied to bottom */}
            {(mode === 'watchlist' || mode === 'search') && totalChapters > 0 && (
              <p className="text-sm text-var-muted mb-2">
                {mode === 'watchlist' 
                  ? `Chapters: ${downloadedChapters}/${totalChapters}` 
                  : `Chapters: ${totalChapters} available`
                }
              </p>
            )}
            {/* Mode-specific bottom content */}
            {mode === 'search' && (
              <div className="flex justify-between items-center">
                <div className="text-sm text-var-muted">
                  Library: 
                  <select
                    value={selectedLibrary}
                    onChange={(e) => setSelectedLibrary(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="ml-1 p-1 border rounded text-xs bg-var-surface dark:bg-gray-700"
                  >
                    {libraries.map(lib => (
                      <option key={lib.key} value={lib.key}>{lib.libraryName}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddClick(); }}
                  className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                  title="Add to Watchlist"
                >
                  <Download size={16} />
                </button>
              </div>
            )}
            {mode === 'watchlist' && (
              <div className="flex justify-between items-center">
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary text-white hover:bg-primary/90"
                  title={`Open on ${connectorName}`}
                >
                  {connectorName} <ExternalLink size={12} className="ml-1" />
                </a>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveClick(); }}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  title="Remove from Watchlist"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && mode === 'search' && (
        <MangaDetailsModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          manga={manga}
          mode={mode}
          libraries={libraries}
          connectors={connectors}
          coverUrl={coverUrl}
          selectedConnector={selectedConnector} // Pass to fix error
        />
      )}
    </>
  );
};

export default MangaCard;