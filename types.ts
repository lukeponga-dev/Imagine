

export interface ImagePart {
  inlineData: {
    mimeType: string;
    data: string; // Base64 encoded string
  };
}

export interface ApiResponsePart {
  inlineData?: {
    mimeType: string;
    data: string; // Base64 encoded string
  };
  text?: string;
}

// Define the global AIStudio interface as per the coding guidelines.
export interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
}

export class ApiError extends Error {
  statusCode?: number;
  errorType?: string; // e.g., 'API_KEY_INVALID', 'MODEL_ERROR', 'NETWORK_ERROR'
  errorDetails?: any; // More detailed error object or message

  constructor(message: string, statusCode?: number, errorType?: string, errorDetails?: any) {
    super(message);
    this.name = 'ApiError'; // Set the name of the error class
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.errorDetails = errorDetails;

    // This is important for correctly extending built-in classes in TypeScript
    // and for correct instanceof checks.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface HistoryItem {
  id: string; // Unique ID for the item
  originalImage: string;
  originalImageMimeType: string;
  prompt: string;
  enhancedImage: string;
  timestamp: number; // Unix timestamp
  resolution: string;
}