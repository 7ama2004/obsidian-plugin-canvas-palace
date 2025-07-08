import { App, Modal, Notice } from 'obsidian';
import { MemoryStationM2, ParsedMemoryPalace } from './types';
import { CanvasOverviewRenderer } from './CanvasOverviewRenderer';

export class TestingPresentationView extends Modal {
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
    this.titleEl.setText('Memory Palace Testing');
    
    // Add CSS class for styling
    this.modalEl.addClass('memory-palace-testing');
    
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
    const splitContainer = contentEl.createDiv('testing-split-container');
    
    // Left panel - Canvas overview
    const leftPanel = splitContainer.createDiv('testing-left-panel');
    
    // Right panel - Station content
    const rightPanel = splitContainer.createDiv('testing-right-panel');
    
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

    // Render station content in right panel (testing mode - minimal content)
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
    const contentContainer = container.createDiv('testing-container');
    
    // Station header
    contentContainer.createEl('h1', {
      text: `Station #${station.stationId}`,
      cls: 'testing-station-header'
    });

    // Progress indicator
    const progress = contentContainer.createDiv('testing-progress');
    progress.createSpan({
      text: `${this.currentStationIndex + 1} of ${this.stations.length}`,
      cls: 'progress-text'
    });

    // NO association text, images, or audio in testing mode

    // Answer section (conditional rendering)
    if (this.isAnswerVisible) {
      // Show the answer
      const answerDiv = contentContainer.createDiv('testing-answer');
      answerDiv.createEl('p', { text: station.text, cls: 'answer-text' });
      
      // Continue instruction
      contentContainer.createEl('p', {
        text: 'Press Enter to continue to next station...',
        cls: 'testing-instruction'
      });
    } else {
      // Show reveal prompt
      contentContainer.createEl('p', {
        text: 'Press Enter to reveal answer',
        cls: 'testing-answer-placeholder'
      });
    }

    // Navigation instructions
    const instructions = contentContainer.createDiv('testing-instructions');
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
      // End of testing session
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

    const container = contentEl.createDiv('testing-end');
    
    container.createEl('h1', {
      text: 'Testing Session Complete!',
      cls: 'end-title'
    });
    
    container.createEl('p', {
      text: `You tested yourself on ${this.stations.length} memory stations.`,
      cls: 'end-summary'
    });
    
    container.createEl('p', {
      text: 'Press Escape to close or use the commands below:',
      cls: 'end-instructions'
    });

    const buttonContainer = container.createDiv('end-buttons');
    
    // Restart button
    const restartBtn = buttonContainer.createEl('button', {
      text: 'Restart Testing',
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
    if (document.getElementById('memory-palace-testing-css')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'memory-palace-testing-css';
    style.textContent = `
      .memory-palace-testing .modal-content {
        padding: 1rem;
        text-align: center;
      }
      
      .testing-split-container {
        display: flex;
        height: 100%;
        gap: 1rem;
      }
      
      .testing-left-panel {
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
      
      .testing-right-panel {
        flex: 0 0 55%;
        overflow-y: auto;
        padding: 0 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .testing-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2rem;
        max-width: 600px;
        text-align: center;
      }
      
      .testing-station-header {
        color: var(--text-accent);
        margin: 0;
        font-size: 2.5rem;
        font-weight: bold;
      }
      
      .testing-progress {
        background: var(--background-secondary);
        padding: 0.75rem 1.5rem;
        border-radius: 1.5rem;
        font-size: 1rem;
        color: var(--text-muted);
        font-weight: 500;
      }
      
      .testing-answer {
        background: var(--background-primary-alt);
        padding: 2rem;
        border-radius: 0.75rem;
        border: 3px solid var(--text-accent);
        max-width: 500px;
        width: 100%;
        text-align: center;
      }
      
      .testing-answer .answer-text {
        font-size: 1.1rem;
        line-height: 1.6;
        margin: 0;
        color: var(--text-normal);
        font-weight: 500;
        text-align: left;
      }
      
      .testing-answer-placeholder {
        color: var(--text-muted);
        font-style: italic;
        background: var(--background-secondary);
        padding: 2rem;
        border-radius: 0.75rem;
        margin: 0;
        font-size: 1.2rem;
        border: 2px dashed var(--background-modifier-border);
        max-width: 500px;
        width: 100%;
      }
      
      .testing-instruction {
        color: var(--text-accent);
        font-weight: 600;
        margin: 0;
        font-size: 1.1rem;
      }
      
      .testing-instructions {
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid var(--background-modifier-border);
        width: 100%;
      }
      
      .testing-instructions .instructions-text {
        color: var(--text-muted);
        font-size: 0.9rem;
        margin: 0;
      }
      
      .testing-end {
        text-align: center;
        padding: 2rem;
      }
      
      .testing-end .end-title {
        color: var(--text-accent);
        margin-bottom: 1rem;
      }
      
      .testing-end .end-summary {
        font-size: 1.1rem;
        margin-bottom: 2rem;
        color: var(--text-normal);
      }
      
      .testing-end .end-instructions {
        color: var(--text-muted);
        margin-bottom: 2rem;
      }
      
      .testing-end .end-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
      }
    `;
    
    document.head.appendChild(style);
  }
} 