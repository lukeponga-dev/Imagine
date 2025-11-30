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
 * @returns A promise that resolves with the base64 encoded enhanced image data, or throws an ApiError.
 */
export const enhanceImage = async (
  originalImage: string,
  prompt: string,
  mimeType: string,
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
          imageSize: "1K" // Default to 1K, can be made configurable if needed
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
        // Fix: Use the ApiError class constructor
        throw new ApiError(`Model returned text: "${textExplanation}". No image data found.`, 200);
      }
      // Fix: Use the ApiError class constructor
      throw new ApiError('No enhanced image data found in the response.', 500);
    }
  } catch (error: unknown) {
    console.error('Gemini API Error:', error);
    // Fix: Use instanceof to check the type of error and access properties safely
    if (error instanceof ApiError) {
      throw error;
    } else if (error instanceof Error) {
      // Check for specific error message related to API key
      if (error.message.includes("Requested entity was not found.")) {
        // Fix: Use the ApiError class constructor
        throw new ApiError("API Key error: Please select a valid API key from a paid GCP project. You might need to re-select your API key.", 401);
      }
      // Fix: Use the ApiError class constructor
      throw new ApiError(error.message || 'An unknown error occurred during image enhancement.', 500);
    }
    // Fix: Use the ApiError class constructor
    throw new ApiError('An unknown error occurred during image enhancement.', 500);
  }
};