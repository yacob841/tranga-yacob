import React, { useState, useEffect } from 'react';
import useApi from '../api/client';
import Toast from '../components/Toast';
import { useData } from '../context/DataContext'; // For cached connectors
import { RefreshCw } from 'lucide-react';

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
  const [errorStates, setErrorStates] = useState({}); // Track errors per field
  const [currentTheme, setCurrentTheme] = useState('darkCyber'); // Default theme

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'darkCyber';
    setCurrentTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Handle theme change
  const handleThemeChange = (theme) => {
    setCurrentTheme(theme);
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  };

  // Fetch initial settings and libraries on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setErrorStates({});

        // Load all settings with single GET
        const settingsRes = await useApi('/v2/Settings', 'GET');
        setSettings(settingsRes || settings);

        // Load libraries for display
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

  const handleInputChange = async (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    const field = name;
    let success = true;
    let prevValue = settings[field];

    // Update local state immediately
    setSettings(prev => ({ ...prev, [field]: newValue }));
    setErrorStates(prev => ({ ...prev, [field]: false }));

    // Auto-save with verification
    try {
      if (field === 'userAgent') {
        await useApi('/v2/Settings/UserAgent', 'PATCH', newValue);
        // Verify
        const verify = await useApi('/v2/Settings/UserAgent', 'GET');
        if (verify !== newValue) success = false;
      } else if (field === 'imageCompression') {
        await useApi(`/v2/Settings/ImageCompressionLevel/${newValue}`, 'PATCH');
        // Verify
        const verify = await useApi('/v2/Settings/ImageCompressionLevel', 'GET');
        if (verify !== parseInt(newValue)) success = false;
      } else if (field === 'blackWhiteImages') {
        await useApi(`/v2/Settings/BWImages/${newValue}`, 'PATCH');
        // Verify
        const verify = await useApi('/v2/Settings/BWImages', 'GET');
        if (verify !== newValue) success = false;
      } else if (field === 'chapterNamingScheme') {
        await useApi('/v2/Settings/ChapterNamingScheme', 'PATCH', newValue);
        // Verify
        const verify = await useApi('/v2/Settings/ChapterNamingScheme', 'GET');
        if (verify !== newValue) success = false;
      } else if (field === 'flareSolverrUrl') {
        await useApi('/v2/Settings/FlareSolverr/URL', 'POST', newValue);
        // Test
        const testRes = await useApi('/v2/Settings/FlareSolverr/Test', 'POST');
        if (!testRes) {
          success = false;
          showToast('FlareSolverr Connection Failed', 'error');
        } else {
          // Verify
          const verify = await useApi('/v2/Settings/FlareSolverr/URL', 'GET');
          if (verify !== newValue) success = false;
        }
      } else if (field === 'downloadLanguage') {
        await useApi(`/v2/Settings/DownloadLanguage/${newValue}`, 'PATCH');
        // Verify
        const verify = await useApi('/v2/Settings/DownloadLanguage', 'GET');
        if (verify !== newValue) success = false;
      } else if (field === 'libraryRefreshSetting') {
        await useApi('/v2/Settings/LibraryRefresh', 'PATCH', newValue);
        // Verify
        const verify = await useApi('/v2/Settings/LibraryRefresh', 'GET');
        if (verify !== parseInt(newValue)) success = false;
      }
    } catch (err) {
      success = false;
      console.error('Save error for', field, ':', err);
    }

    if (!success) {
      setErrorStates(prev => ({ ...prev, [field]: true }));
      showToast('Failed to save', 'error');
      // Revert
      setSettings(prev => ({ ...prev, [field]: prevValue }));
    }
  };

  const handleReset = async (field) => {
    try {
      let success = true;
      let key;
      if (field === 'userAgent') {
        await useApi('/v2/Settings/UserAgent', 'DELETE');
      } else if (field === 'flareSolverrUrl') {
        await useApi('/v2/Settings/FlareSolverr/URL', 'DELETE');
      }

      // Reload the field to get default
      if (field === 'userAgent') {
        const res = await useApi('/v2/Settings/UserAgent', 'GET');
        setSettings(prev => ({ ...prev, userAgent: res || '' }));
      } else if (field === 'imageCompression') {
        const res = await useApi('/v2/Settings/ImageCompressionLevel', 'GET');
        setSettings(prev => ({ ...prev, imageCompression: res || 0 }));
      } else if (field === 'blackWhiteImages') {
        const res = await useApi('/v2/Settings/BWImages', 'GET');
        setSettings(prev => ({ ...prev, blackWhiteImages: res || false }));
      } else if (field === 'chapterNamingScheme') {
        const res = await useApi('/v2/Settings/ChapterNamingScheme', 'GET');
        setSettings(prev => ({ ...prev, chapterNamingScheme: res || '' }));
      } else if (field === 'flareSolverrUrl') {
        const res = await useApi('/v2/Settings/FlareSolverr/URL', 'GET');
        setSettings(prev => ({ ...prev, flareSolverrUrl: res || '' }));
      } else if (field === 'downloadLanguage') {
        const res = await useApi('/v2/Settings/DownloadLanguage', 'GET');
        setSettings(prev => ({ ...prev, downloadLanguage: res || '' }));
      } else if (field === 'libraryRefreshSetting') {
        const res = await useApi('/v2/Settings/LibraryRefresh', 'GET');
        setSettings(prev => ({ ...prev, libraryRefreshSetting: res || 0 }));
      }

      showToast('Reset to default', 'success');
    } catch (err) {
      console.error('Reset error:', err);
      showToast('Failed to reset', 'error');
    }
  };

  const getInputClass = (field) => {
    return errorStates[field] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600';
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading settings...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Theme Selector */}
      <div className="flex items-center gap-2 mb-6">
        <label className="text-sm font-medium">Theme:</label>
        <select 
          value={currentTheme} 
          onChange={(e) => handleThemeChange(e.target.value)}
          className="p-2 border border-gray-300 rounded-md bg-var-surface dark:border-gray-600"
        >
          <option value="sakuraDream">Sakura Dream</option>
          <option value="forestNight">Forest Night</option>
          <option value="softManga">Soft Manga</option>
          <option value="darkCyber">Dark Cyber</option>
          <option value="studioDashboard">Studio Dashboard</option>
        </select>
      </div>

      {/* Editable Settings */}
      <div className="space-y-4">
        {/* User Agent */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">User Agent</label>
            <input 
              type="text" 
              name="userAgent" 
              value={settings.userAgent || ''} 
              onChange={handleInputChange}
              className={`w-full p-2 border rounded ${getInputClass('userAgent')} bg-var-surface dark:bg-gray-700`}
            />
          </div>
          <button 
            type="button"
            onClick={() => handleReset('userAgent')}
            className="bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 transition-colors flex items-center"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Image Compression Level */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Image Compression Level</label>
            <input 
              type="range" 
              name="imageCompression" 
              value={settings.imageCompression} 
              min="0" 
              max="100" 
              onChange={handleInputChange}
              className={`w-full ${getInputClass('imageCompression')}`}
            />
            <span>{settings.imageCompression}%</span>
          </div>
          <button 
            type="button"
            onClick={() => handleReset('imageCompression')}
            className="bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 transition-colors flex items-center"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* B/W Images */}
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            name="blackWhiteImages" 
            checked={settings.blackWhiteImages} 
            onChange={handleInputChange}
            className={`rounded ${getInputClass('blackWhiteImages')}`}
          />
          <label className="text-sm font-medium">Enable Black & White Images</label>
          <button 
            type="button"
            onClick={() => handleReset('blackWhiteImages')}
            className="bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 transition-colors flex items-center ml-auto"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Chapter Naming Scheme */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Chapter Naming Scheme</label>
            <input 
              type="text" 
              name="chapterNamingScheme" 
              value={settings.chapterNamingScheme || ''} 
              onChange={handleInputChange}
              className={`w-full p-2 border rounded ${getInputClass('chapterNamingScheme')} bg-var-surface dark:bg-gray-700`}
            />
          </div>
          <button 
            type="button"
            onClick={() => handleReset('chapterNamingScheme')}
            className="bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 transition-colors flex items-center"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* FlareSolverr URL */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">FlareSolverr URL</label>
            <input 
              type="url" 
              name="flareSolverrUrl" 
              value={settings.flareSolverrUrl || ''} 
              onChange={handleInputChange}
              className={`w-full p-2 border rounded ${getInputClass('flareSolverrUrl')} bg-var-surface dark:bg-gray-700`}
              placeholder="http://localhost:8191/v1"
            />
          </div>
          <button 
            type="button"
            onClick={() => handleReset('flareSolverrUrl')}
            className="bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 transition-colors flex items-center"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Download Language */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Download Language</label>
            <select 
              name="downloadLanguage" 
              value={settings.downloadLanguage || ''} 
              onChange={handleInputChange}
              className={`w-full p-2 border rounded ${getInputClass('downloadLanguage')} bg-var-surface dark:bg-gray-700`}
            >
              <option value="">Default</option>
              <option value="en">English</option>
              <option value="ja">Japanese</option>
              {/* Add more languages as needed */}
            </select>
          </div>
          <button 
            type="button"
            onClick={() => handleReset('downloadLanguage')}
            className="bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 transition-colors flex items-center"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Library Refresh Setting */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Library Refresh Setting</label>
            <select 
              name="libraryRefreshSetting" 
              value={settings.libraryRefreshSetting} 
              onChange={handleInputChange}
              className={`w-full p-2 border rounded ${getInputClass('libraryRefreshSetting')} bg-var-surface dark:bg-gray-700`}
            >
              <option value={0}>Never</option>
              <option value={1}>Daily</option>
              <option value={2}>Weekly</option>
              <option value={3}>While Downloading</option>
            </select>
            {settings.libraryRefreshSetting === 3 && (
              <div className="mt-2">
                <label className="block text-sm font-medium mb-1">Refresh Every Minutes</label>
                <input 
                  type="number" 
                  name="refreshLibraryWhileDownloadingEveryMinutes" 
                  value={settings.refreshLibraryWhileDownloadingEveryMinutes} 
                  onChange={handleInputChange}
                  className={`w-full p-2 border rounded ${getInputClass('refreshLibraryWhileDownloadingEveryMinutes')} bg-var-surface dark:bg-gray-700`}
                />
              </div>
            )}
          </div>
          <button 
            type="button"
            onClick={() => handleReset('libraryRefreshSetting')}
            className="bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 transition-colors flex items-center"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Connectors Section */}
      <section className="bg-var-surface dark:bg-gray-800 rounded-lg p-6 shadow-md">
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

      {/* Non-Editable Settings */}
      <div className="bg-var-surface dark:bg-gray-700 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Non-Editable Settings (Manual Config)</h2>
        <div className="space-y-2 text-sm">
          <p><strong>Default Download Location:</strong> {settings.defaultDownloadLocation} <span className="text-red-500">must be changed manually in config</span></p>
          <p><strong>Work Cycle Timeout (ms):</strong> {settings.workCycleTimeoutMs} <span className="text-red-500">must be changed manually in config</span></p>
          <p><strong>Max Concurrent Downloads:</strong> {settings.maxConcurrentDownloads} <span className="text-red-500">must be changed manually in config</span></p>
          <p><strong>Max Concurrent Workers:</strong> {settings.maxConcurrentWorkers} <span className="text-red-500">must be changed manually in config</span></p>
          {settings.libraryRefreshSetting === 3 && (
            <p><strong>Refresh Library Every Minutes:</strong> {settings.refreshLibraryWhileDownloadingEveryMinutes} <span className="text-red-500">must be changed manually in config</span></p>
          )}
        </div>
      </div>

      {toast.message && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />}
    </div>
  );
}