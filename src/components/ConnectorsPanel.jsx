// src/components/ConnectorsPanel.jsx (updated to use API endpoint)
import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";

export default function ConnectorsPanel() {
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const client = apiClient();
        const resp = await client.get("/v2/MangaConnector");
        const allConnectors = resp.data || [];
        const enabledConnectors = allConnectors.filter(c => c.enabled).sort((a, b) => a.name.localeCompare(b.name));
        setConnectors(enabledConnectors);
        console.log('ConnectorsPanel loaded:', enabledConnectors.map(c => ({ name: c.name, icon: c.iconUrl }))); // Debug
      } catch (err) {
        console.error(err);
        setError("Failed to load connectors from API");
        // Fallback display
        setConnectors([
          { name: "Global", iconUrl: "https://avatars.githubusercontent.com/u/13404778" },
          { name: "MangaDex", iconUrl: "https://mangadex.org/favicon.ico" },
          { name: "Mangaworld", iconUrl: "https://www.mangaworld.cx/public/assets/seo/favicon-96x96.png?v=3" },
          { name: "MangaPark", iconUrl: "/blahaj.png" }
        ]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="card p-6 mt-6">
      <h2 className="text-lg font-semibold mb-3">Available Connectors</h2>
      {loading ? (
        <div className="text-muted">Loading connectors...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : connectors.length === 0 ? (
        <div className="text-muted">No connectors found.</div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {connectors.map((c) => (
            <li key={c.key || c.name} className="p-3 rounded-md border border-white/5 bg-surface/20 flex items-center gap-3">
              <img src={c.iconUrl} alt={c.name} className="w-6 h-6 rounded" />
              <span className="font-semibold">{c.name}</span>
              <span className="text-xs text-muted ml-auto">({c.supportedLanguages?.join(', ') || 'all'})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}