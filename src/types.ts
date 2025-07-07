// For Milestone 1
export interface MemoryStationM1 {
  stationId: number;
  text: string;
}

// For Milestone 2
export interface MemoryStationM2 {
  stationId: number;
  text: string;
  association?: string;
  imagePath?: string;
  audioPath?: string;
}

// A generic type for the parsed data map
export type ParsedMemoryPalace<T> = Map<number, T>;

// Type definition for the entire JSON Canvas file structure
export interface CanvasNode {
  id: string;
  type: 'text' | 'file' | 'group' | 'link';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  file?: string;
  label?: string;
  // Add other node properties as needed
}

export interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  // Add other edge properties as needed
}

export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

// Pixabay-related interfaces
export interface PixabayPrompt {
  query: string;
  // This is now 'image' or 'video'
  type: 'image' | 'video';
  lineNumber: number;
}

export interface PixabayResult {
  id: number;
  // URL for the thumbnail shown in the selection modal.
  // For images, this will be hit.previewURL.
  // For videos, this will be hit.videos.small.thumbnail.
  previewURL: string;
  // URL for the full-resolution media to be downloaded.
  // For images, this will be hit.largeImageURL.
  // For videos, this will be hit.videos.small.url.
  fullURL: string;
  tags: string;
}

// Google Search-related interfaces
export interface GoogleSearchPrompt {
  query: string;
  lineNumber: number;
}

export interface GoogleSearchResult {
  // URL for the full-resolution image to be downloaded. From item.link
  fullURL: string;
  // URL for the image thumbnail shown in the selection modal. From item.image.thumbnailLink
  previewURL: string;
  title: string; // From item.title
}

// Settings interface for configuration
export interface MemoryPalaceSettings {
  pixabayApiKey: string;
  geminiApiKey: string;
  googleApiKey: string;
  googleSearchEngineId: string; // This is the 'cx' value
} 