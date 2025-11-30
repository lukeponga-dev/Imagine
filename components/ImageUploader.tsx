import React, { useState, useCallback, useRef } from 'react';

interface ImageUploaderProps {
  onImageSelected: (base64Image: string, mimeType: string) => void;
  onClear: () => void;
  isLoading: boolean;
  currentImage?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = React.memo(
  ({ onImageSelected, onClear, isLoading, currentImage }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          const mimeType = file.type;
          onImageSelected(base64String, mimeType);
        };
        reader.readAsDataURL(file);
      }
    }, [onImageSelected]);

    const handleClear = useCallback(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear the input visually
      }
      onClear();
    }, [onClear]);

    return (
      <div className="flex flex-col items-center gap-4 p-4 md:p-6 bg-white rounded-lg shadow-md w-full">
        <h3 className="text-xl font-semibold text-gray-800">Upload Your Image</h3>
        <div className="relative w-full max-w-md h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
          {currentImage ? (
            <img src={`data:image/png;base64,${currentImage}`} alt="Uploaded Preview" className="object-cover w-full h-full" />
          ) : (
            <p className="text-gray-500">Drag & Drop or Click to Upload</p>
          )}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isLoading}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
        {currentImage && (
          <button
            onClick={handleClear}
            disabled={isLoading}
            className="px-4 py-2 bg-red-500 text-white font-semibold rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear Image
          </button>
        )}
      </div>
    );
  }
);

export default ImageUploader;
