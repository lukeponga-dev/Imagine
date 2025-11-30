import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
// Fix: Import ApiError as a class, not just a type
import { ImagePart, ApiResponsePart, ApiError } from '../types';
import { GEMINI_IMAGE_MODEL } from '../constants';

/**
 * Enhances an image using the Gemini Vision model.
 *
 * @param originalImage The base64 encoded original image data.
 * @param prompt The text prompt describing the enhancement.
 * @param mimeType The MIME type of the original image (e.g., 'image/png', 'image/jpeg').
 * @param resolution The desired output resolution (e.g., '1K', '2K', '4K').
 * @returns A promise that resolves with the base64 encoded enhanced image data, or throws an ApiError.
 */
export const enhanceImage = async (
  originalImage: string,
  prompt: string,
  mimeType: string,
  resolution: string,
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not set.");
  }

  // Create a new GoogleGenAI instance for each call to ensure it uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const imagePart: ImagePart = {
      inlineData: {
        mimeType: mimeType,
        data: originalImage,
      },
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: {
        parts: [
          imagePart,
          { text: prompt },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1", // Default to 1:1, can be made configurable if needed
          imageSize: resolution // Use the selected resolution
        },
      },
    });

    // Iterate through parts to find the image part
    const imageContentPart = response.candidates?.[0]?.content?.parts.find(
      (part: ApiResponsePart) => part.inlineData?.data
    );

    if (imageContentPart?.inlineData?.data) {
      return imageContentPart.inlineData.data;
    } else {
      // If no image data is found, check if there's a text explanation
      const textExplanation = response.text;
      if (textExplanation) {
        throw new ApiError(
          `Model returned text: "${textExplanation}". No image data found.`,
          200,
          'MODEL_TEXT_RESPONSE',
          textExplanation
        );
      }
      throw new ApiError('No enhanced image data found in the response.', 500, 'NO_IMAGE_DATA');
    }
  } catch (error: unknown) {
    console.error('Gemini API Error:', error);
    if (error instanceof ApiError) {
      throw error;
    } else if (error instanceof Error) {
      if (error.message.includes("Requested entity was not found.")) {
        throw new ApiError(
          "API Key error: Please select a valid API key from a paid GCP project. You might need to re-select your API key.",
          401,
          'API_KEY_INVALID'
        );
      }
      // Attempt to parse common API error structures if available
      let statusCode: number | undefined;
      let errorType: string = 'UNKNOWN_ERROR';
      let errorDetails: any;

      if (error.message.includes('400 BAD_REQUEST')) {
        statusCode = 400;
        errorType = 'BAD_REQUEST';
        errorDetails = error.message.split('400 BAD_REQUEST: ')[1] || error.message;
      } else if (error.message.includes('403 PERMISSION_DENIED')) {
        statusCode = 403;
        errorType = 'PERMISSION_DENIED';
        errorDetails = error.message.split('403 PERMISSION_DENIED: ')[1] || error.message;
      } else if (error.message.includes('429 RESOURCE_EXHAUSTED')) {
        statusCode = 429;
        errorType = 'RESOURCE_EXHAUSTED';
        errorDetails = error.message.split('429 RESOURCE_EXHAUSTED: ')[1] || error.message;
      } else if (error.message.includes('500 INTERNAL_SERVER_ERROR')) {
        statusCode = 500;
        errorType = 'INTERNAL_SERVER_ERROR';
        errorDetails = error.message.split('500 INTERNAL_SERVER_ERROR: ')[1] || error.message;
      }

      throw new ApiError(
        error.message || 'An unknown error occurred during image enhancement.',
        statusCode,
        errorType,
        errorDetails
      );
    }
    throw new ApiError('An unknown error occurred during image enhancement.', 500, 'UNKNOWN_ERROR');
  }
};