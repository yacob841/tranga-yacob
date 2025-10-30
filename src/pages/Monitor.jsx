// src/pages/Monitor.jsx (enhanced display)
import React, { useEffect, useState } from "react";
import { apiClient } from "../api/client";

export default function Monitor() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const client = apiClient();
      const r = await client.get("/v2/DownloadQueue");
      setQueue(r.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // Faster poll
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Download Monitor</h2>
      {loading ? (
        <div className="card p-6 text-center">Loading...</div>
      ) : queue.length === 0 ? (
        <div className="card p-6 text-center text-muted">No active downloads.</div>
      ) : (
        <div className="grid gap-4">
          {queue.map((item, i) => (
            <div key={i} className="card p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">{item.mangaTitle || item.title}</div>
                  <div className="text-sm text-muted">{item.chapterTitle || item.chapter}</div>
                  {item.source && <div className="text-xs text-accent">Source: {item.source}</div>}
                </div>
                <div className="text-right">
                  <div className="text-accent font-semibold">{item.progress || 0}%</div>
                  <div className="text-sm text-muted">{item.speed || 'N/A'} MB/s</div>
                  <div className="text-sm text-muted">ETA: {item.eta || 'Unknown'}</div>
                </div>
              </div>
              {item.error && <div className="mt-2 text-red-400 text-sm">Error: {item.error}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}