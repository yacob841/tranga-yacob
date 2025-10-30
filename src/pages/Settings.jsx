import React, { useState, useEffect } from 'react';
import useApi from '../api/client';
import Toast from '../components/Toast';
import { useData } from '../context/DataContext'; // For cached connectors

export default function Settings() {
  const [settings, setSettings] = useState({
    defaultDownloadLocation: '',
    userAgent: '',
    imageCompression: 0,
    blackWhiteImages: false,
    flareSolverrUrl: '',
    chapterNamingScheme: '',
    workCycleTimeoutMs: 0,
    requestLimits: {
      Default: 60,
      MangaDexFeed: 250,
      MangaImage: 60,
      MangaCover: 250,
      MangaDexImage: 40,
      MangaInfo: 250,
    },
    downloadLanguage: '',
    maxConcurrentDownloads: 0,
    maxConcurrentWorkers: 0,
    libraryRefreshSetting: 0,
    refreshLibraryWhileDownloadingEveryMinutes: 0,
  });
  const [libraries, setLibraries] = useState([]);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const { connectors: cachedConnectors } = useData();
  const [connectors, setConnectors] = useState(cachedConnectors || []);

  // Fetch initial settings and libraries on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const settingsRes = await useApi('/v2/Settings', 'GET');
        setSettings(settingsRes || settings);

        const libsRes = await useApi('/v2/FileLibrary', 'GET');
        setLibraries(libsRes || []);

        setConnectors(cachedConnectors);
      } catch (err) {
        console.error('Load settings error:', err);
        showToast('Failed to load settings', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [cachedConnectors]);

  const toggleConnector = async (name, enabled) => {
    try {
      setLoading(true);
      await useApi(`/v2/Connector/${name}/SetEnabled/${!enabled}`, 'PATCH');
      setConnectors(prev => prev.map(c => c.name === name ? { ...c, enabled: !enabled } : c));
    } catch (err) {
      console.error('Toggle error:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type) => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await useApi('/v2/Settings', 'POST', settings);
      showToast('Settings saved successfully', 'success');
    } catch (err) {
      console.error('Save settings error:', err);
      showToast(`Failed to save: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('requestLimits.')) {
      const [_, key] = name.split('.');
      setSettings(prev => ({
        ...prev,
        requestLimits: { ...prev.requestLimits, [key]: parseInt(value) || 0 }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading settings...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Default Download Location</label>
          <select 
            name="defaultDownloadLocation" 
            value={settings.defaultDownloadLocation || ''} 
            onChange={handleInputChange}
            className="w-full py-2.5 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all h-10 appearance-none bg-no-repeat bg-right pr-8 text-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDEgTDYgNiBMMTExIDEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=')]"
          >
            <option value="">Select Library</option>
            {libraries.map(lib => (
              <option key={lib.key} value={lib.basePath}>
                {lib.libraryName} ({lib.basePath})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">User Agent</label>
          <input 
            type="text" 
            name="userAgent" 
            value={settings.userAgent || ''} 
            onChange={handleInputChange}
            className="w-full p-2 border rounded bg-white dark:bg-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Image Compression (0-100)</label>
          <input 
            type="number" 
            name="imageCompression" 
            value={settings.imageCompression} 
            onChange={handleInputChange}
            min="0" 
            max="100"
            className="w-full p-2 border rounded bg-white dark:bg-gray-700"
          />
        </div>

        <div className="flex items-center space-x-2">
          <input 
            type="checkbox" 
            name="blackWhiteImages" 
            checked={settings.blackWhiteImages} 
            onChange={handleInputChange}
            className="rounded"
          />
          <label className="text-sm font-medium">Black & White Images</label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">FlareSolverr URL</label>
          <input 
            type="url" 
            name="flareSolverrUrl" 
            value={settings.flareSolverrUrl || ''} 
            onChange={handleInputChange}
            className="w-full p-2 border rounded bg-white dark:bg-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Chapter Naming Scheme</label>
          <input 
            type="text" 
            name="chapterNamingScheme" 
            value={settings.chapterNamingScheme || ''} 
            onChange={handleInputChange}
            className="w-full p-2 border rounded bg-white dark:bg-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Work Cycle Timeout (ms)</label>
          <input 
            type="number" 
            name="workCycleTimeoutMs" 
            value={settings.workCycleTimeoutMs} 
            onChange={handleInputChange}
            className="w-full p-2 border rounded bg-white dark:bg-gray-700"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Request Limits</label>
          {Object.entries(settings.requestLimits).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-2">
              <label className="text-sm">{key}:</label>
              <input 
                type="number" 
                value={value} 
                onChange={(e) => handleInputChange({ target: { name: `requestLimits.${key}`, value: e.target.value } })}
                className="p-1 border rounded w-20"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Download Language</label>
          <input 
            type="text" 
            name="downloadLanguage" 
            value={settings.downloadLanguage || ''} 
            onChange={handleInputChange}
            className="w-full p-2 border rounded bg-white dark:bg-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Max Concurrent Downloads</label>
          <input 
            type="number" 
            name="maxConcurrentDownloads" 
            value={settings.maxConcurrentDownloads} 
            onChange={handleInputChange}
            className="w-full p-2 border rounded bg-white dark:bg-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Max Concurrent Workers</label>
          <input 
            type="number" 
            name="maxConcurrentWorkers" 
            value={settings.maxConcurrentWorkers} 
            onChange={handleInputChange}
            className="w-full p-2 border rounded bg-white dark:bg-gray-700"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Library Refresh Setting</label>
          <select 
            name="libraryRefreshSetting" 
            value={settings.libraryRefreshSetting} 
            onChange={handleInputChange}
            className="w-full py-2.5 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all h-10 appearance-none bg-no-repeat bg-right pr-8 text-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDEgTDYgNiBMMTExIDEiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=')]"
          >
            <option value={0}>Never</option>
            <option value={1}>Daily</option>
            <option value={2}>Weekly</option>
            <option value={3}>While Downloading</option>
          </select>
          {settings.libraryRefreshSetting === 3 && (
            <div>
              <label className="block text-sm font-medium mb-1">Refresh Every Minutes</label>
              <input 
                type="number" 
                name="refreshLibraryWhileDownloadingEveryMinutes" 
                value={settings.refreshLibraryWhileDownloadingEveryMinutes} 
                onChange={handleInputChange}
                className="w-full p-2 border rounded bg-white dark:bg-gray-700"
              />
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {/* Connectors Section (added at bottom) */}
      <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-semibold mb-4">Connectors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connectors.map((connector) => (
            <div key={connector.name} className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <h3 className="font-medium">{connector.name}</h3>
                <p className="text-sm text-gray-500">{connector.description || 'Manga source'}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={connector.enabled}
                  onChange={() => toggleConnector(connector.name, connector.enabled)}
                  className="sr-only peer"
                  disabled={loading}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </section>

      {toast.message && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />}
    </div>
  );
}