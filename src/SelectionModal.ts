import { Modal, App } from 'obsidian';
import { PixabayResult, GoogleSearchResult } from './types';

// Generic type for media results that can be displayed in the modal
type MediaResult = PixabayResult | GoogleSearchResult;

export class SelectionModal extends Modal {
  private results: MediaResult[];
  private resolvePromise: ((result: MediaResult | null) => void) | null;
  private modalTitle: string;

  constructor(app: App, results: MediaResult[], modalTitle = 'Select Media') {
    super(app);
    this.results = results;
    this.modalTitle = modalTitle;
  }

  /**
   * Open the modal and wait for user selection
   */
  async openAndAwaitChoice(): Promise<MediaResult | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  onOpen() {
    const { contentEl } = this;
    
    contentEl.empty();
    contentEl.addClass('memory-palace-selection-modal');
    
    // Modal header
    const headerEl = contentEl.createEl('div', { cls: 'mp-modal-header' });
    headerEl.createEl('h2', { text: this.modalTitle });
    headerEl.createEl('p', { text: 'Click on an image to download it to your vault' });
    
    if (this.results.length === 0) {
      const noResultsEl = contentEl.createEl('div', { cls: 'mp-no-results' });
      noResultsEl.createEl('p', { text: '🔍 No results found for your search.' });
      noResultsEl.createEl('p', { text: 'Try different keywords or check your API settings.' });
      return;
    }
    
    // Results grid container
    const gridEl = contentEl.createEl('div', { cls: 'mp-results-grid' });
    
    // Create result items
    this.results.forEach((result, index) => {
      const itemEl = gridEl.createEl('div', { cls: 'mp-result-item' });
      
      // Image container
      const imageContainer = itemEl.createEl('div', { cls: 'mp-image-container' });
      
      // Image element
      const imageEl = imageContainer.createEl('img', { cls: 'mp-preview-image' });
      imageEl.src = result.previewURL;
      imageEl.alt = `Preview ${index + 1}`;
      
      // Loading placeholder
      imageEl.addEventListener('load', () => {
        imageContainer.removeClass('mp-loading');
      });
      
      imageEl.addEventListener('error', () => {
        imageContainer.addClass('mp-error');
        imageEl.style.display = 'none';
        const errorEl = imageContainer.createEl('div', { cls: 'mp-error-icon' });
        errorEl.innerHTML = '📷';
      });
      
      // Overlay with info
      const overlayEl = imageContainer.createEl('div', { cls: 'mp-image-overlay' });
      
      // Info content
      if ('tags' in result && 'id' in result) {
        // Pixabay result
        const tagsEl = overlayEl.createEl('div', { cls: 'mp-overlay-info' });
        tagsEl.textContent = result.tags.split(',').slice(0, 3).join(' • ');
      } else if ('title' in result) {
        // Google result
        const titleEl = overlayEl.createEl('div', { cls: 'mp-overlay-info' });
        titleEl.textContent = result.title.length > 50 ? result.title.substring(0, 47) + '...' : result.title;
      }
      
      // Selection indicator
      const indicatorEl = overlayEl.createEl('div', { cls: 'mp-selection-indicator' });
      indicatorEl.innerHTML = '✓';
      
      // Click handler
      itemEl.addEventListener('click', (e) => {
        e.preventDefault();
        this.selectResult(result);
      });
      
      // Add hover effects
      itemEl.addEventListener('mouseenter', () => {
        itemEl.addClass('mp-hovered');
      });
      
      itemEl.addEventListener('mouseleave', () => {
        itemEl.removeClass('mp-hovered');
      });
      
      // Add initial loading state
      imageContainer.addClass('mp-loading');
    });
    

    
    // Add keyboard navigation
    this.scope.register([], 'Escape', () => {
      this.selectResult(null);
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    
    // If the promise hasn't been resolved yet, resolve with null
    if (this.resolvePromise) {
      this.resolvePromise(null);
    }
  }

  private selectResult(result: MediaResult | null) {
    if (this.resolvePromise) {
      this.resolvePromise(result);
      this.resolvePromise = null;
    }
    this.close();
  }
} 