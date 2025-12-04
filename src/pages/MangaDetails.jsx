import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ExternalLink, Download, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import useApi, { getCoverAsBlob } from '../api/client';
import { useData } from '../context/DataContext'; // For libraries

export default function MangaDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { libraries } = useData(); // Fetch libraries from context
  const [manga, setManga] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [coverUrl, setCoverUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLib, setSelectedLib] = useState('');
  const [showAssignButton, setShowAssignButton] = useState(false);
  const [recheckLoading, setRecheckLoading] = useState(false);

  const statusMap = {
    0: 'Continuing',
    1: 'Completed',
    2: 'Hiatus',
    3: 'Cancelled',
    4: 'Unreleased'
  };

  // Fetch cover
  const fetchCover = async (mangaId) => {
    try {
      const blob = await getCoverAsBlob(mangaId, 'Original');
      if (blob) {
        let validBlob = blob;
        if (!(blob instanceof Blob)) {
          validBlob = new Blob([blob], { type: 'image/jpeg' });
        }
        const url = URL.createObjectURL(validBlob);
        setCoverUrl(url);
      }
    } catch (err) {
      console.error('Cover fetch error:', err);
    }
  };

  // Handle library change
  const handleLibChange = (e) => {
    const newLib = e.target.value;
    setSelectedLib(newLib);
    setShowAssignButton(newLib !== manga.fileLibraryId);
  };

  // Assign library
  const handleAssignLibrary = async () => {
    if (!selectedLib || selectedLib === manga.fileLibraryId) return;
    try {
      setLoading(true);
      await useApi(`/v2/Manga/${id}/ChangeLibrary/${selectedLib}`, 'POST', {});
      // Refetch manga
      const updatedManga = await useApi(`/v2/Manga/${id}`, 'GET');
      setManga(updatedManga);
      setShowAssignButton(false);
      console.log('Library assigned successfully');
    } catch (err) {
      console.error('Assign library error:', err);
      alert(`Failed to assign library: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Force Manga Re-check
  const handleForceMangaRecheck = async () => {
    if (!confirm(`This will delete all undownloaded chapters for this manga, forcing a re-check. Continue?`)) return;
    try {
      setRecheckLoading(true);
      await useApi(`/v2/Manga/ForceRecheck/${id}`, 'POST');
      // Refetch chapters
      const chaptersData = await useApi(`/v2/Chapters/Manga/${id}?page=1&pageSize=1000`, 'POST', {});
      setChapters(chaptersData?.data || []);
      console.log('Manga re-check triggered successfully');
    } catch (err) {
      console.error('Manga re-check error:', err);
      alert(`Failed to trigger manga re-check: ${err.message}`);
    } finally {
      setRecheckLoading(false);
    }
  };

  // Force Chapter Re-check
  const handleForceChapterRecheck = async (chapterId) => {
    if (!confirm(`This will delete the chapter record for ${chapterId}, forcing a re-check. Continue?`)) return;
    try {
      setRecheckLoading(true);
      await useApi(`/v2/Manga/ForceRecheck/Chapter/${chapterId}`, 'POST');
      // Refetch chapters
      const chaptersData = await useApi(`/v2/Chapters/Manga/${id}?page=1&pageSize=1000`, 'POST', {});
      setChapters(chaptersData?.data || []);
      console.log('Chapter re-check triggered successfully');
    } catch (err) {
      console.error('Chapter re-check error:', err);
      alert(`Failed to trigger chapter re-check: ${err.message}`);
    } finally {
      setRecheckLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const mangaData = await useApi(`/v2/Manga/${id}`, 'GET');
        setManga(mangaData);
        setSelectedLib(mangaData.fileLibraryId || libraries[0]?.key || '');
        const chaptersData = await useApi(`/v2/Chapters/Manga/${id}?page=1&pageSize=1000`, 'POST', {});
        setChapters(chaptersData?.data || []);
        await fetchCover(id);
      } catch (err) {
        console.error('Load error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (libraries.length > 0) loadData();

    return () => {
      if (coverUrl.startsWith('blob:')) {
        URL.revokeObjectURL(coverUrl);
      }
    };
  }, [id, libraries]);

  useEffect(() => {
    if (manga) {
      setShowAssignButton(selectedLib !== manga.fileLibraryId);
    }
  }, [selectedLib, manga]);

  // Auto-scroll to chapter if param present
  useEffect(() => {
    if (chapters.length > 0) {
      const scrollToChapter = searchParams.get('scrollToChapter');
      if (scrollToChapter) {
        const chapterNumber = parseFloat(scrollToChapter);
        const targetRow = document.getElementById(`chapter-row-${chapterNumber}`);
        if (targetRow) {
          targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [chapters, searchParams]);

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>;
  if (error) return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  if (!manga) return <div className="text-center py-8">Manga not found</div>;

  const primaryConnector = manga.mangaConnectorIds?.find(c => c.useForDownload) || manga.mangaConnectorIds?.[0];
  const displayStatus = statusMap[manga.releaseStatus] || 'Unknown';
  const currentLibName = libraries.find(lib => lib.key === manga.fileLibraryId)?.libraryName || 'Unassigned';

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
          ← Back
        </button>
        <button
          onClick={handleForceMangaRecheck}
          disabled={recheckLoading}
          className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center"
        >
          <RefreshCw size={16} className={`mr-2 ${recheckLoading ? 'animate-spin' : ''}`} />
          {recheckLoading ? 'Rechecking...' : 'Re-check'}
        </button>
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cover and metadata */}
        <div className="flex-shrink-0">
          <img src={coverUrl || '/placeholder.jpg'} alt={`${manga.name} cover`} className="w-48 h-64 object-cover rounded-lg mb-4" />
          {primaryConnector?.websiteUrl && (
            <a href={primaryConnector.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-primary text-white">
              {primaryConnector.mangaConnectorName} <ExternalLink size={12} className="ml-1" />
            </a>
          )}
        </div>

        {/* Main info */}
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{manga.name}</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">Status: {displayStatus}</p>
          {/* Library Dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Library: {currentLibName}</label>
            <select
              value={selectedLib}
              onChange={handleLibChange}
              className="p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Unassigned</option>
              {libraries.map(lib => (
                <option key={lib.key} value={lib.key}>{lib.libraryName}</option>
              ))}
            </select>
            {showAssignButton && (
              <button
                onClick={handleAssignLibrary}
                disabled={loading}
                className="mt-2 w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Assigning...' : 'Assign to Library'}
              </button>
            )}
          </div>
          {manga.description && (
            <div className="prose dark:prose-invert mb-6">
              <p>{manga.description}</p>
            </div>
          )}
          {manga.authors?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Authors</h3>
              <ul className="space-y-1">
                {manga.authors.map((author, i) => (
                  <li key={i} className="text-sm">{author.name}</li>
                ))}
              </ul>
            </div>
          )}
          {manga.tags?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {manga.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-1 bg-var-surface dark:bg-gray-700 rounded text-sm border border-var-muted">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chapters List */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Chapters ({chapters.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
            <thead>
              <tr className="bg-var-surface">
                <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Chapter</th>
                <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Title</th>
                <th className="border border-gray-300 dark:border-gray-600 p-2 text-center">Downloaded</th>
                <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Source</th>
                <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Link</th>
                <th className="border border-gray-300 dark:border-gray-600 p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {chapters.map((chapter, i) => {
                const chapterConnector = chapter.mangaConnectorIds?.find(c => c.useForDownload);
                const sourceName = chapterConnector?.mangaConnectorName || 'N/A';
                const chapterUrl = chapterConnector?.websiteUrl || '';
                return (
                  <tr 
                    key={i} 
                    id={`chapter-row-${chapter.chapterNumber}`}
                    className="hover:bg-var-surface/80"
                  >
                    <td className="border border-gray-300 dark:border-gray-600 p-2">Ch. {chapter.chapterNumber}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2">{chapter.title || 'Untitled'}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">
                      {chapter.downloaded ? <CheckCircle className="mx-auto text-green-500" size={16} /> : <AlertCircle className="mx-auto text-red-500" size={16} />}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2">{sourceName}</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2">
                      {chapterUrl ? (
                        <a href={chapterUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center">
                          Open <ExternalLink size={12} className="ml-1" />
                        </a>
                      ) : 'N/A'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 p-2 text-center">
                      <button
                        onClick={() => handleForceChapterRecheck(chapter.key)}
                        disabled={recheckLoading}
                        className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 disabled:opacity-50 transition-colors"
                        title="Force Re-check Chapter"
                      >
                        <RefreshCw size={12} className={`${recheckLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}