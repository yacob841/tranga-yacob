import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [libraries, setLibraries] = useState([]);
  const [connectors, setConnectors] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const client = apiClient();
        const [libRes, connRes] = await Promise.all([
          client.get('/v2/FileLibrary'),
          client.get('/v2/MangaConnector')
        ]);
        setLibraries(libRes.data || []);
        setConnectors((connRes.data || []).filter(c => c.enabled));
      } catch (error) {
        console.error('Failed to fetch cached data:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <DataContext.Provider value={{ libraries, connectors }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);