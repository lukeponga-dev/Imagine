
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

// Fix: Changed from interface to class to allow instantiation
export class ApiError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ApiError'; // Set the name of the error class
    this.statusCode = statusCode;

    // This is important for correctly extending built-in classes in TypeScript
    // and for correct instanceof checks.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
