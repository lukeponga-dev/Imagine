import React from 'react';
import { HistoryItem } from '../types';

interface UserProfileSectionProps {
  history: HistoryItem[];
  onClose: () => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
}

const UserProfileSection: React.FC<UserProfileSectionProps> = ({
  history,
  onClose,
  onRemoveItem,
  onClearAll,
}) => {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Past Enhancements</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors text-3xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {history.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No enhancement history yet. Get started by enhancing an image!</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg shadow-sm border border-gray-100">
                <img
                  src={`data:image/${item.originalImageMimeType.split('/')[1] || 'png'};base64,${item.enhancedImage}`}
                  alt="Enhanced thumbnail"
                  className="w-20 h-20 object-cover rounded-md flex-shrink-0 border border-gray-200"
                  loading="lazy"
                />
                <div className="flex-grow">
                  <p className="text-base font-semibold text-gray-800 line-clamp-2">{item.prompt}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.timestamp).toLocaleString()} &bull; {item.resolution}
                  </p>
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700 transition-colors p-2"
                  aria-label="Remove from history"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
        {history.length > 0 && (
          <div className="p-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClearAll}
              className="px-4 py-2 bg-red-500 text-white font-semibold rounded-md hover:bg-red-600 transition-colors"
            >
              Clear All History
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileSection;