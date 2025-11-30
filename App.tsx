import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ImageUploader from './components/ImageUploader';
import EnhancedImageDisplay from './components/EnhancedImageDisplay';
import UserProfileSection from './components/UserProfileSection'; // New import
import { enhanceImage } from './services/geminiService';
import { ApiError, AIStudio, HistoryItem } from './types'; // Updated import
import { API_KEY_BILLING_URL, LOADING_MESSAGES, RESOLUTION_OPTIONS, DEFAULT_RESOLUTION } from './constants';
import { saveHistoryItem, getHistory, clearHistory, removeHistoryItem } from './utils/historyStorage'; // New import

// Remove redundant `declare global` block for `window.aistudio`.
// The AI Studio environment is expected to provide its own type definitions for `window.aistudio`,
// making this local declaration a subsequent and conflicting one, despite defining the same type.
// If not already globally typed by the environment, a new error "Property 'aistudio' does not exist on type 'Window'"
// would occur, but given the specific error, it implies a pre-existing declaration.

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
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-100 font-sans text-gray-800">
      <header className="w-full max-w-4xl text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-700 tracking-tight">
          Image Enhancer AI
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          Upload an image, tell the AI how to enhance it, and see the magic unfold!
        </p>
        <div className="mt-2 flex justify-center items-center gap-4 text-sm">
          <span className="font-semibold">API Key Status: </span>
          {hasApiKeySelected ? (
            <span className="text-green-600">Selected</span>
          ) : (
            <span className="text-red-600">Not Selected</span>
          )}
          <button
            onClick={handleOpenHistory}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors text-sm font-medium"
            aria-label="View past enhancements"
          >
            History
          </button>
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
            <div className="flex flex-col md:flex-row items-center gap-2">
              <label htmlFor="resolution-select" className="text-gray-700 text-sm md:text-base font-medium whitespace-nowrap">Resolution:</label>
              <select
                id="resolution-select"
                value={selectedResolution}
                onChange={(e) => setSelectedResolution(e.target.value)}
                disabled={isLoading}
                className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-700 w-full md:w-auto"
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
            {(error.includes("API Key Invalid") || error.includes("API Key error")) && (
              <button
                onClick={handleSelectApiKey}
                className="mt-3 px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors"
              >
                Re-select API Key
              </button>
            )}
            {/* Added a general recommendation for non-key related errors if appropriate */}
            {!error.includes("API Key") && !error.includes("Invalid Request") && (
              <p className="text-sm mt-2">
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
  );
}

export default App;