import React from 'react';

const Skeleton = ({ className = 'h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg overflow-hidden relative', count = 1 }) => {
  return Array.from({ length: count }, (_, i) => (
    <div 
      key={i} 
      className={`${className} before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-shimmer dark:before:via-gray-600`}
      data-testid="skeleton"
    />
  ));
};

export default Skeleton;