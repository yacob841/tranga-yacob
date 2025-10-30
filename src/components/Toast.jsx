import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const Toast = ({ message, type = 'info', onClose }) => {
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg max-w-sm`}
        >
          <div className="flex justify-between items-center">
            <span>{message}</span>
            <button onClick={onClose} className="ml-4 text-white hover:opacity-80">&times;</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;