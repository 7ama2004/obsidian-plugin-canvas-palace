import { Vault, requestUrl } from 'obsidian';
import { PixabayPrompt, PixabayResult, GoogleSearchResult, MemoryPalaceSettings } from './types';

/**
 * Search Pixabay for images or videos based on the prompt
 */
export async function searchPixabay(prompt: PixabayPrompt, settings: MemoryPalaceSettings): Promise<PixabayResult[]> {
  if (!settings.pixabayApiKey) {
    throw new Error('Pixabay API key is required. Please set it in the plugin settings.');
  }

  // Determine the API endpoint based on prompt type
  let baseUrl: string;
  if (prompt.type === 'image') {
    baseUrl = 'https://pixabay.com/api/';
  } else if (prompt.type === 'video') {
    baseUrl = 'https://pixabay.com/api/videos/';
  } else {
    throw new Error(`Unsupported media type: ${prompt.type}`);
  }

  // Construct the full URL with query parameters
  const url = new URL(baseUrl);
  url.searchParams.append('key', settings.pixabayApiKey);
  url.searchParams.append('q', prompt.query);
  url.searchParams.append('per_page', '9');
  url.searchParams.append('safesearch', 'false');

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Pixabay API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.hits || data.hits.length === 0) {
      throw new Error(`No results found for "${prompt.query}"`);
    }

    // Map the response hits differently based on the prompt type
    const results: PixabayResult[] = data.hits.map((hit: any) => {
      if (prompt.type === 'image') {
        return {
          id: hit.id,
          previewURL: hit.previewURL,
          fullURL: hit.largeImageURL,
          tags: hit.tags
        };
      } else if (prompt.type === 'video') {
        return {
          id: hit.id,
          previewURL: hit.videos.small.thumbnail,
          fullURL: hit.videos.small.url,
          tags: hit.tags
        };
      }
      throw new Error(`Unsupported media type: ${prompt.type}`);
    });

    return results;
  } catch (error) {
    console.error('Error searching Pixabay:', error);
    throw new Error(`Failed to search Pixabay: ${error.message}`);
  }
}

/**
 * Download media from Pixabay and save it to the vault
 */
export async function downloadMedia(mediaResult: PixabayResult, prompt: PixabayPrompt, vault: Vault): Promise<string> {
  try {
    const response = await fetch(mediaResult.fullURL);
    
    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    
    // Determine file extension based on type
    const extension = prompt.type === 'image' ? 'jpg' : 'mp4';
    
    // Create a unique filename
    const filename = `pixabay-${mediaResult.id}.${extension}`;
    
    // Ensure the attachments directory exists
    const attachmentDir = 'attachments/memory-palace';
    const fullPath = `${attachmentDir}/${filename}`;
    
    // Create directory if it doesn't exist
    const adapter = vault.adapter;
    if (!await adapter.exists(attachmentDir)) {
      await adapter.mkdir(attachmentDir);
    }
    
    // Save the file
    await vault.createBinary(fullPath, arrayBuffer);
    
    return fullPath;
  } catch (error) {
    console.error('Error downloading media:', error);
    throw new Error(`Failed to download media: ${error.message}`);
  }
}

/**
 * Search Google Images using the Programmable Search Engine API
 */
export async function searchGoogleImages(query: string, settings: MemoryPalaceSettings): Promise<GoogleSearchResult[]> {
  // Validate settings
  if (!settings.googleApiKey) {
    throw new Error('Google API key is required. Please set it in the plugin settings.');
  }
  if (!settings.googleSearchEngineId) {
    throw new Error('Google Programmable Search Engine ID (CX) is required. Please set it in the plugin settings.');
  }

  // Construct endpoint URL
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.append("key", settings.googleApiKey);
  url.searchParams.append("cx", settings.googleSearchEngineId);
  url.searchParams.append("q", query);
  url.searchParams.append("searchType", "image"); // This is essential!
  url.searchParams.append("num", "9"); // Show 9 results in perfect 3x3 grid

  try {
    // Make API call
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Search API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Handle response and extract data
    const jsonResponse = await response.json();
    
    // Check if results exist
    if (!jsonResponse.items || jsonResponse.items.length === 0) {
      return [];
    }

    // Map the response items to GoogleSearchResult objects
    const results: GoogleSearchResult[] = jsonResponse.items.map((item: any) => ({
      fullURL: item.link,
      previewURL: item.image?.thumbnailLink || item.link, // Fallback to full URL if no thumbnail
      title: item.title || 'Untitled'
    }));

    return results;
  } catch (error) {
    console.error('Error searching Google Images:', error);
    throw new Error(`Failed to search Google Images: ${error.message}`);
  }
}

/**
 * Download media from any URL and save it to the vault (reusable for both Pixabay and Google)
 * Uses Obsidian's requestUrl to bypass CORS restrictions
 */
export async function downloadMediaFromUrl(url: string, filename: string, vault: Vault): Promise<string> {
  try {
    // Use Obsidian's requestUrl to bypass CORS restrictions
    const response = await requestUrl({
      url: url,
      method: 'GET'
    });
    
    if (!response.arrayBuffer) {
      throw new Error('No data received from URL');
    }

    // Ensure the attachments directory exists
    const attachmentDir = 'attachments/memory-palace';
    const fullPath = `${attachmentDir}/${filename}`;
    
    // Create directory if it doesn't exist
    const adapter = vault.adapter;
    if (!await adapter.exists(attachmentDir)) {
      await adapter.mkdir(attachmentDir);
    }
    
    // Save the file
    await vault.createBinary(fullPath, response.arrayBuffer);
    
    return fullPath;
  } catch (error) {
    console.error('Error downloading media:', error);
    throw new Error(`Failed to download media: ${error.message}`);
  }
}

/**
 * Generate an image using Google AI Gemini API
 */
export async function generateGeminiImage(prompt: string, settings: MemoryPalaceSettings, vault: Vault): Promise<string> {
  // Validate settings
  if (!settings.geminiApiKey) {
    throw new Error('Gemini API key is required. Please set it in the plugin settings.');
  }

  // Construct endpoint URL
  const model = 'gemini-2.0-flash-preview-image-generation';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.geminiApiKey}`;

  // Construct request body
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  };

  try {
    // Make API call
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Handle response and extract data
    const jsonResponse = await response.json();
    
    if (!jsonResponse.candidates || !jsonResponse.candidates[0] || !jsonResponse.candidates[0].content) {
      throw new Error('No candidates returned from Gemini API');
    }

    // Find the image data in the response parts
    const parts = jsonResponse.candidates[0].content.parts;
    let imageData: string | null = null;

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        imageData = part.inlineData.data;
        break;
      }
    }

    if (!imageData) {
      throw new Error('No image data found in Gemini API response');
    }

    // Decode Base64 and save
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const binaryString = atob(base64Data);
    const arrayBuffer = new ArrayBuffer(binaryString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }

    // Generate a unique filename
    const filename = `gemini-native-${Date.now()}.png`;
    
    // Ensure the attachments directory exists
    const attachmentDir = 'attachments/memory-palace';
    const fullPath = `${attachmentDir}/${filename}`;
    
    // Create directory if it doesn't exist
    const adapter = vault.adapter;
    if (!await adapter.exists(attachmentDir)) {
      await adapter.mkdir(attachmentDir);
    }
    
    // Save the file
    await vault.createBinary(fullPath, arrayBuffer);
    
    return fullPath;
  } catch (error) {
    console.error('Error generating Gemini image:', error);
    throw new Error(`Failed to generate Gemini image: ${error.message}`);
  }
} 
