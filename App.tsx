import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ImageUploader from './components/ImageUploader';
import EnhancedImageDisplay from './components/EnhancedImageDisplay';
import { enhanceImage } from './services/geminiService';
// Fix: Import ApiError as a class
import { ApiError } from './types';
import { API_KEY_BILLING_URL, LOADING_MESSAGES } from './constants';

// Fix: Removed declare global block as it's now in types.ts

function App() {
  const [originalImage, setOriginalImage] = useState<string | undefined>(undefined);
  const [originalImageMimeType, setOriginalImageMimeType] = useState<string | undefined>(undefined);
  const [prompt, setPrompt] = useState<string>('');
  const [enhancedImage, setEnhancedImage] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [hasApiKeySelected, setHasApiKeySelected] = useState<boolean>(true);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState<string>('');

  // Check API key status on component mount
  useEffect(() => {
    const checkApiKey = async () => {
      // Fix: Access window.aistudio directly as its type is now globally declared
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKeySelected(selected);
      } else {
        // If aistudio is not available, assume API_KEY env var is the source.
        // For local development, this will typically be true.
        setHasApiKeySelected(!!process.env.API_KEY);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    checkApiKey();
  }, []); // Run only once on mount

  // Cycle through loading messages
  useEffect(() => {
    if (isLoading) {
      let messageIndex = 0;
      setCurrentLoadingMessage(LOADING_MESSAGES[messageIndex]);
      const interval = setInterval(() => {
        messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
        setCurrentLoadingMessage(LOADING_MESSAGES[messageIndex]);
      }, 3000); // Change message every 3 seconds
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const handleImageSelected = useCallback((base64Image: string, mimeType: string) => {
    setOriginalImage(base64Image);
    setOriginalImageMimeType(mimeType);
    setEnhancedImage(undefined); // Clear previous enhanced image
    setError(undefined);
  }, []);

  const handleClearOriginalImage = useCallback(() => {
    setOriginalImage(undefined);
    setOriginalImageMimeType(undefined);
    setPrompt('');
    setEnhancedImage(undefined);
    setError(undefined);
  }, []);

  const handleClearAll = useCallback(() => {
    handleClearOriginalImage();
  }, [handleClearOriginalImage]);

  const handleEnhanceClick = useCallback(async () => {
    if (!originalImage || !prompt || !originalImageMimeType) {
      setError('Please upload an image and provide an enhancement prompt.');
      return;
    }

    // More robust API key validation: Check for the presence of API_KEY before proceeding
    // The `geminiService` also checks this, but an early exit here provides faster feedback.
    if (!process.env.API_KEY) {
      setHasApiKeySelected(false); // Update state to reflect missing key
      setError('API_KEY is not configured. Please select your API key.');
      return;
    }

    if (!hasApiKeySelected) {
      setError('Please select your API key before enhancing images.');
      return;
    }

    setIsLoading(true);
    setError(undefined);
    setEnhancedImage(undefined);

    try {
      const result = await enhanceImage(originalImage, prompt, originalImageMimeType);
      setEnhancedImage(result);
    } catch (err: unknown) {
      console.error('Enhancement Error:', err);
      // Fix: Use instanceof to correctly narrow the type and access properties safely
      if (err instanceof ApiError) {
        if (err.statusCode === 401 && err.message.includes("Requested entity was not found.")) {
          setHasApiKeySelected(false); // Reset API key selection state
          setError(`API Key Invalid: ${err.message}`);
        } else {
          setError(`Enhancement failed: ${err.message}`);
        }
      } else if (err instanceof Error) {
        // Check for specific error message related to API key from general error
        if (err.message.includes("API Key error: Please select a valid API key")) {
          setHasApiKeySelected(false); // Reset API key selection state
          setError(err.message);
        } else {
          setError(`An unexpected error occurred: ${err.message}`);
        }
      } else {
        setError('An unknown error occurred during image enhancement.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [originalImage, prompt, originalImageMimeType, hasApiKeySelected]);

  const handleSelectApiKey = useCallback(async () => {
    // Fix: Access window.aistudio directly as its type is now globally declared
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      // Assume selection was successful, proceed.
      // A race condition can occur where hasSelectedApiKey() may not immediately return true after
      // the user selects a key. We assume success and proceed.
      setHasApiKeySelected(true);
      setError(undefined); // Clear any previous API key errors
    } else {
      setError('window.aistudio.openSelectKey() is not available. Ensure you are in the correct environment.');
    }
  }, []);

  const isEnhanceButtonDisabled = useMemo(() => {
    return isLoading || !originalImage || !prompt || !hasApiKeySelected;
  }, [isLoading, originalImage, prompt, hasApiKeySelected]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-100 font-sans text-gray-800">
      <header className="w-full max-w-4xl text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-700 tracking-tight">
          Image Enhancer AI
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          Upload an image, tell the AI how to enhance it, and see the magic unfold!
        </p>
        {/* API Key Status Indicator */}
        <div className="mt-2 text-sm">
          <span className="font-semibold">API Key Status: </span>
          {hasApiKeySelected ? (
            <span className="text-green-600">Selected</span>
          ) : (
            <span className="text-red-600">Not Selected</span>
          )}
        </div>
      </header>

      {!hasApiKeySelected && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-md shadow-sm w-full max-w-2xl text-center">
          <p className="font-semibold mb-2">API Key Required!</p>
          <p className="mb-3">
            To use the powerful Gemini Pro Vision model, you need to select a valid API key from a
            <a href={API_KEY_BILLING_URL} target="_blank" rel="noopener noreferrer" className="text-yellow-800 underline ml-1">paid GCP project</a>.
          </p>
          <button
            onClick={handleSelectApiKey}
            className="px-6 py-2 bg-yellow-600 text-white font-bold rounded-full hover:bg-yellow-700 transition-colors disabled:opacity-50"
          >
            Select API Key
          </button>
        </div>
      )}

      <main className="flex flex-col gap-8 w-full max-w-4xl">
        <ImageUploader
          onImageSelected={handleImageSelected}
          onClear={handleClearOriginalImage}
          isLoading={isLoading}
          currentImage={originalImage}
        />

        {originalImage && (
          <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg rounded-t-lg z-10 flex flex-col md:flex-row items-center gap-4">
            <input
              type="text"
              placeholder="e.g., 'Make it look more vibrant and artistic', 'Change the background to a starry night', 'Sharpen the details and increase contrast'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              className="flex-grow p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-700"
            />
            <button
              onClick={handleEnhanceClick}
              disabled={isEnhanceButtonDisabled}
              className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Enhance Image
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-lg shadow-inner w-full max-w-xl mx-auto mt-4">
            <svg className="animate-bounce h-12 w-12 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="text-blue-700 text-lg font-medium text-center animate-pulse">
              {currentLoadingMessage}
            </p>
            <p className="text-blue-500 text-sm mt-2 text-center">
              Image generation can take a moment. Please be patient.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mt-6 rounded-md shadow-sm w-full max-w-2xl mx-auto">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
            {error.includes("API Key Invalid") && (
              <button
                onClick={handleSelectApiKey}
                className="mt-3 px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors"
              >
                Re-select API Key
              </button>
            )}
          </div>
        )}

        <EnhancedImageDisplay
          originalImage={originalImage}
          enhancedImage={enhancedImage}
          onClearAll={handleClearAll}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}

export default App;