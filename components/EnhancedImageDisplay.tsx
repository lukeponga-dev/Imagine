import React, { useCallback } from 'react';

interface EnhancedImageDisplayProps {
  originalImage?: string;
  enhancedImage?: string;
  onClearAll: () => void;
  isLoading: boolean;
}

const EnhancedImageDisplay: React.FC<EnhancedImageDisplayProps> = React.memo(
  ({ originalImage, enhancedImage, onClearAll, isLoading }) => {
    if (!originalImage && !enhancedImage) {
      return null;
    }

    const handleDownload = useCallback(() => {
      if (enhancedImage) {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${enhancedImage}`;
        link.download = 'enhanced-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }, [enhancedImage]);

    return (
      <div className="flex flex-col items-center gap-6 p-4 md:p-6 bg-white rounded-lg shadow-md w-full">
        <h3 className="text-xl font-semibold text-gray-800">Results</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {originalImage && (
            <div className="flex flex-col items-center gap-2">
              <h4 className="text-lg font-medium text-gray-700">Original Image</h4>
              <div className="w-full h-80 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                <img src={`data:image/png;base64,${originalImage}`} alt="Original" className="object-contain max-w-full max-h-full" />
              </div>
            </div>
          )}

          {enhancedImage ? (
            <div className="flex flex-col items-center gap-2">
              <h4 className="text-lg font-medium text-gray-700">Enhanced Image</h4>
              <div className="w-full h-80 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                <img src={`data:image/png;base64,${enhancedImage}`} alt="Enhanced" className="object-contain max-w-full max-h-full" />
              </div>
              <button
                onClick={handleDownload}
                disabled={isLoading}
                className="px-4 py-2 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                Download Image
              </button>
            </div>
          ) : (
            originalImage && (
              <div className="flex flex-col items-center gap-2">
                <h4 className="text-lg font-medium text-gray-700">Enhanced Image</h4>
                <div className="w-full h-80 bg-gray-100 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                  <p className="text-gray-500 text-center">Your enhanced image will appear here.</p>
                </div>
              </div>
            )
          )}
        </div>
        {(originalImage || enhancedImage) && (
          <button
            onClick={onClearAll}
            disabled={isLoading}
            className="px-6 py-3 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            Clear All
          </button>
        )}
      </div>
    );
  }
);

export default EnhancedImageDisplay;