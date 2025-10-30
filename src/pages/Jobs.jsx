import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import useApi, { getCoverAsBlob } from '../api/client';
import Toast from '../components/Toast';
import { motion } from 'framer-motion';
import Skeleton from '../components/Skeleton';

export default function Jobs() {
  console.log('Jobs rendering...');
  const [runningWorkers, setRunningWorkers] = useState([]);
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
      // Running downloads: /v2/Worker (filter Running for downloads)
      const workersRes = await useApi('/v2/Worker');
      const running = workersRes.filter(w => w.state === 'Running' && w.key.includes('Download')); // Assume key has 'Download'
      setRunningWorkers(running);

      // Pending queue: /v2/Manga/Downloading, then per manga /v2/Manga/{id}/Chapters/NotDownloaded
      const downloadingRes = await useApi('/v2/Manga/Downloading');
      const mangaList = downloadingRes || [];
      const pending = [];
      for (const m of mangaList) {
        const chaptersRes = await useApi(`/v2/Manga/${m.key}/Chapters/NotDownloaded`);
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

  const handleForceMangaRecheck = async (mangaId) => {
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

  const handleForceChapterRecheck = async (chapterId, mangaId) => {
    if (!confirm(`This will delete the chapter record for ${chapterId}, forcing a re-check. Continue?`)) return;
    try {
      setRecheckLoading(prev => ({ ...prev, [`chapter-${chapterId}`]: true }));
      await useApi(`/v2/Manga/ForceRecheck/Chapter/${chapterId}`, 'POST'); // Fixed: Full path with /Manga/
      showToast(`Chapter re-check triggered for ${chapterId}!`, 'success');
      // Refetch pending chapters for this manga
      const chaptersRes = await useApi(`/v2/Manga/${mangaId}/Chapters/NotDownloaded`);
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

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-2xl font-bold">Jobs</h1>
        {/* Full Re-Check Button (red, top actions menu) */}
        <div className="flex justify-start">
          <button
            onClick={handleForceFullRecheck}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors flex items-center"
          >
            <RefreshCw size={16} className="mr-2" />
            Re-Check All
          </button>
        </div>
      </div>

      {/* Currently Downloading */}
      <motion.section 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="space-y-4"
      >
        <h2 className="text-xl font-semibold">Currently Downloading</h2>
        {runningWorkers.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No active downloads.</p>
        ) : (
          runningWorkers.map(worker => (
            <div key={worker.key} className="border p-4 rounded bg-var-surface" style={{ borderColor: 'var(--color-muted)' }}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">{worker.key.split('-')[0] || 'Download'}</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">{worker.state}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${worker.progress || 0}%` }}></div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{worker.progress || 0}% complete</p>
            </div>
          ))
        )}
      </motion.section>

      {/* Pending Queue */}
      <motion.section 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="space-y-4"
      >
        <h2 className="text-xl font-semibold">Pending Downloads</h2>
        {pendingManga.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No pending chapters.</p>
        ) : (
          pendingManga.map(m => (
            <div key={m.key} className="border p-4 rounded bg-var-surface flex gap-4" style={{ borderColor: 'var(--color-muted)' }}>
              {/* Cover Left */}
              <div className="w-24 h-32 relative">
                <img src={m.coverUrl || '/src/assets/logo.svg'} alt={m.name} className="w-full h-full object-cover rounded" />
              </div>
              {/* Name Top + Manga Re-check Button (red, top-right in line with title) */}
              <div className="flex-1 relative">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold">{m.name}</h3>
                  <button
                    onClick={() => handleForceMangaRecheck(m.key)} // Fixed: Use m.key
                    disabled={recheckLoading[m.key]}
                    className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center absolute top-0 right-0"
                  >
                    <RefreshCw size={12} className={`mr-1 ${recheckLoading[m.key] ? 'animate-spin' : ''}`} />
                    Re-Check
                  </button>
                </div>
                {/* Scrollable Chapters */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {m.pendingChapters.map(ch => (
                    <div key={ch.key} className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                      <span className="font-medium">Vol {ch.volume} Ch. {ch.chapterNumber}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{ch.title || 'Untitled'}</span>
                      <span className="ml-auto text-xs text-gray-400">From {ch.mangaConnectorIds[0]?.mangaConnectorName}</span>
                      <span className="border border-gray-300 dark:border-gray-600 p-1 text-center">
                        <button
                          onClick={() => handleForceChapterRecheck(ch.key, m.key)} // Fixed: Pass ch.key and m.key
                          disabled={recheckLoading[`chapter-${ch.key}`]}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center"
                          title="Force Re-check Chapter"
                        >
                          <RefreshCw size={12} className={`mr-1 ${recheckLoading[`chapter-${ch.key}`] ? 'animate-spin' : ''}`} />
                          Re-Check
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </motion.section>

      <button onClick={fetchJobs} className="px-4 py-2 bg-blue-500 text-white rounded">Refresh</button>

      {toast.message && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />}
    </div>
  );
}