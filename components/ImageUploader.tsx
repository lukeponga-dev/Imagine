import React, { useState, useCallback, useRef } from 'react';

interface ImageUploaderProps {
  onImageSelected: (base64Image: string, mimeType: string) => void;
  onClear: () => void;
  isLoading: boolean;
  currentImage?: string;
}

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const ImageUploader: React.FC<ImageUploaderProps> = React.memo(
  ({ onImageSelected, onClear, isLoading, currentImage }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState<boolean>(false);
    const [uploadError, setUploadError] = useState<string | undefined>(undefined);

    const validateFile = useCallback((file: File): string | undefined => {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return `Unsupported file type: ${file.type}. Please upload a JPEG, PNG, or WebP image.`;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        return `File size exceeds ${MAX_FILE_SIZE_MB}MB. Please upload a smaller image.`;
      }
      return undefined; // No error
    }, []);

    const processFile = useCallback((file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setUploadError(validationError);
        return;
      }

      setUploadError(undefined); // Clear previous errors
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        const mimeType = file.type;
        onImageSelected(base64String, mimeType);
      };
      reader.readAsDataURL(file);
    }, [validateFile, onImageSelected]);


    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        processFile(file);
      }
      // Clear input value to allow re-uploading the same file if desired
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, [processFile]);

    const handleClear = useCallback(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear the input visually
      }
      setUploadError(undefined); // Clear upload error on clear
      onClear();
    }, [onClear]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Stop propagation to prevent browser default handling
      setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    }, [processFile]);

    return (
      <div className="flex flex-col items-center gap-6 p-6 bg-white rounded-xl shadow-lg w-full">
        <h3 className="text-2xl font-bold text-gray-800">Upload Your Image</h3>
        <div
          className={`relative w-full max-w-md h-72 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden transition-all duration-200
            ${isDragOver ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-100' : 'border-blue-300 bg-blue-50 hover:bg-blue-100'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {currentImage ? (
            <img src={`data:${currentImage.startsWith('data:image/') ? '' : 'image/png;base64,'}${currentImage}`} alt="Uploaded Preview" className="object-cover w-full h-full" />
          ) : (
            <p className="text-blue-600 text-lg font-medium flex flex-col items-center gap-2 group-hover:text-blue-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-75 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Drag & Drop or Click to Upload
            </p>
          )}
          <input
            type="file"
            accept={ALLOWED_MIME_TYPES.join(',')}
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isLoading}
            className="absolute inset-0 opacity-0 cursor-pointer"
            aria-label="Upload image file"
          />
        </div>
        {uploadError && (
          <p className="text-red-500 text-sm mt-3 font-medium text-center">{uploadError}</p>
        )}
        {currentImage && (
          <button
            onClick={handleClear}
            disabled={isLoading}
            className="px-6 py-3 bg-red-500 text-white font-semibold rounded-full hover:bg-red-600 transition-transform transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" />
            </svg>
            Clear Image
          </button>
        )}
      </div>
    );
  }
);

export default ImageUploader;