import { App, Modal, Notice } from 'obsidian';
import { MemoryStationM2, ParsedMemoryPalace } from './types';
import { CanvasOverviewRenderer } from './CanvasOverviewRenderer';

export class PresentationView extends Modal {
  palaceData: ParsedMemoryPalace<MemoryStationM2>;
  stations: MemoryStationM2[];
  currentStationIndex = 0;
  isAnswerVisible = false;
  canvasPath: string | null = null;
  
  // Store event listener references for cleanup
  private keydownHandler: (event: KeyboardEvent) => void;
  private canvasOverview: CanvasOverviewRenderer | null = null;

  constructor(app: App, palaceData: ParsedMemoryPalace<MemoryStationM2>, canvasPath?: string) {
    super(app);
    this.palaceData = palaceData;
    this.canvasPath = canvasPath || null;
    
    // Convert Map to sorted array
    this.stations = Array.from(palaceData.values()).sort((a, b) => a.stationId - b.stationId);
    
    // Bind event handlers
    this.keydownHandler = this.handleKeydown.bind(this);
  }

  async onOpen() {
    this.titleEl.setText('Memory Palace Presentation');
    
    // Add CSS class for styling
    this.modalEl.addClass('memory-palace-presentation');
    
    // Add keyboard event listeners
    document.addEventListener('keydown', this.keydownHandler);
    
    // Set up modal size and styling for fullscreen layout
    this.modalEl.style.maxWidth = '100vw';
    this.modalEl.style.maxHeight = '100vh';
    this.modalEl.style.width = '100vw';
    this.modalEl.style.height = '100vh';
    this.modalEl.style.margin = '0';
    this.modalEl.style.top = '0';
    this.modalEl.style.left = '0';
    this.modalEl.style.transform = 'none';
    
    // Initialize canvas overview if canvas path is provided
    if (this.canvasPath) {
      await this.initializeCanvasOverview();
    }
    
    // Render the first station
    this.renderCurrentStation();
  }

  onClose() {
    // Remove keyboard event listeners to prevent memory leaks
    document.removeEventListener('keydown', this.keydownHandler);
    
    // Clean up canvas overview
    if (this.canvasOverview) {
      this.canvasOverview.destroy();
      this.canvasOverview = null;
    }
    
    // Clean up any audio elements
    const audioElements = this.contentEl.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  private async initializeCanvasOverview() {
    // This method will be called from onOpen if canvas path is provided
    // Canvas overview will be initialized in renderCurrentStation
  }

  private handleKeydown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowRight':
      case ' ': // Spacebar
        event.preventDefault();
        this.handleNext();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.handlePrevious();
        break;
      case 'Enter':
        event.preventDefault();
        this.handleEnter();
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  };

  private async renderCurrentStation() {
    const { contentEl } = this;
    contentEl.empty();

    // Check if we have a valid station
    const station = this.stations[this.currentStationIndex];
    if (!station) {
      this.close();
      return;
    }

    // Create split layout container
    const splitContainer = contentEl.createDiv('presentation-split-container');
    
    // Left panel - Canvas overview
    const leftPanel = splitContainer.createDiv('presentation-left-panel');
    
    // Right panel - Station content
    const rightPanel = splitContainer.createDiv('presentation-right-panel');
    
    // Always recreate canvas overview since we recreate the entire layout
    if (this.canvasPath) {
      // Clean up previous canvas overview if it exists
      if (this.canvasOverview) {
        this.canvasOverview.destroy();
        this.canvasOverview = null;
      }
      
      // Create new canvas overview with the new container
      this.canvasOverview = new CanvasOverviewRenderer(this.app, leftPanel);
      
      try {
        await this.canvasOverview.loadCanvas(this.canvasPath);
        
        // Set up click handler for navigation
        this.canvasOverview.setOnStationClick((stationId: number) => {
          this.navigateToStation(stationId);
        });
        
        // Set current station (this may throw if node belongs to multiple groups)
        this.canvasOverview.setCurrentStation(station.stationId);
      } catch (error) {
        console.error('Error with canvas overview:', error);
        
        // Show specific error message
        const errorText = error instanceof Error ? error.message : 'Canvas overview not available';
        leftPanel.createEl('p', {
          text: errorText,
          cls: 'canvas-error'
        });
        
        // If it's a group validation error, also show in notification
        if (error instanceof Error && error.message.includes('belongs to multiple groups')) {
          new Notice(`Canvas Error: ${error.message}`, 8000);
        }
      }
    }

    // Render station content in right panel
    this.renderStationContent(rightPanel, station);

    // Add custom CSS if not already added
    this.addCustomCSS();
  }

  private navigateToStation(stationId: number) {
    // Find the station index
    const stationIndex = this.stations.findIndex(s => s.stationId === stationId);
    if (stationIndex >= 0) {
      this.currentStationIndex = stationIndex;
      this.isAnswerVisible = false;
      this.renderCurrentStation();
    }
  }

  private renderStationContent(container: HTMLElement, station: MemoryStationM2) {
    // Create main container
    const contentContainer = container.createDiv('presentation-container');
    
    // Station header
    contentContainer.createEl('h1', {
      text: `Station #${station.stationId}`,
      cls: 'presentation-station-header'
    });

    // Progress indicator
    const progress = contentContainer.createDiv('presentation-progress');
    progress.createSpan({
      text: `${this.currentStationIndex + 1} of ${this.stations.length}`,
      cls: 'progress-text'
    });

    // Association text (always visible)
    if (station.association) {
      contentContainer.createEl('p', {
        text: station.association,
        cls: 'presentation-association'
      });
    }

    // Image rendering
    if (station.imagePath) {
      try {
        const imageEl = contentContainer.createEl('img', {
          cls: 'presentation-image'
        });
        
        // Get vault-accessible path
        const resourcePath = this.app.vault.adapter.getResourcePath(station.imagePath);
        imageEl.src = resourcePath;
        
        // Handle image load errors
        imageEl.onerror = () => {
          imageEl.style.display = 'none';
          contentContainer.createEl('p', {
            text: `Image not found: ${station.imagePath}`,
            cls: 'presentation-error'
          });
        };
        
      } catch (error) {
        contentContainer.createEl('p', {
          text: `Error loading image: ${station.imagePath}`,
          cls: 'presentation-error'
        });
      }
    }

    // Audio rendering
    if (station.audioPath) {
      try {
        const audioEl = contentContainer.createEl('audio', {
          cls: 'presentation-audio'
        });
        audioEl.controls = true;
        
        // Get vault-accessible path
        const resourcePath = this.app.vault.adapter.getResourcePath(station.audioPath);
        audioEl.src = resourcePath;
        
        // Handle audio load errors
        audioEl.onerror = () => {
          audioEl.style.display = 'none';
          contentContainer.createEl('p', {
            text: `Audio not found: ${station.audioPath}`,
            cls: 'presentation-error'
          });
        };
        
      } catch (error) {
        contentContainer.createEl('p', {
          text: `Error loading audio: ${station.audioPath}`,
          cls: 'presentation-error'
        });
      }
    }

    // Answer section (conditional rendering)
    if (this.isAnswerVisible) {
      // Show the answer
      const answerDiv = contentContainer.createDiv('presentation-answer');
      answerDiv.createEl('h3', { text: 'Answer:', cls: 'answer-header' });
      answerDiv.createEl('p', { text: station.text, cls: 'answer-text' });
      
      // Continue instruction
      contentContainer.createEl('p', {
        text: 'Press Enter to continue...',
        cls: 'presentation-instruction'
      });
    } else {
      // Show reveal prompt
      contentContainer.createEl('p', {
        text: 'Press Enter to reveal answer',
        cls: 'presentation-answer-placeholder'
      });
    }

    // Navigation instructions
    const instructions = contentContainer.createDiv('presentation-instructions');
    instructions.createEl('p', {
      text: '← Previous | → Next | Enter: Reveal/Continue | Esc: Exit | Click stations on canvas to navigate',
      cls: 'instructions-text'
    });
  }

  private handleNext = () => {
    // Reset answer visibility
    this.isAnswerVisible = false;
    
    // Move to next station if possible
    if (this.currentStationIndex < this.stations.length - 1) {
      this.currentStationIndex++;
      this.renderCurrentStation();
    } else {
      // End of presentation
      this.showEndScreen();
    }
  };

  private handlePrevious = () => {
    // Reset answer visibility
    this.isAnswerVisible = false;
    
    // Move to previous station if possible
    if (this.currentStationIndex > 0) {
      this.currentStationIndex--;
      this.renderCurrentStation();
    }
  };

  private handleEnter = () => {
    if (this.isAnswerVisible) {
      // Answer is visible, advance to next station
      this.handleNext();
    } else {
      // Answer is hidden, reveal it
      this.isAnswerVisible = true;
      this.renderCurrentStation();
    }
  };

  private showEndScreen() {
    const { contentEl } = this;
    contentEl.empty();

    const container = contentEl.createDiv('presentation-end');
    
    container.createEl('h1', {
      text: 'Presentation Complete!',
      cls: 'end-title'
    });
    
    container.createEl('p', {
      text: `You reviewed ${this.stations.length} memory stations.`,
      cls: 'end-summary'
    });
    
    container.createEl('p', {
      text: 'Press Escape to close or use the commands below:',
      cls: 'end-instructions'
    });

    const buttonContainer = container.createDiv('end-buttons');
    
    // Restart button
    const restartBtn = buttonContainer.createEl('button', {
      text: 'Restart Presentation',
      cls: 'mod-cta'
    });
    restartBtn.onclick = async () => {
      this.currentStationIndex = 0;
      this.isAnswerVisible = false;
      await this.renderCurrentStation();
    };

    // Close button
    const closeBtn = buttonContainer.createEl('button', {
      text: 'Close',
      cls: 'mod-secondary'
    });
    closeBtn.onclick = () => {
      this.close();
    };
  }

  private addCustomCSS() {
    // Check if CSS is already added
    if (document.getElementById('memory-palace-presentation-css')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'memory-palace-presentation-css';
    style.textContent = `
      .memory-palace-presentation .modal-content {
        padding: 1rem;
        text-align: center;
      }
      
      .presentation-split-container {
        display: flex;
        height: 100%;
        gap: 1rem;
      }
      
      .presentation-left-panel {
        flex: 0 0 45%;
        background: transparent;
        border: none;
        border-radius: 0;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: stretch;
        min-width: 500px;
      }
      
      .presentation-right-panel {
        flex: 0 0 55%;
        overflow-y: auto;
        padding: 0 1rem;
      }
      
      .canvas-overview-container {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: stretch;
        gap: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
      }
      
      .canvas-placeholder {
        color: var(--text-muted);
        text-align: center;
        padding: 2rem;
        font-style: italic;
      }
      
      .canvas-error {
        color: var(--text-error);
        background: var(--background-modifier-error);
        text-align: center;
        padding: 1rem;
        border-radius: 4px;
        font-size: 0.9rem;
        border: 1px solid var(--background-modifier-error-border);
      }
      
      .presentation-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
        height: 100%;
      }
      
      .presentation-station-header {
        color: var(--text-accent);
        margin: 0;
        font-size: 2rem;
      }
      
      .presentation-progress {
        background: var(--background-secondary);
        padding: 0.5rem 1rem;
        border-radius: 1rem;
        font-size: 0.9rem;
        color: var(--text-muted);
      }
      
      .presentation-association {
        font-size: 1.2rem;
        line-height: 1.6;
        max-width: 600px;
        background: var(--background-secondary);
        padding: 1.5rem;
        border-radius: 0.5rem;
        margin: 0;
      }
      
      .presentation-image {
        max-width: 400px;
        max-height: 300px;
        border-radius: 0.5rem;
        box-shadow: var(--shadow-s);
      }
      
      .presentation-audio {
        width: 300px;
      }
      
      .presentation-answer {
        background: var(--background-primary-alt);
        padding: 1.5rem;
        border-radius: 0.5rem;
        border: 2px solid var(--text-accent);
        max-width: 600px;
      }
      
      .answer-header {
        color: var(--text-accent);
        margin: 0 0 1rem 0;
      }
      
      .answer-text {
        font-size: 1.1rem;
        line-height: 1.6;
        margin: 0;
      }
      
      .presentation-answer-placeholder {
        color: var(--text-muted);
        font-style: italic;
        background: var(--background-secondary);
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 0;
      }
      
      .presentation-instruction {
        color: var(--text-accent);
        font-weight: 500;
        margin: 0;
      }
      
      .presentation-instructions {
        margin-top: auto;
        padding-top: 1rem;
        border-top: 1px solid var(--background-modifier-border);
      }
      
      .instructions-text {
        color: var(--text-muted);
        font-size: 0.9rem;
        margin: 0;
      }
      
      .presentation-error {
        color: var(--text-error);
        background: var(--background-secondary);
        padding: 0.5rem 1rem;
        border-radius: 0.25rem;
        font-size: 0.9rem;
        margin: 0;
      }
      
      .presentation-end {
        text-align: center;
        padding: 2rem;
      }
      
      .end-title {
        color: var(--text-accent);
        margin-bottom: 1rem;
      }
      
      .end-summary {
        font-size: 1.1rem;
        margin-bottom: 2rem;
        color: var(--text-normal);
      }
      
      .end-instructions {
        color: var(--text-muted);
        margin-bottom: 2rem;
      }
      
      .end-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
      }
    `;
    
    document.head.appendChild(style);
  }
} 