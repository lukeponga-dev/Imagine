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
      <div className="flex flex-col items-center gap-6 p-4 md:p-6 bg-white rounded-lg shadow-md w-full">
        <h3 className="text-xl font-semibold text-gray-800">Results</h3>

        {hasBothImages ? (
          <>
            {/* Slider Comparison View */}
            <div
              ref={containerRef}
              className="relative w-full max-w-4xl h-96 bg-gray-200 rounded-md overflow-hidden cursor-ew-resize select-none"
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
                className="absolute top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize flex items-center justify-center group z-10"
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
                <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white shadow-md group-hover:scale-110 transition-transform"></div>
              </div>
            </div>

            {enhancedImage && (
              <button
                onClick={handleDownload}
                disabled={isLoading}
                className="px-4 py-2 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                Download Image
              </button>
            )}
          </>
        ) : (
          // Existing Side-by-Side or Placeholder View
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            {originalImage && (
              <div className="flex flex-col items-center gap-2">
                <h4 className="text-lg font-medium text-gray-700">Original Image</h4>
                <div className="w-full h-80 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                  <img src={`data:${originalImageMimeType || 'image/png'};base64,${originalImage}`} alt="Original" className="object-contain max-w-full max-h-full" />
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
        )}

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