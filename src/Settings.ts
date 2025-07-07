import { App, PluginSettingTab, Setting } from 'obsidian';
import { MemoryPalaceSettings } from './types';

export class MemoryPalaceSettingTab extends PluginSettingTab {
  plugin: any;

  constructor(app: App, plugin: any) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    // Plugin header
    containerEl.createEl('h2', { text: 'Memory Palace Settings' });

    // Pixabay API Key setting
    new Setting(containerEl)
      .setName('Pixabay API Key')
      .setDesc('Enter your Pixabay API key to enable automatic media fetching. Get a free API key at https://pixabay.com/api/docs/')
      .addText(text => text
        .setPlaceholder('Enter your Pixabay API key...')
        .setValue(this.plugin.settings.pixabayApiKey)
        .onChange(async (value) => {
          this.plugin.settings.pixabayApiKey = value;
          await this.plugin.saveSettings();
        }));

    // Gemini API Key setting
    new Setting(containerEl)
      .setName('Gemini API Key')
      .setDesc('Enter your Google AI Gemini API key to enable AI image generation. Get a free API key at https://ai.google.dev/')
      .addText(text => text
        .setPlaceholder('Enter your Gemini API key...')
        .setValue(this.plugin.settings.geminiApiKey)
        .onChange(async (value) => {
          this.plugin.settings.geminiApiKey = value;
          await this.plugin.saveSettings();
        }));

    // Google API Key setting
    new Setting(containerEl)
      .setName('Google API Key')
      .setDesc('Enter your Google API key to enable Google image search. Get a free API key at https://console.developers.google.com/')
      .addText(text => text
        .setPlaceholder('Enter your Google API key...')
        .setValue(this.plugin.settings.googleApiKey)
        .onChange(async (value) => {
          this.plugin.settings.googleApiKey = value;
          await this.plugin.saveSettings();
        }));

    // Google Programmable Search Engine ID setting
    new Setting(containerEl)
      .setName('Google Programmable Search Engine ID (CX)')
      .setDesc('Enter your Google Programmable Search Engine ID. Create a search engine at https://cse.google.com and configure it to "Search for images on the entire web".')
      .addText(text => text
        .setPlaceholder('Enter your Search Engine ID...')
        .setValue(this.plugin.settings.googleSearchEngineId)
        .onChange(async (value) => {
          this.plugin.settings.googleSearchEngineId = value;
          await this.plugin.saveSettings();
        }));

    // Help section
    containerEl.createEl('h3', { text: 'Help' });
    
    const helpDiv = containerEl.createDiv();
    helpDiv.createEl('p', { text: 'Memory Palace Plugin helps you sync markdown files with canvas files to create visual memory palaces.' });
    helpDiv.createEl('p', { text: 'Use the sync commands to update your canvas with memory station data from your markdown files.' });
    helpDiv.createEl('p', { text: 'Use "Memory Palace: Fetch all Pixabay media in this file" to resolve media prompts like image: pixabay(lion roaring) or video: pixabay(sunset).' });
    helpDiv.createEl('p', { text: 'Use "Memory Palace: Generate all Gemini images in this file" to generate AI images from prompts like image: gemini(your description).' });
    helpDiv.createEl('p', { text: 'Use "Memory Palace: Fetch all Google Search images in this file" to search and download web images from prompts like image: google(vintage 1950s refrigerator). WARNING: These images are NOT royalty-free and may be subject to copyright.' });
  }
}

// Default settings
export const DEFAULT_SETTINGS: MemoryPalaceSettings = {
  pixabayApiKey: '',
  geminiApiKey: '',
  googleApiKey: '',
  googleSearchEngineId: '',
}; 