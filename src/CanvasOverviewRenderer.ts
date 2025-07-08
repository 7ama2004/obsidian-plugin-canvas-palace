import { App, Vault } from 'obsidian';
import { CanvasData } from './types';

export class CanvasOverviewRenderer {
  private app: App;
  private vault: Vault;
  private canvasData: CanvasData | null = null;
  private canvasPath: string | null = null;
  private container: HTMLElement;
  private svgElement: SVGElement | null = null;
  private currentStationId: number | null = null;
  private bounds: { minX: number; maxX: number; minY: number; maxY: number } = {
    minX: 0, maxX: 0, minY: 0, maxY: 0
  };
  private baseScale = 1;
  private currentZoomScale = 1;
  private panX = 0;
  private panY = 0;
  private readonly OVERVIEW_WIDTH = 500;
  private readonly OVERVIEW_HEIGHT = 600;
  private readonly PADDING = 20;
  
  // Station click callback
  private onStationClick?: (stationId: number) => void;
  private zoomInfoElement?: HTMLElement;

  constructor(app: App, container: HTMLElement) {
    this.app = app;
    this.vault = app.vault;
    this.container = container;
    this.setupContainer();
  }

  private setupContainer() {
    this.container.empty();
    this.container.addClass('canvas-overview-container');
    
    // Create SVG element directly without title or controls
    this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgElement.setAttribute('width', '100%');
    this.svgElement.setAttribute('height', '100%');
    this.svgElement.setAttribute('viewBox', `0 0 ${this.OVERVIEW_WIDTH} ${this.OVERVIEW_HEIGHT}`);
    this.svgElement.style.border = 'none';
    this.svgElement.style.borderRadius = '0';
    this.svgElement.style.background = 'transparent';
    this.svgElement.style.cursor = 'pointer';
    this.svgElement.style.width = '100%';
    this.svgElement.style.height = '100%';
    
    this.container.appendChild(this.svgElement);
  }

  async loadCanvas(canvasPath: string): Promise<void> {
    try {
      this.canvasPath = canvasPath;
      const rawCanvas = await this.vault.adapter.read(canvasPath);
      this.canvasData = JSON.parse(rawCanvas);
      
      this.calculateBounds();
      this.calculateScale();
      this.render();
    } catch (error) {
      console.error('Error loading canvas:', error);
      this.showError('Failed to load canvas');
    }
  }

  private calculateBounds() {
    if (!this.canvasData?.nodes || this.canvasData.nodes.length === 0) {
      this.bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };
      return;
    }

    const nodes = this.canvasData.nodes;
    this.bounds = {
      minX: Math.min(...nodes.map(n => n.x)),
      maxX: Math.max(...nodes.map(n => n.x + n.width)),
      minY: Math.min(...nodes.map(n => n.y)),
      maxY: Math.max(...nodes.map(n => n.y + n.height))
    };
  }

  private calculateScale() {
    const canvasWidth = this.bounds.maxX - this.bounds.minX;
    const canvasHeight = this.bounds.maxY - this.bounds.minY;
    
    const scaleX = (this.OVERVIEW_WIDTH - 2 * this.PADDING) / canvasWidth;
    const scaleY = (this.OVERVIEW_HEIGHT - 2 * this.PADDING) / canvasHeight;
    
    this.baseScale = Math.min(scaleX, scaleY, 1); // Don't scale up
  }

  private getEffectiveScale(): number {
    return this.baseScale * this.currentZoomScale;
  }

  private render() {
    if (!this.svgElement || !this.canvasData) return;

    // Clear previous content
    this.svgElement.innerHTML = '';

    // Create defs for gradients and patterns
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Solid color for current station (removing the gradient)
    const currentStationGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    currentStationGradient.setAttribute('id', 'currentStationGradient');
    currentStationGradient.innerHTML = `
      <stop offset="0%" style="stop-color:#ff3333;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ff3333;stop-opacity:1" />
    `;
    defs.appendChild(currentStationGradient);
    
    this.svgElement.appendChild(defs);

    // Create group for all elements with transform
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const transform = `translate(${this.PADDING + this.panX}, ${this.PADDING + this.panY}) scale(${this.getEffectiveScale()})`;
    group.setAttribute('transform', transform);

    // Render groups first (so they appear as backgrounds)
    this.renderGroups(group);
    
    // Render nodes (station numbers) - edges removed per user request
    this.renderNodes(group);
    
    this.svgElement.appendChild(group);
  }

  private renderGroups(group: SVGGElement) {
    if (!this.canvasData?.nodes) return;

    // Find the current station and its group
    const currentStationNode = this.canvasData.nodes.find(
      node => node.type === 'text' && node.text === this.currentStationId?.toString()
    );
    const currentGroup = currentStationNode ? this.findContainingGroup(currentStationNode) : null;

    // Render all groups
    const groups = this.canvasData.nodes.filter(node => node.type === 'group');
    groups.forEach(groupNode => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const x = groupNode.x - this.bounds.minX;
      const y = groupNode.y - this.bounds.minY;
      
      rect.setAttribute('x', x.toString());
      rect.setAttribute('y', y.toString());
      rect.setAttribute('width', groupNode.width.toString());
      rect.setAttribute('height', groupNode.height.toString());
      rect.setAttribute('rx', '8');
      
      const isCurrentGroup = currentGroup && currentGroup.id === groupNode.id;
      
      // Style the group with much stronger and brighter orange colors
      rect.setAttribute('fill', isCurrentGroup ? 'rgba(255, 140, 0, 0.25)' : 'rgba(100, 100, 100, 0.05)');
      rect.setAttribute('stroke', isCurrentGroup ? '#ff8c00' : 'rgba(100, 100, 100, 0.2)');
      rect.setAttribute('stroke-width', isCurrentGroup ? '4' : '1');
      rect.setAttribute('stroke-dasharray', isCurrentGroup ? '8,4' : '10,10');
      
      group.appendChild(rect);
      
      // Add group label if it exists
      if (groupNode.label) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', (x + 8).toString());
        text.setAttribute('y', (y + 25).toString());
        text.setAttribute('fill', isCurrentGroup ? '#ff8c00' : 'var(--text-muted)');
        text.setAttribute('font-size', '24');
        text.setAttribute('font-weight', isCurrentGroup ? 'bold' : 'normal');
        text.textContent = groupNode.label;
        
        group.appendChild(text);
      }
    });
  }

  private renderNodes(group: SVGGElement) {
    if (!this.canvasData?.nodes) return;

    this.canvasData.nodes.forEach(node => {
      // Skip group nodes as they're rendered separately
      if (node.type === 'group') return;
      
      // Check if this is a station anchor node
      const isStationAnchor = node.type === 'text' && /^\d+$/.test(node.text || '');
      
      // Only render station nodes - skip all other nodes (gray boxes)
      if (!isStationAnchor) return;
      
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const x = node.x - this.bounds.minX;
      const y = node.y - this.bounds.minY;
      
      rect.setAttribute('x', x.toString());
      rect.setAttribute('y', y.toString());
      rect.setAttribute('width', node.width.toString());
      rect.setAttribute('height', node.height.toString());
      rect.setAttribute('rx', '4');
      
      const stationId = parseInt(node.text || '0');
      const isCurrentStation = stationId === this.currentStationId;
      
      // Station anchor node styling - solid red for current station
      rect.setAttribute('fill', isCurrentStation ? '#ff3333' : 'var(--interactive-accent)');
      rect.setAttribute('stroke', isCurrentStation ? '#cc0000' : 'var(--interactive-accent)');
      rect.setAttribute('stroke-width', isCurrentStation ? '2' : '2');
      rect.setAttribute('opacity', '1');
      
      // Add click handler
      rect.style.cursor = 'pointer';
      rect.addEventListener('click', () => {
        if (this.onStationClick) {
          this.onStationClick(stationId);
        }
      });
      
      group.appendChild(rect);
      
      // Add station number text with better visibility - ALWAYS show numbers
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', (x + node.width / 2).toString());
      text.setAttribute('y', (y + node.height / 2).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', 'white');
      text.setAttribute('font-size', '32');
      text.setAttribute('font-weight', 'bold');
      // Add text shadow for better visibility
      text.setAttribute('style', 'text-shadow: 1px 1px 2px rgba(0,0,0,0.8);');
      text.textContent = node.text || '';
      
      text.style.cursor = 'pointer';
      text.addEventListener('click', () => {
        if (this.onStationClick) {
          this.onStationClick(stationId);
        }
      });
      
      group.appendChild(text);
    });
  }

  setCurrentStation(stationId: number) {
    this.currentStationId = stationId;
    
    // Auto-pan to current station (or its group)
    this.panToStation(stationId);
    
    // Re-render to update highlighting
    this.render();
  }

  resetZoom() {
    this.currentZoomScale = 1;
    this.panX = 0;
    this.panY = 0;
    this.updateZoomInfo();
    this.render();
  }

  private updateZoomInfo() {
    // Zoom info element no longer exists - method kept for compatibility
  }

  private panToStation(stationId: number) {
    if (!this.canvasData?.nodes) return;

    const stationNode = this.canvasData.nodes.find(
      node => node.type === 'text' && node.text === stationId.toString()
    );
    
    if (!stationNode) return;

    // Find which group this station belongs to (if any)
    const containingGroup = this.findContainingGroup(stationNode);
    
    if (containingGroup) {
      // Zoom to the group bounds
      this.panToGroup(containingGroup);
    } else {
      // Zoom to the individual station
      this.panToNode(stationNode);
    }
  }

  private findContainingGroup(node: any): any | null {
    if (!this.canvasData?.nodes) return null;
    
    const groups = this.canvasData.nodes.filter(n => n.type === 'group');
    const containingGroups = groups.filter(group => this.isNodeInGroup(node, group));
    
    // Validate that node belongs to at most one group
    if (containingGroups.length > 1) {
      throw new Error(`Station ${node.text} belongs to multiple groups: ${containingGroups.map(g => g.label || g.id).join(', ')}. Each station must belong to at most one group.`);
    }
    
    return containingGroups.length > 0 ? containingGroups[0] : null;
  }

  private isNodeInGroup(node: any, group: any): boolean {
    // Check if node is within group bounds
    return (
      node.x >= group.x &&
      node.y >= group.y &&
      node.x + node.width <= group.x + group.width &&
      node.y + node.height <= group.y + group.height
    );
  }

  private panToGroup(group: any) {
    // Calculate appropriate zoom level for the group
    const groupWidth = group.width;
    const groupHeight = group.height;
    const availableWidth = this.OVERVIEW_WIDTH - 2 * this.PADDING;
    const availableHeight = this.OVERVIEW_HEIGHT - 2 * this.PADDING;
    
    // Calculate zoom to fit group with some padding
    const zoomToFitX = availableWidth / (groupWidth * 1.2); // 20% padding
    const zoomToFitY = availableHeight / (groupHeight * 1.2);
    const targetZoom = Math.min(zoomToFitX, zoomToFitY);
    
    // Set zoom level (but don't zoom out beyond base scale)
    this.currentZoomScale = Math.max(targetZoom / this.baseScale, 1);
    
    // Calculate group center in overview coordinates
    const effectiveScale = this.getEffectiveScale();
    const groupCenterX = (group.x + group.width / 2 - this.bounds.minX) * effectiveScale;
    const groupCenterY = (group.y + group.height / 2 - this.bounds.minY) * effectiveScale;
    
    // Center the group in the overview
    const centerX = this.OVERVIEW_WIDTH / 2;
    const centerY = this.OVERVIEW_HEIGHT / 2;
    
    // Calculate pan offset
    this.panX = centerX - groupCenterX;
    this.panY = centerY - groupCenterY;
    
        // Apply bounds checking
    this.applyPanBounds();
    this.updateZoomInfo();
  }

  private panToNode(node: any) {
    // For individual nodes, use a moderate zoom level
    this.currentZoomScale = Math.min(3, Math.max(1.5, 1 / this.baseScale));
    
    // Calculate position of node in overview coordinates
    const effectiveScale = this.getEffectiveScale();
    const nodeX = (node.x + node.width / 2 - this.bounds.minX) * effectiveScale;
    const nodeY = (node.y + node.height / 2 - this.bounds.minY) * effectiveScale;
    
    // Center the node in the overview
    const centerX = this.OVERVIEW_WIDTH / 2;
    const centerY = this.OVERVIEW_HEIGHT / 2;
    
    // Calculate pan offset
    this.panX = centerX - nodeX;
    this.panY = centerY - nodeY;
    
    // Apply bounds checking
    this.applyPanBounds();
    this.updateZoomInfo();
   }

  private applyPanBounds() {
    const effectiveScale = this.getEffectiveScale();
    const scaledCanvasWidth = (this.bounds.maxX - this.bounds.minX) * effectiveScale;
    const scaledCanvasHeight = (this.bounds.maxY - this.bounds.minY) * effectiveScale;
    const availableWidth = this.OVERVIEW_WIDTH - 2 * this.PADDING;
    const availableHeight = this.OVERVIEW_HEIGHT - 2 * this.PADDING;
    
    // Only apply bounds if the scaled canvas is larger than the available space
    if (scaledCanvasWidth > availableWidth) {
      const maxPanX = scaledCanvasWidth - availableWidth;
      this.panX = Math.max(-maxPanX, Math.min(0, this.panX));
    }
    
    if (scaledCanvasHeight > availableHeight) {
      const maxPanY = scaledCanvasHeight - availableHeight;
      this.panY = Math.max(-maxPanY, Math.min(0, this.panY));
    }
  }

  setOnStationClick(callback: (stationId: number) => void) {
    this.onStationClick = callback;
  }

  private showError(message: string) {
    if (this.svgElement) {
      this.svgElement.innerHTML = '';
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', (this.OVERVIEW_WIDTH / 2).toString());
      text.setAttribute('y', (this.OVERVIEW_HEIGHT / 2).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', 'var(--text-muted)');
      text.setAttribute('font-size', '12');
      text.textContent = message;
      this.svgElement.appendChild(text);
    }
  }

  destroy() {
    if (this.svgElement) {
      this.svgElement.remove();
      this.svgElement = null;
    }
  }
} 