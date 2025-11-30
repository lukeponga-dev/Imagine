
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ImageUploader from './components/ImageUploader';
import EnhancedImageDisplay from './components/EnhancedImageDisplay';
import UserProfileSection from './components/UserProfileSection'; // New import
import { enhanceImage } from './services/geminiService';
import { ApiError, AIStudio, HistoryItem } from './types'; // Updated import
import { API_KEY_BILLING_URL, LOADING_MESSAGES, RESOLUTION_OPTIONS, DEFAULT_RESOLUTION } from './constants';
import { saveHistoryItem, getHistory, clearHistory, removeHistoryItem } from './utils/historyStorage'; // New import

// The AI Studio environment is expected to provide its own type definitions for `window.aistudio`.
// If not already globally typed by the environment, you might need to add a `declare global` block
// in `types.ts` to augment the `Window` interface if TypeScript complains about `window.aistudio`.

function App() {
  const [originalImage, setOriginalImage] = useState<string | undefined>(undefined);
  const [originalImageMimeType, setOriginalImageMimeType] = useState<string | undefined>(undefined);
  const [prompt, setPrompt] = useState<string>('');
  const [enhancedImage, setEnhancedImage] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [hasApiKeySelected, setHasApiKeySelected] = useState<boolean>(true);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState<string>('');
  const [selectedResolution, setSelectedResolution] = useState<string>(DEFAULT_RESOLUTION);
  const [showHistory, setShowHistory] = useState<boolean>(false); // New state for history modal
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]); // New state for history items

  // Check API key status and load history on component mount
  useEffect(() => {
    const initializeApp = async () => {
      // Load history
      setHistoryItems(getHistory());

      // Check API Key
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKeySelected(selected);
      } else {
        // Fallback for environments where window.aistudio might not be available
        setHasApiKeySelected(!!process.env.API_KEY);
      }
    };
    initializeApp();
  }, []);

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
    setSelectedResolution(DEFAULT_RESOLUTION); // Reset resolution
  }, []);

  const handleClearAll = useCallback(() => {
    handleClearOriginalImage();
  }, [handleClearOriginalImage]);

  const handleEnhanceClick = useCallback(async () => {
    if (!originalImage || !prompt || !originalImageMimeType) {
      setError('Please upload an image and provide an enhancement prompt.');
      return;
    }

    if (!process.env.API_KEY) {
      setHasApiKeySelected(false);
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
      const result = await enhanceImage(originalImage, prompt, originalImageMimeType, selectedResolution);
      setEnhancedImage(result);

      // Save to history upon successful enhancement
      if (result) {
        const newHistoryItem: HistoryItem = {
          id: crypto.randomUUID(), // Generate a unique ID for the history item
          originalImage: originalImage,
          originalImageMimeType: originalImageMimeType,
          prompt: prompt,
          enhancedImage: result,
          timestamp: Date.now(),
          resolution: selectedResolution,
        };
        saveHistoryItem(newHistoryItem);
        setHistoryItems(getHistory()); // Refresh history state
      }
    } catch (err: unknown) {
      console.error('Enhancement Error:', err);
      if (err instanceof ApiError) {
        let userMessage = 'Enhancement failed. Please try again.';
        if (err.statusCode === 401 || err.errorType === 'API_KEY_INVALID') {
          setHasApiKeySelected(false);
          userMessage = `API Key Invalid or Missing Permissions: ${err.message}. Please re-select your API key.`;
        } else if (err.statusCode === 403 || err.errorType === 'PERMISSION_DENIED') {
          userMessage = `Permission Denied: Your API key might not have the necessary permissions. Please check your GCP project settings.`;
        } else if (err.statusCode === 400 || err.errorType === 'BAD_REQUEST') {
          userMessage = `Invalid Request: The AI could not process your request. Please refine your prompt, image, or resolution. Details: ${err.message}`;
        } else if (err.statusCode === 429 || err.errorType === 'RESOURCE_EXHAUSTED') {
          userMessage = `Rate Limit Exceeded: You've sent too many requests. Please wait a moment and try again.`;
        } else if (err.errorType === 'MODEL_TEXT_RESPONSE') {
          userMessage = `The AI responded with text instead of an image: "${err.errorDetails}". Please adjust your prompt.`;
        } else {
          userMessage = `An API error occurred: ${err.message || 'Unknown API error.'}`;
        }
        setError(userMessage);
      } else if (err instanceof Error) {
        if (err.message.includes("API Key error: Please select a valid API key")) {
          setHasApiKeySelected(false);
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
  }, [originalImage, prompt, originalImageMimeType, hasApiKeySelected, selectedResolution]);

  const handleSelectApiKey = useCallback(async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        // Assume success for race condition mitigation as per guidelines
        setHasApiKeySelected(true);
        setError(undefined); // Clear any previous API key errors on successful selection attempt
      } catch (keyError) {
        console.error("Error opening API key selection:", keyError);
        setError("Failed to open API key selection. Please try again.");
      }
    } else {
      setError('window.aistudio.openSelectKey() is not available. Ensure you are in the correct environment.');
    }
  }, []);

  const handleOpenHistory = useCallback(() => setShowHistory(true), []);
  const handleCloseHistory = useCallback(() => setShowHistory(false), []);

  const handleRemoveHistoryItem = useCallback((id: string) => {
    removeHistoryItem(id);
    setHistoryItems(getHistory()); // Refresh state after removal
  }, []);

  const handleClearAllHistory = useCallback(() => {
    clearHistory();
    setHistoryItems([]); // Clear state
  }, []);


  const isEnhanceButtonDisabled = useMemo(() => {
    return isLoading || !originalImage || !prompt || !hasApiKeySelected;
  }, [isLoading, originalImage, prompt, hasApiKeySelected]);

  return (
    <> {/* Added React Fragment wrapper */}
      <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-100 font-sans text-gray-800">
        <header className="w-full max-w-4xl text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-extrabold text-blue-700 tracking-tighter drop-shadow-lg animate-fade-in">
            Image Enhancer AI
          </h1>
          <p className="mt-4 text-xl text-gray-700 animate-slide-up">
            Upload an image, tell the AI how to enhance it, and see the magic unfold!
          </p>
          <div className="mt-5 flex justify-center items-center gap-6 text-base">
            <span className="font-semibold text-gray-700">API Key Status: </span>
            {hasApiKeySelected ? (
              <span className="text-green-600 font-medium flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Selected
              </span>
            ) : (
              <span className="text-red-600 font-medium flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0v-4a1 1 0 112 0v4zm-1-9a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                </svg>
                Not Selected
              </span>
            )}
            <button
              onClick={handleOpenHistory}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors shadow-sm text-sm font-medium"
              aria-label="View past enhancements"
            >
              <span className="hidden sm:inline">View </span>History
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block ml-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </header>

        {!hasApiKeySelected && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-5 mb-8 rounded-lg shadow-md w-full max-w-2xl text-center flex flex-col items-center">
            <p className="font-bold text-xl mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              API Key Required!
            </p>
            <p className="mb-4 text-gray-700">
              To unlock the full potential of Gemini Pro Vision, please select a valid API key from a
              <a href={API_KEY_BILLING_URL} target="_blank" rel="noopener noreferrer" className="text-yellow-700 underline font-medium ml-1 hover:text-yellow-900 transition-colors">paid GCP project</a>.
            </p>
            <button
              onClick={handleSelectApiKey}
              className="px-8 py-3 bg-yellow-600 text-white font-bold rounded-full hover:bg-yellow-700 transition-transform transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select API Key
            </button>
          </div>
        )}

        <main className="flex flex-col gap-10 w-full max-w-4xl">
          <ImageUploader
            onImageSelected={handleImageSelected}
            onClear={handleClearOriginalImage}
            isLoading={isLoading}
            currentImage={originalImage}
          />

          {originalImage && (
            <div className="sticky bottom-0 left-0 right-0 p-5 bg-white border-t border-gray-200 shadow-xl rounded-t-xl z-10 flex flex-col md:flex-row items-center gap-5">
              <input
                type="text"
                placeholder="e.g., 'Make it look more vibrant and artistic', 'Change the background to a starry night', 'Sharpen the details and increase contrast'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
                className="flex-grow p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-800 placeholder-gray-500 shadow-sm"
              />
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <label htmlFor="resolution-select" className="text-gray-700 text-base font-medium whitespace-nowrap">Resolution:</label>
                <select
                  id="resolution-select"
                  value={selectedResolution}
                  onChange={(e) => setSelectedResolution(e.target.value)}
                  disabled={isLoading}
                  className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-800 shadow-sm w-full sm:w-auto"
                >
                  {RESOLUTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleEnhanceClick}
                disabled={isEnhanceButtonDisabled}
                className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-transform transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
              >
                {isLoading && (
                  <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                Enhance Image
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center p-8 bg-blue-50 rounded-xl shadow-lg w-full max-w-xl mx-auto mt-6 border border-blue-200">
              <svg className="animate-pulse-fast h-16 w-16 text-blue-600 mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-blue-800 text-xl font-semibold text-center animate-pulse-slow">
                {currentLoadingMessage}
              </p>
              <p className="text-blue-600 text-sm mt-3 text-center">
                Image generation can take a moment. Please be patient.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-5 mt-6 rounded-lg shadow-md w-full max-w-2xl mx-auto">
              <p className="font-bold text-lg mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Error:
              </p>
              <p className="mb-3 text-gray-700">{error}</p>
              {(error.includes("API Key Invalid") || error.includes("API Key error")) && (
                <button
                  onClick={handleSelectApiKey}
                  className="mt-3 px-6 py-2 bg-red-600 text-white font-semibold rounded-full hover:bg-red-700 transition-colors shadow-md"
                >
                  Re-select API Key
                </button>
              )}
              {!error.includes("API Key") && !error.includes("Invalid Request") && (
                <p className="text-sm mt-3 text-gray-600">
                  If the problem persists, try a different prompt or image.
                </p>
              )}
            </div>
          )}

          <EnhancedImageDisplay
            originalImage={originalImage}
            originalImageMimeType={originalImageMimeType}
            enhancedImage={enhancedImage}
            onClearAll={handleClearAll}
            isLoading={isLoading}
          />
        </main>

        {showHistory && (
          <UserProfileSection
            history={historyItems}
            onClose={handleCloseHistory}
            onRemoveItem={handleRemoveHistoryItem}
            onClearAll={handleClearAllHistory}
          />
        )}
      </div>
    </> // Closing React Fragment wrapper
  );
}

export default App;
