import React from 'react';

const QuickActions = ({ selected, onBulkDownload }) => (
  <div className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-700 rounded">
    <span className="text-sm">{selected.length} selected</span>
    {selected.length > 0 && (
      <button 
        onClick={onBulkDownload} 
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        aria-label={`Bulk download ${selected.length} items`}
      >
        Bulk Download
      </button>
    )}
  </div>
);

export default QuickActions;