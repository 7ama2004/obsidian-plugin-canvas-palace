import { MemoryStationM1, MemoryStationM2, ParsedMemoryPalace, PixabayPrompt, GoogleSearchPrompt } from './types';

/**
 * Parse Markdown content for Milestone 1 (M1)
 * Extracts station blocks with just text content
 */
export function parseMarkdownForM1(content: string): ParsedMemoryPalace<MemoryStationM1> {
  const stationMap = new Map<number, MemoryStationM1>();
  
  // Regex to find all station blocks for M1
  // Matches: station #1 followed by text: and content until next station or end
  const stationRegex = /^station\s+#(\d+)\s*\n\s*text:(.*(?:\n(?!station\s+#).*)*)/gm;
  
  let match;
  while ((match = stationRegex.exec(content)) !== null) {
    const stationId = parseInt(match[1], 10);
    const text = match[2].trim();
    
    if (!isNaN(stationId) && text) {
      const station: MemoryStationM1 = {
        stationId,
        text
      };
      stationMap.set(stationId, station);
    }
  }
  
  return stationMap;
}

/**
 * Parse Markdown content for Milestone 2 (M2)
 * Extracts station blocks with all fields: text, association, image, audio
 */
export function parseMarkdownForM2(content: string): ParsedMemoryPalace<MemoryStationM2> {
  const stationMap = new Map<number, MemoryStationM2>();
  
  // Split content by station blocks
  const stationBlocks = content.split(/\nstation\s+#/).filter(block => block.trim());
  
  // Process the first block (might not have leading newline)
  if (content.trim().startsWith('station #')) {
    const firstBlock = content.substring(content.indexOf('station #') + 'station #'.length);
    stationBlocks.unshift(firstBlock);
  }
  
  for (const block of stationBlocks) {
    const station = parseStationBlock(block);
    if (station) {
      stationMap.set(station.stationId, station);
    }
  }
  
  return stationMap;
}

/**
 * Parse a single station block for M2
 */
function parseStationBlock(block: string): MemoryStationM2 | null {
  // Extract station ID
  const idMatch = block.match(/^(\d+)/);
  if (!idMatch) return null;
  
  const stationId = parseInt(idMatch[1], 10);
  if (isNaN(stationId)) return null;
  
  // Extract text content
  const textMatch = block.match(/text:([\s\S]*?)(?=\n(?:association:|image:|audio:|$))/);
  const text = textMatch ? textMatch[1].trim() : '';
  
  // Extract association content
  const associationMatch = block.match(/association:([\s\S]*?)(?=\n(?:text:|image:|audio:|$))/);
  const association = associationMatch ? associationMatch[1].trim() : undefined;
  
  // Extract image path
  const imageMatch = block.match(/image:([\s\S]*?)(?=\n(?:text:|association:|audio:|$))/);
  const imagePath = imageMatch ? imageMatch[1].trim() : undefined;
  
  // Extract audio path
  const audioMatch = block.match(/audio:([\s\S]*?)(?=\n(?:text:|association:|image:|$))/);
  const audioPath = audioMatch ? audioMatch[1].trim() : undefined;
  
  // Must have at least text content
  if (!text) return null;
  
  const station: MemoryStationM2 = {
    stationId,
    text,
    association: association || undefined,
    imagePath: imagePath || undefined,
    audioPath: audioPath || undefined
  };
  
  return station;
}

/**
 * Find all Pixabay prompts in the markdown content
 */
export function findPixabayPrompts(content: string): PixabayPrompt[] {
  const prompts: PixabayPrompt[] = [];
  const lines = content.split('\n');
  
  // Updated regex to match image: pixabay(...) or video: pixabay(...)
  const pixabayRegex = /(image|video):\s*pixabay\((.*?)\)/g;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    
    // Reset regex lastIndex for each line
    pixabayRegex.lastIndex = 0;
    
    while ((match = pixabayRegex.exec(line)) !== null) {
      const type = match[1] as 'image' | 'video';
      const query = match[2].trim();
      
      if (query) {
        prompts.push({
          type,
          query,
          lineNumber: i + 1 // 1-based line number
        });
      }
    }
  }
  
  return prompts;
}

/**
 * Find all Gemini prompts in the markdown content
 */
export function findGeminiPrompts(content: string): Array<{ query: string; lineNumber: number }> {
  const prompts: Array<{ query: string; lineNumber: number }> = [];
  const lines = content.split('\n');
  
  // Regex to match image: gemini(...)
  const geminiRegex = /image:\s*gemini\((.*?)\)/g;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    
    // Reset regex lastIndex for each line
    geminiRegex.lastIndex = 0;
    
    while ((match = geminiRegex.exec(line)) !== null) {
      const query = match[1].trim();
      
      if (query) {
        prompts.push({
          query,
          lineNumber: i + 1 // 1-based line number
        });
      }
    }
  }
  
  return prompts;
}

/**
 * Find all Google Search prompts in the markdown content
 */
export function findGoogleSearchPrompts(content: string): GoogleSearchPrompt[] {
  const prompts: GoogleSearchPrompt[] = [];
  const lines = content.split('\n');
  
  // Regex to match image: google(...)
  const googleRegex = /image:\s*google\((.*?)\)/g;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    
    // Reset regex lastIndex for each line
    googleRegex.lastIndex = 0;
    
    while ((match = googleRegex.exec(line)) !== null) {
      const query = match[1].trim();
      
      if (query) {
        prompts.push({
          query,
          lineNumber: i + 1 // 1-based line number
        });
      }
    }
  }
  
  return prompts;
} 