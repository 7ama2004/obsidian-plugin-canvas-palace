import { Plugin, Notice, Editor, MarkdownView } from 'obsidian';
import { parseMarkdownForM1, parseMarkdownForM2, findPixabayPrompts, findGeminiPrompts, findGoogleSearchPrompts } from './MarkdownParser';
import { updateCanvasForM1, updateCanvasForM2 } from './CanvasManager';
import { PresentationView } from './PresentationView';
import { MemoryPalaceSettingTab, DEFAULT_SETTINGS } from './Settings';
import { MemoryPalaceSettings, PixabayResult } from './types';
import { searchPixabay, downloadMedia, generateGeminiImage, searchGoogleImages, downloadMediaFromUrl } from './ApiService';
import { SelectionModal } from './SelectionModal';

export default class MemoryPalacePlugin extends Plugin {
  settings: MemoryPalaceSettings;
  
  async onload() {
    await this.loadSettings();
    console.log('Loading Memory Palace plugin');
    
    // Add command to manually sync a file
    this.addCommand({
      id: 'sync-memory-palace',
      name: 'Sync Memory Palace',
      callback: () => {
        this.handleManualSync();
      }
    });
    
    // Add command to sync with M1 format
    this.addCommand({
      id: 'sync-memory-palace-m1',
      name: 'Sync Memory Palace (M1 Format)',
      callback: () => {
        this.handleManualSync(true);
      }
    });

    // Add presentation mode command
    this.addCommand({
      id: 'memory-palace-start-presentation',
      name: 'Memory Palace: Start Presentation',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.startPresentationMode(editor, view);
      }
    });

    // Add Pixabay media fetch command
    this.addCommand({
      id: 'fetch-pixabay-media',
      name: 'Memory Palace: Fetch all Pixabay media in this file',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.fetchPixabayMedia(editor, view);
      }
    });

    // Add Gemini image generation command
    this.addCommand({
      id: 'generate-gemini-images',
      name: 'Memory Palace: Generate all Gemini images in this file',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.generateGeminiImages(editor, view);
      }
    });

    // Add Google Search images command
    this.addCommand({
      id: 'fetch-google-search-images',
      name: 'Memory Palace: Fetch all Google Search images in this file',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.fetchGoogleSearchImages(editor, view);
      }
    });

    // Add settings tab
    this.addSettingTab(new MemoryPalaceSettingTab(this.app, this));
    
    // Show loading notification
    new Notice('Memory Palace plugin loaded successfully!');
  }
  
  onunload() {
    console.log('Unloading Memory Palace plugin');
  }
  
  /**
   * Handle manual sync command
   */
  private async handleManualSync(forceM1 = false) {
    const activeFile = this.app.workspace.getActiveFile();
    
    if (!activeFile || activeFile.extension !== 'md') {
      new Notice('Please open a Markdown file to sync');
      return;
    }
    
    try {
      // Get file metadata to check for canvas frontmatter
      const fileCache = this.app.metadataCache.getFileCache(activeFile);
      const frontmatter = fileCache?.frontmatter;
      
      if (!frontmatter || !frontmatter.canvas) {
        new Notice('No canvas specified in frontmatter. Add "canvas: path/to/canvas.canvas" to your frontmatter.');
        return;
      }
      
      const canvasPath = frontmatter.canvas;
      const fileContent = await this.app.vault.read(activeFile);
      
      // Determine format
      const useM1Format = forceM1 || frontmatter.format === 'M1' || this.isM1Format(fileContent);
      
      if (useM1Format) {
        const palaceData = parseMarkdownForM1(fileContent);
        await updateCanvasForM1(canvasPath, palaceData, this.app.vault, this.app.metadataCache);
        new Notice(`Memory Palace synced (M1): ${palaceData.size} stations updated`);
      } else {
        const palaceData = parseMarkdownForM2(fileContent);
        await updateCanvasForM2(canvasPath, palaceData, this.app.vault, this.app.metadataCache);
        new Notice(`Memory Palace synced (M2): ${palaceData.size} stations updated`);
      }
      
    } catch (error) {
      console.error('Error in manual sync:', error);
      new Notice(`Error syncing Memory Palace: ${error.message}`, 5000);
    }
  }
  
  /**
   * Determine if content is in M1 format (simple text-only stations)
   */
  private isM1Format(content: string): boolean {
    // Check if content has only text: fields and no association:, image:, or audio: fields
    const hasAdvancedFields = /\n\s*(association|image|audio):/m.test(content);
    return !hasAdvancedFields;
  }

  /**
   * Start presentation mode for the current file
   */
  private async startPresentationMode(editor: Editor, view: MarkdownView) {
    const activeFile = view.file;
    
    if (!activeFile || activeFile.extension !== 'md') {
      new Notice('Please open a Markdown file to start presentation mode');
      return;
    }

    try {
      // Get file metadata to check for canvas frontmatter
      const fileCache = this.app.metadataCache.getFileCache(activeFile);
      const frontmatter = fileCache?.frontmatter;
      
      if (!frontmatter || !frontmatter.canvas) {
        new Notice('No canvas specified in frontmatter. Add "canvas: path/to/canvas.canvas" to your frontmatter.');
        return;
      }

      // Read the file content
      const fileContent = await this.app.vault.read(activeFile);
      
      // Parse the memory palace data (always use M2 format for presentation as it has more features)
      const palaceData = parseMarkdownForM2(fileContent);
      
      if (palaceData.size === 0) {
        new Notice('No stations found in this file.');
        return;
      }

      // Start the presentation with canvas path
      new PresentationView(this.app, palaceData, frontmatter.canvas).open();
      
    } catch (error) {
      console.error('Error starting presentation mode:', error);
      new Notice(`Error starting presentation: ${error.message}`, 5000);
    }
  }

  /**
   * Fetch Pixabay media from prompts in the current file
   */
  private async fetchPixabayMedia(editor: Editor, view: MarkdownView) {
    const activeFile = view.file;
    
    if (!activeFile || activeFile.extension !== 'md') {
      new Notice('Please open a Markdown file to fetch media');
      return;
    }

    try {
      // Check if API key is configured
      if (!this.settings.pixabayApiKey) {
        new Notice('Please set your Pixabay API key in the plugin settings first.');
        return;
      }

      // Get current file content
      const fileContent = await this.app.vault.read(activeFile);
      
      // Find all Pixabay prompts in the file
      const prompts = findPixabayPrompts(fileContent);
      
      if (prompts.length === 0) {
        new Notice('No Pixabay prompts found in this file. Use format: image: pixabay(your search) or video: pixabay(your search)');
        return;
      }

      new Notice(`Found ${prompts.length} Pixabay prompt(s). Processing...`);

      // Process each prompt
      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        
        try {
          new Notice(`Processing ${prompt.type} prompt: "${prompt.query}" (${i + 1}/${prompts.length})`);
          
          // Search Pixabay
          const results = await searchPixabay(prompt, this.settings);
          
          if (results.length === 0) {
            new Notice(`No results found for "${prompt.query}". Skipping...`);
            continue;
          }

          // Show selection modal
          const modal = new SelectionModal(this.app, results, 'Select Media from Pixabay');
          const selectedResult = await modal.openAndAwaitChoice();
          
          if (!selectedResult) {
            new Notice(`Skipped "${prompt.query}"`);
            continue;
          }

          // Download the selected media
          new Notice(`Downloading ${prompt.type}...`);
          const localPath = await downloadMedia(selectedResult as PixabayResult, prompt, this.app.vault);
          
          // Update the file content
          const currentContent = await this.app.vault.read(activeFile);
          const lines = currentContent.split('\n');
          
          // Find and replace the specific line
          for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const regex = new RegExp(`${prompt.type}:\\s*pixabay\\(${prompt.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`);
            
            if (regex.test(line)) {
              const newLine = `${prompt.type}: "[[${localPath}]]"`;
              lines[lineIndex] = line.replace(regex, newLine);
              break;
            }
          }
          
          // Save the updated content
          await this.app.vault.modify(activeFile, lines.join('\n'));
          
          new Notice(`Successfully downloaded and updated ${prompt.type} for "${prompt.query}"`);
          
        } catch (error) {
          console.error(`Error processing prompt "${prompt.query}":`, error);
          new Notice(`Error processing "${prompt.query}": ${error.message}`, 5000);
        }
      }
      
      new Notice('Finished processing all Pixabay prompts!');
      
    } catch (error) {
      console.error('Error fetching Pixabay media:', error);
      new Notice(`Error fetching Pixabay media: ${error.message}`, 5000);
    }
  }

  /**
   * Generate Gemini images from prompts in the current file
   */
  private async generateGeminiImages(editor: Editor, view: MarkdownView) {
    const activeFile = view.file;
    
    if (!activeFile || activeFile.extension !== 'md') {
      new Notice('Please open a Markdown file to generate images');
      return;
    }

    try {
      // Check if API key is configured
      if (!this.settings.geminiApiKey) {
        new Notice('Please set your Gemini API key in the plugin settings first.');
        return;
      }

      // Get current file content
      const fileContent = await this.app.vault.read(activeFile);
      
      // Find all Gemini prompts in the file
      const prompts = findGeminiPrompts(fileContent);
      
      if (prompts.length === 0) {
        new Notice('No Gemini prompts found in this file. Use format: image: gemini(your description)');
        return;
      }

      new Notice(`Found ${prompts.length} Gemini prompt(s). Generating images...`);

      // Process each prompt
      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        
        try {
          new Notice(`Generating image for prompt: "${prompt.query}" (${i + 1}/${prompts.length})`);
          
          // Generate image using Gemini API
          const localPath = await generateGeminiImage(prompt.query, this.settings, this.app.vault);
          
          // Update the file content
          const currentContent = await this.app.vault.read(activeFile);
          const lines = currentContent.split('\n');
          
          // Find and replace the specific line
          for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const regex = new RegExp(`image:\\s*gemini\\(${prompt.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`);
            
            if (regex.test(line)) {
              const newLine = line.replace(regex, `image: "[[${localPath}]]"`);
              lines[lineIndex] = newLine;
              break;
            }
          }
          
          // Save the updated content
          await this.app.vault.modify(activeFile, lines.join('\n'));
          
          new Notice(`Successfully generated and saved image for "${prompt.query}"`);
          
        } catch (error) {
          console.error(`Error processing Gemini prompt "${prompt.query}":`, error);
          new Notice(`Error generating image for "${prompt.query}": ${error.message}`, 5000);
        }
      }
      
      new Notice('Finished generating all Gemini images!');
      
    } catch (error) {
      console.error('Error generating Gemini images:', error);
      new Notice(`Error generating Gemini images: ${error.message}`, 5000);
    }
  }

  /**
   * Fetch Google Search images from prompts in the current file
   */
  private async fetchGoogleSearchImages(editor: Editor, view: MarkdownView) {
    const activeFile = view.file;
    
    if (!activeFile || activeFile.extension !== 'md') {
      new Notice('Please open a Markdown file to fetch images');
      return;
    }

    try {
      // Check if API keys are configured
      if (!this.settings.googleApiKey) {
        new Notice('Please set your Google API key in the plugin settings first.');
        return;
      }
      if (!this.settings.googleSearchEngineId) {
        new Notice('Please set your Google Programmable Search Engine ID (CX) in the plugin settings first.');
        return;
      }

      // Get current file content
      const fileContent = await this.app.vault.read(activeFile);
      
      // Find all Google search prompts in the file
      const prompts = findGoogleSearchPrompts(fileContent);
      
      if (prompts.length === 0) {
        new Notice('No Google search prompts found in this file. Use format: image: google(your search query)');
        return;
      }

      new Notice(`Found ${prompts.length} Google search prompt(s). Processing...`);

      // Process each prompt
      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        
        try {
          new Notice(`Searching Google for: "${prompt.query.substring(0, 40)}..." (${i + 1}/${prompts.length})`);
          
          // Search Google Images
          const results = await searchGoogleImages(prompt.query, this.settings);
          
          if (results.length === 0) {
            new Notice(`No results found for "${prompt.query}". Skipping...`);
            continue;
          }

          // Show selection modal
          const modal = new SelectionModal(this.app, results, 'Select Image from Google Search');
          const selectedResult = await modal.openAndAwaitChoice();
          
          if (!selectedResult) {
            new Notice(`Skipped "${prompt.query}"`);
            continue;
          }

          // Download the selected image
          new Notice(`Downloading image...`);
          
          // Generate filename based on query and timestamp
          const sanitizedQuery = prompt.query.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase();
          const timestamp = Date.now();
          const filename = `google-search-${sanitizedQuery}-${timestamp}.jpg`;
          
          const localPath = await downloadMediaFromUrl(selectedResult.fullURL, filename, this.app.vault);
          
          // Update the file content
          const currentContent = await this.app.vault.read(activeFile);
          const lines = currentContent.split('\n');
          
          // Find and replace the specific line
          for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const regex = new RegExp(`image:\\s*google\\(${prompt.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`);
            
            if (regex.test(line)) {
              const newLine = line.replace(regex, `image: "[[${localPath}]]"`);
              lines[lineIndex] = newLine;
              break;
            }
          }
          
          // Save the updated content
          await this.app.vault.modify(activeFile, lines.join('\n'));
          
          new Notice(`Successfully downloaded and updated image for "${prompt.query}"`);
          
        } catch (error) {
          console.error(`Error processing Google search prompt "${prompt.query}":`, error);
          new Notice(`Error processing "${prompt.query}": ${error.message}`, 5000);
        }
      }
      
      new Notice('Finished processing all Google search prompts!');
      
    } catch (error) {
      console.error('Error fetching Google search images:', error);
      new Notice(`Error fetching Google search images: ${error.message}`, 5000);
    }
  }

  /**
   * Load plugin settings
   */
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  /**
   * Save plugin settings
   */
  async saveSettings() {
    await this.saveData(this.settings);
  }
} 