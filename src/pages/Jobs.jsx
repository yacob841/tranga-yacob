import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useApi, { getCoverAsBlob } from '../api/client';
import Toast from '../components/Toast';
import { motion } from 'framer-motion';
import Skeleton from '../components/Skeleton';

export default function Jobs() {
  const navigate = useNavigate();
  console.log('Jobs rendering...');
  const [pendingManga, setPendingManga] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [recheckLoading, setRecheckLoading] = useState({}); // Object to track per-manga/chapter

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      // Pending queue: /v2/Manga/Downloading, then per manga /v2/Manga/{id}/Chapters/NotDownloaded
      const downloadingRes = await useApi('/v2/Manga/Downloading');
      const mangaList = downloadingRes || [];
      const pending = [];
      for (const m of mangaList) {
        const chaptersRes = await useApi(`/v2/Chapters/Manga/${m.key}?page=1&pageSize=1000`, 'POST', JSON.stringify({ downloaded: false }));
        const pendingChapters = chaptersRes || [];
        if (pendingChapters.length > 0) {
          try {
            const blob = await getCoverAsBlob(m.key, 'Small');
            const url = blob ? URL.createObjectURL(blob) : '/placeholder.jpg'; // Fix: Create URL from Blob
            console.log('Cover loaded for Jobs pending manga', m.key, ':', url);
            pending.push({ ...m, pendingChapters, coverUrl: url });
          } catch (coverErr) {
            console.error('Cover fetch error in Jobs for', m.key, ':', coverErr);
            pending.push({ ...m, pendingChapters, coverUrl: '/placeholder.jpg' });
          }
        }
      }
      setPendingManga(pending);
    } catch (err) {
      console.error('Jobs fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type) => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const handleForceFullRecheck = async () => {
    if (!confirm('This will delete all undownloaded chapter records, forcing a full re-check. Continue?')) return;
    try {
      await useApi('/v2/Manga/ForceRecheck', 'POST');
      showToast('Full re-check triggered successfully!', 'success');
      fetchJobs(); // Refresh jobs list
    } catch (err) {
      console.error('Full re-check error:', err);
      showToast(`Failed to trigger full re-check: ${err.message}`, 'error');
    }
  };

  const handleForceMangaRecheck = async (mangaId, e) => {
    if (e) e.stopPropagation();
    if (!confirm(`This will delete all undownloaded chapters for this manga, forcing a re-check. Continue?`)) return;
    try {
      setRecheckLoading(prev => ({ ...prev, [mangaId]: true }));
      await useApi(`/v2/Manga/ForceRecheck/${mangaId}`, 'POST'); // Fixed: Use mangaId param
      showToast(`Manga re-check triggered for ${mangaId}!`, 'success');
      // Refetch pending for this manga only
      const updatedPending = pendingManga.map(p => 
        p.key === mangaId ? { ...p, pendingChapters: [] } : p // Clear pending for this manga
      );
      setPendingManga(updatedPending);
    } catch (err) {
      console.error('Manga re-check error:', err);
      showToast(`Failed to trigger manga re-check: ${err.message}`, 'error');
    } finally {
      setRecheckLoading(prev => ({ ...prev, [mangaId]: false }));
    }
  };

  const handleForceChapterRecheck = async (chapterId, mangaId, e) => {
    if (e) e.stopPropagation();
    if (!confirm(`This will delete the chapter record for ${chapterId}, forcing a re-check. Continue?`)) return;
    try {
      setRecheckLoading(prev => ({ ...prev, [`chapter-${chapterId}`]: true }));
      await useApi(`/v2/Manga/ForceRecheck/Chapter/${chapterId}`, 'POST'); // Fixed: Full path with /Manga/
      showToast(`Chapter re-check triggered for ${chapterId}!`, 'success');
      // Refetch pending chapters for this manga
      const chaptersRes = await fetch(`/v2/Chapters/Manga/${m.key}?page=1&pageSize=1000`, 'POST', JSON.stringify({ downloaded: false }));
      const updatedPending = pendingManga.map(p => 
        p.key === mangaId ? { ...p, pendingChapters: chaptersRes || [] } : p
      );
      setPendingManga(updatedPending);
    } catch (err) {
      console.error('Chapter re-check error:', err);
      showToast(`Failed to trigger chapter re-check: ${err.message}`, 'error');
    } finally {
      setRecheckLoading(prev => ({ ...prev, [`chapter-${chapterId}`]: false }));
    }
  };

  const handleMangaClick = (mangaKey) => {
    navigate(`/manga/${mangaKey}`);
  };

  const handleChapterClick = (mangaKey, chapterNumber) => {
    navigate(`/manga/${mangaKey}?scrollToChapter=${chapterNumber}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-6xl space-y-6 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Loading jobs...</span>
        </div>
      </div>
    );
  }
  if (error) return <div className="container mx-auto p-4 max-w-6xl text-red-500">Error: {error}</div>;
  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchJobs}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex items-center"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
          <button
            onClick={handleForceFullRecheck}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors flex items-center"
          >
            <RefreshCw size={16} className="mr-2" />
            Re-Check All
          </button>
        </div>
      </div>

      <motion.section 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="space-y-4"
      >
        {pendingManga.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No pending chapters.</p>
        ) : (
          pendingManga.map(m => (
            <div key={m.key} className="border p-4 rounded bg-var-surface flex gap-4" style={{ borderColor: 'var(--color-muted)' }}>
              {/* Cover Left - Clickable */}
              <div 
                className="w-40 h-56 relative flex-shrink-0 cursor-pointer"
                onClick={() => handleMangaClick(m.key)}
              >
                <img src={m.coverUrl || '/src/assets/logo.svg'} alt={m.name} className="w-full h-full object-cover rounded hover:opacity-80 transition-opacity" />
              </div>
              {/* Name Top + Manga Re-check Button (red, top-right in line with title) */}
              <div className="flex-1 relative">
                <div className="flex justify-between items-start mb-4">
                  <h3 
                    className="text-lg font-bold cursor-pointer hover:underline" 
                    onClick={() => handleMangaClick(m.key)}
                  >
                    {m.name}
                  </h3>
                  <button
                    onClick={(e) => handleForceMangaRecheck(m.key, e)}
                    disabled={recheckLoading[m.key]}
                    className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center absolute top-0 right-0"
                  >
                    <RefreshCw size={12} className={`mr-1 ${recheckLoading[m.key] ? 'animate-spin' : ''}`} />
                    Re-Check
                  </button>
                </div>
                {/* Scrollable Chapters - Increased max-h for larger cover */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  { m.pendingChapters.map(ch => (
                    <div 
                      key={ch.key} 
                      className="flex items-center gap-2 p-2 bg-var-surface rounded border border-var-muted cursor-pointer hover:bg-var-surface/80 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => handleChapterClick(m.key, ch.chapterNumber)}
                    >
                      <span className="font-medium">Vol {ch.volume} Ch. {ch.chapterNumber}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{ch.title || 'Untitled'}</span>
                      <span className="ml-auto text-xs text-gray-400">From {ch.mangaConnectorIds[0]?.mangaConnectorName}</span>
                      <span className="p-1 text-center flex-shrink-0">
                        <button
                          onClick={(e) => handleForceChapterRecheck(ch.key, m.key, e)}
                          disabled={recheckLoading[`chapter-${ch.key}`]}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center"
                          title="Force Re-check Chapter"
                        >
                          <RefreshCw size={12} className={`mr-1 ${recheckLoading[`chapter-${ch.key}`] ? 'animate-spin' : ''}`} />
                          Re-Check
                        </button>
                      </span>
                    </div>
                  )) }
                </div>
              </div>
            </div>
          ))
        )}
      </motion.section>

      {toast.message && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />}
    </div>
  );
}