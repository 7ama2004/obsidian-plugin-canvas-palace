import { Vault, MetadataCache } from 'obsidian';
import { MemoryStationM1, MemoryStationM2, ParsedMemoryPalace, CanvasData, CanvasNode, CanvasEdge } from './types';

/**
 * Update Canvas for Milestone 1 (M1)
 * Creates/updates text nodes next to station anchor nodes
 */
export async function updateCanvasForM1(
  canvasPath: string,
  palaceData: ParsedMemoryPalace<MemoryStationM1>,
  vault: Vault,
  metadataCache: MetadataCache
): Promise<void> {
  try {
    // Read the canvas file
    const rawCanvas = await vault.adapter.read(canvasPath);
    const canvasData: CanvasData = JSON.parse(rawCanvas);
    
    // Ensure nodes and edges arrays exist
    if (!canvasData.nodes) canvasData.nodes = [];
    if (!canvasData.edges) canvasData.edges = [];
    
    // Clean up existing plugin-generated nodes for M1
    canvasData.nodes = canvasData.nodes.filter(node => 
      !node.id.startsWith('station-text-')
    );
    
    // Process each station
    palaceData.forEach((station, stationId) => {
      // Find the anchor node (a text node with the station ID as text)
      const anchorNode = canvasData.nodes.find(node => 
        node.type === 'text' && node.text === String(stationId)
      );
      
      if (!anchorNode) {
        console.warn(`No anchor node found for station ${stationId}`);
        return;
      }
      
      // Create a new text node for the station content
      const textNode: CanvasNode = {
        id: `station-text-${stationId}`,
        type: 'text',
        x: anchorNode.x,
        y: anchorNode.y + anchorNode.height + 20, // Position below anchor
        width: 300,
        height: 100,
        text: station.text
      };
      
      canvasData.nodes.push(textNode);
    });
    
    // Write the updated canvas file
    const newJsonString = JSON.stringify(canvasData, null, 2);
    await vault.adapter.write(canvasPath, newJsonString);
    
  } catch (error) {
    console.error('Error updating canvas for M1:', error);
    throw error;
  }
}

/**
 * Update Canvas for Milestone 2 (M2)
 * Creates rich clusters of nodes and edges for each memory station
 */
export async function updateCanvasForM2(
  canvasPath: string,
  palaceData: ParsedMemoryPalace<MemoryStationM2>,
  vault: Vault,
  metadataCache: MetadataCache
): Promise<void> {
  try {
    // Read the canvas file
    const rawCanvas = await vault.adapter.read(canvasPath);
    const canvasData: CanvasData = JSON.parse(rawCanvas);
    
    // Ensure nodes and edges arrays exist
    if (!canvasData.nodes) canvasData.nodes = [];
    if (!canvasData.edges) canvasData.edges = [];
    
    // Clean up existing plugin-generated nodes and edges for M2
    canvasData.nodes = canvasData.nodes.filter(node => 
      !node.id.startsWith('station-') || node.id.match(/^station-\d+$/)
    );
    canvasData.edges = canvasData.edges.filter(edge => 
      !edge.id.startsWith('edge-')
    );
    
    // Process each station
    palaceData.forEach((station, stationId) => {
      // Find the anchor node (a text node with the station ID as text)
      const anchorNode = canvasData.nodes.find(node => 
        node.type === 'text' && node.text === String(stationId)
      );
      
      if (!anchorNode) {
        console.warn(`No anchor node found for station ${stationId}`);
        return;
      }
      
      let nodeCount = 0;
      const baseX = anchorNode.x;
      const baseY = anchorNode.y + anchorNode.height + 20;
      
      // Create text node
      if (station.text) {
        const textNode: CanvasNode = {
          id: `station-${stationId}-text`,
          type: 'text',
          x: baseX,
          y: baseY + (nodeCount * 130),
          width: 300,
          height: 100,
          text: station.text
        };
        
        canvasData.nodes.push(textNode);
        
        // Create edge from anchor to text node
        const textEdge: CanvasEdge = {
          id: `edge-${stationId}-text`,
          fromNode: anchorNode.id,
          toNode: textNode.id
        };
        
        canvasData.edges.push(textEdge);
        nodeCount++;
      }
      
      // Create association node
      if (station.association) {
        const associationNode: CanvasNode = {
          id: `station-${stationId}-association`,
          type: 'text',
          x: baseX,
          y: baseY + (nodeCount * 130),
          width: 300,
          height: 100,
          text: `Association: ${station.association}`
        };
        
        canvasData.nodes.push(associationNode);
        
        // Create edge from anchor to association node
        const associationEdge: CanvasEdge = {
          id: `edge-${stationId}-association`,
          fromNode: anchorNode.id,
          toNode: associationNode.id
        };
        
        canvasData.edges.push(associationEdge);
        nodeCount++;
      }
      
      // Create image node
      if (station.imagePath) {
        const imageNode: CanvasNode = {
          id: `station-${stationId}-image`,
          type: 'file',
          x: baseX + 320, // Position to the right
          y: baseY,
          width: 300,
          height: 200,
          file: station.imagePath
        };
        
        canvasData.nodes.push(imageNode);
        
        // Create edge from anchor to image node
        const imageEdge: CanvasEdge = {
          id: `edge-${stationId}-image`,
          fromNode: anchorNode.id,
          toNode: imageNode.id
        };
        
        canvasData.edges.push(imageEdge);
      }
      
      // Create audio node
      if (station.audioPath) {
        const audioNode: CanvasNode = {
          id: `station-${stationId}-audio`,
          type: 'file',
          x: baseX + 320, // Position to the right
          y: baseY + 220,
          width: 300,
          height: 100,
          file: station.audioPath
        };
        
        canvasData.nodes.push(audioNode);
        
        // Create edge from anchor to audio node
        const audioEdge: CanvasEdge = {
          id: `edge-${stationId}-audio`,
          fromNode: anchorNode.id,
          toNode: audioNode.id
        };
        
        canvasData.edges.push(audioEdge);
      }
    });
    
    // Write the updated canvas file
    const newJsonString = JSON.stringify(canvasData, null, 2);
    await vault.adapter.write(canvasPath, newJsonString);
    
  } catch (error) {
    console.error('Error updating canvas for M2:', error);
    throw error;
  }
} 