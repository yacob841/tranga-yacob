// src/components/SettingsPanel.jsx (updated)
import React from "react";
import { useTheme } from "../context/ThemeContext";
import { getBackendUrl, setBackendUrl } from "../api/client";

export default function SettingsPanel() {
  const { themeName, changeTheme, themes } = useTheme(); // Removed unused settings/setSettings
  const backendUrl = getBackendUrl();

  const updateBackend = () => {
    const v = prompt("Enter backend URL (eg. http://localhost:8000)", backendUrl);
    if (v !== null && v.trim()) {
      setBackendUrl(v.trim());
      alert("Saved backend URL. Please refresh the page for changes to take effect.");
    }
  };

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold">Settings</h2>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-muted">Theme</label>
          <select value={themeName} onChange={e => changeTheme(e.target.value)} className="mt-2 p-2 rounded-md bg-transparent border border-white/5">
            {themes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-muted">Backend URL</label>
          <div className="mt-2 flex gap-2">
            <input type="text" defaultValue={backendUrl} readOnly className="flex-1 p-2 rounded-md bg-transparent border border-white/5" />
            <button onClick={updateBackend} className="px-3 py-2 rounded-md bg-primary text-white">Edit</button>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm text-muted">Watchlist storage</label>
          <div className="mt-2 text-sm text-muted">Currently the watchlist is saved in local browser storage. In future we can sync to backend or to Komga library export.</div>
        </div>

      </div>
    </div>
  );
}