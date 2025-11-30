import React, { useState, useCallback, useRef, useEffect } from 'react';

interface EnhancedImageDisplayProps {
  originalImage?: string;
  originalImageMimeType?: string;
  enhancedImage?: string;
  onClearAll: () => void;
  isLoading: boolean;
}

const EnhancedImageDisplay: React.FC<EnhancedImageDisplayProps> = React.memo(
  ({ originalImage, originalImageMimeType, enhancedImage, onClearAll, isLoading }) => {
    const [sliderPosition, setSliderPosition] = useState(50); // percentage
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    if (!originalImage && !enhancedImage) {
      return null;
    }

    const handleDownload = useCallback(() => {
      if (enhancedImage) {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${enhancedImage}`; // Assuming enhanced image is PNG
        link.download = 'enhanced-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }, [enhancedImage]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      e.preventDefault(); // Prevent text selection
      setIsDragging(true);
    }, []);

    const handleMouseUp = useCallback(() => {
      setIsDragging(false);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      let x = e.clientX - rect.left; // x position within the element.
      x = Math.max(0, Math.min(x, rect.width)); // Clamp x within the container bounds
      const newPosition = (x / rect.width) * 100; // Convert to percentage
      setSliderPosition(newPosition);
    }, [isDragging]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault(); // Prevent scrolling the page
        setSliderPosition(prevPos => {
          let newPos = prevPos;
          if (e.key === 'ArrowLeft') {
            newPos = Math.max(0, prevPos - 5); // Move by 5%
          } else if (e.key === 'ArrowRight') {
            newPos = Math.min(100, prevPos + 5); // Move by 5%
          }
          return newPos;
        });
      }
    }, []);

    // Add event listeners to the window for mouseup to ensure it works even if mouse leaves the container
    useEffect(() => {
      const handleWindowMouseUp = () => setIsDragging(false);
      window.addEventListener('mouseup', handleWindowMouseUp);
      return () => window.removeEventListener('mouseup', handleWindowMouseUp);
    }, []);

    const hasBothImages = originalImage && enhancedImage;

    return (
      <div className="flex flex-col items-center gap-8 p-6 bg-white rounded-xl shadow-lg w-full">
        <h3 className="text-2xl font-bold text-gray-800">Results</h3>

        {hasBothImages ? (
          <>
            {/* Slider Comparison View */}
            <div
              ref={containerRef}
              className="relative w-full max-w-4xl h-96 bg-gray-100 rounded-xl overflow-hidden cursor-ew-resize select-none border border-gray-200 group"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseUp}
              onMouseUp={handleMouseUp}
              aria-label="Image comparison slider"
              role="img"
            >
              {/* Original Image (background) */}
              <img
                src={`data:${originalImageMimeType || 'image/png'};base64,${originalImage}`}
                alt="Original Image"
                className="absolute inset-0 object-contain w-full h-full"
                draggable="false"
              />

              {/* Enhanced Image container (foreground, clipped by width) */}
              <div
                className="absolute top-0 left-0 h-full overflow-hidden"
                style={{ width: `${sliderPosition}%` }}
              >
                <img
                  src={`data:image/png;base64,${enhancedImage}`}
                  alt="Enhanced Image"
                  className="absolute inset-0 object-contain w-full h-full"
                  draggable="false"
                />
              </div>

              {/* Slider Handle */}
              <div
                className="absolute top-0 bottom-0 w-1.5 bg-blue-500 cursor-ew-resize flex items-center justify-center group-hover:scale-x-125 transition-transform duration-200 z-10"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                onMouseDown={handleMouseDown}
                onKeyDown={handleKeyDown}
                draggable="false"
                aria-valuenow={sliderPosition}
                aria-valuemin={0}
                aria-valuemax={100}
                role="slider"
                tabIndex={0}
                aria-label="Image comparison slider handle"
              >
                {/* Visible handle */}
                <div className="w-9 h-9 rounded-full bg-blue-600 border-2 border-white shadow-lg group-hover:scale-110 transition-transform duration-200"></div>
              </div>
            </div>

            {enhancedImage && (
              <button
                onClick={handleDownload}
                disabled={isLoading}
                className="px-6 py-3 bg-green-600 text-white font-bold rounded-full hover:bg-green-700 transition-transform transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Download Enhanced Image
              </button>
            )}
          </>
        ) : (
          // Existing Side-by-Side or Placeholder View
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            {originalImage && (
              <div className="flex flex-col items-center gap-3">
                <h4 className="text-xl font-semibold text-gray-700">Original Image</h4>
                <div className="w-full h-80 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
                  <img src={`data:${originalImageMimeType || 'image/png'};base64,${originalImage}`} alt="Original" className="object-contain max-w-full max-h-full" />
                </div>
              </div>
            )}

            {enhancedImage ? (
              <div className="flex flex-col items-center gap-3">
                <h4 className="text-xl font-semibold text-gray-700">Enhanced Image</h4>
                <div className="w-full h-80 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
                  <img src={`data:image/png;base64,${enhancedImage}`} alt="Enhanced" className="object-contain max-w-full max-h-full" />
                </div>
                <button
                  onClick={handleDownload}
                  disabled={isLoading}
                  className="px-6 py-3 bg-green-600 text-white font-bold rounded-full hover:bg-green-700 transition-transform transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download Enhanced Image
                </button>
              </div>
            ) : (
              originalImage && (
                <div className="flex flex-col items-center gap-3">
                  <h4 className="text-xl font-semibold text-gray-700">Enhanced Image</h4>
                  <div className="w-full h-80 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center shadow-inner">
                    <p className="text-gray-500 text-center px-4">Your enhanced image will appear here.</p>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {(originalImage || enhancedImage) && (
          <button
            onClick={onClearAll}
            disabled={isLoading}
            className="px-8 py-4 bg-red-600 text-white font-bold rounded-full hover:bg-red-700 transition-transform transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" />
            </svg>
            Clear All
          </button>
        )}
      </div>
    );
  }
);

export default EnhancedImageDisplay;